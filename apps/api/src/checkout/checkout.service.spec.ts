import { BadRequestException } from "@nestjs/common"

import { CheckoutService } from "./checkout.service"
import { prisma } from "../prisma"
import { PaymentsService } from '../payments/payments.service'

const paymentsService = {
  getIntent: jest.fn(),
  verifySuccessfulIntent: jest.fn().mockResolvedValue(undefined),
} as unknown as PaymentsService

jest.mock("../prisma", () => ({
  prisma: {
    cart: {
      findFirst: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

describe("CheckoutService", () => {
  const mockedPrisma = prisma as unknown as {
    cart: {
      findFirst: jest.Mock
    }
    order: {
      findFirst: jest.Mock
      findUnique: jest.Mock
      updateMany: jest.Mock
    }
    $transaction: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedPrisma.order.findFirst.mockResolvedValue(null)
    mockedPrisma.order.findUnique.mockResolvedValue(null)
    mockedPrisma.order.updateMany.mockResolvedValue({ count: 1 })
    ;(paymentsService.getIntent as jest.Mock).mockResolvedValue({
      id: "pi_mock_123",
      status: "succeeded",
      amountInCents: 21000,
      currency: "PHP",
      cartId: "cart-1",
    })
  })

  function setupActiveCart() {
    mockedPrisma.cart.findFirst.mockResolvedValue({
      id: "cart-1",
      items: [
        {
          id: "item-1",
          productId: "prod-1",
          quantity: 2,
          unitPriceInCents: 10000,
          product: {
            id: "prod-1",
            stock: 10,
            isActive: true,
            priceInCents: 10000,
          },
        },
      ],
    })
  }

  function setupTransactionMocks() {
    const txOrderCreate = jest.fn().mockImplementation(
      async ({ data }: { data: { status: string; paymentIntentId?: string | null } }) => ({
        id: "order-1",
        status: data.status,
        paymentIntentId: data.paymentIntentId ?? null,
        subtotalInCents: 20000,
        shippingFeeInCents: 0,
        taxInCents: 1000,
        totalInCents: 21000,
        customerEmail: "buyer@example.com",
        customerName: "Buyer",
        shippingAddressLine1: "123 Main",
        shippingAddressLine2: null,
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1100",
        phone: null,
        notes: "Delivery option: Anytime | Payment method: Cash on delivery",
        createdAt: new Date(),
        items: [
          {
            id: "order-item-1",
            productId: "prod-1",
            quantity: 2,
            unitPriceInCents: 10000,
            lineTotalInCents: 20000,
            product: {
              id: "prod-1",
              slug: "prod-1",
              name: "Product 1",
              imageUrl: null,
            },
          },
        ],
      })
    )

    const txCartUpdate = jest.fn().mockResolvedValue({ count: 1 })
    const txCartCreate = jest.fn().mockResolvedValue({ id: "cart-2" })
    const txProductUpdate = jest.fn().mockResolvedValue({ count: 1 })
    const txOrderUpdateMany = jest.fn().mockResolvedValue({ count: 1 })
    const txProductIncrement = jest.fn().mockResolvedValue({})

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        order: {
          create: txOrderCreate,
          updateMany: txOrderUpdateMany,
        },
        cart: {
          updateMany: txCartUpdate,
          create: txCartCreate,
        },
        product: { updateMany: txProductUpdate, update: txProductIncrement },
      }

      return fn(tx)
    })

    return {
      txOrderCreate,
      txCartCreate,
      txCartUpdate,
      txProductUpdate,
      txOrderUpdateMany,
      txProductIncrement,
    }
  }

  it("creates a fresh active cart after converting cart to order", async () => {
    const service = new CheckoutService(paymentsService)
    setupActiveCart()
    const { txOrderCreate, txCartCreate, txCartUpdate, txProductUpdate } = setupTransactionMocks()

    await service.createPendingOrder(
      { userId: "user-1", guestId: "guest-1" },
      {
        customerEmail: "buyer@example.com",
        customerName: "Buyer",
        shippingAddressLine1: "123 Main",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1100",
      }
    )

    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: "Delivery option: Anytime | Payment method: Cash on delivery",
        }),
      })
    )

    expect(txProductUpdate).toHaveBeenCalledWith({
      where: { id: 'prod-1', isActive: true, stock: { gte: 2 }, priceInCents: 10000 },
      data: { stock: { decrement: 2 } },
    })
    expect(txCartUpdate).toHaveBeenCalledWith({
      where: { id: 'cart-1', status: 'active' },
      data: { status: 'converted' },
    })
    expect(txCartCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        guestId: null,
        status: "active",
      },
    })
    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", guestId: null }),
      })
    )
  })

  it("scopes signed-in checkout to the account cart", async () => {
    const service = new CheckoutService(paymentsService)
    setupActiveCart()
    setupTransactionMocks()

    await service.createPendingOrder(
      { userId: "user-1", guestId: "guest-1" },
      {
        customerEmail: "buyer@example.com",
        customerName: "Buyer",
        shippingAddressLine1: "123 Main",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1100",
      }
    )

    expect(mockedPrisma.cart.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "active", userId: "user-1" },
      })
    )
  })

  it("scopes anonymous checkout to an unowned guest cart", async () => {
    const service = new CheckoutService(paymentsService)
    setupActiveCart()
    const { txOrderCreate, txCartCreate } = setupTransactionMocks()

    await service.createPendingOrder(
      { userId: null, guestId: "guest-1" },
      {
        customerEmail: "buyer@example.com",
        customerName: "Buyer",
        shippingAddressLine1: "123 Main",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1100",
      }
    )

    expect(mockedPrisma.cart.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "active", guestId: "guest-1", userId: null },
      })
    )
    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: null, guestId: "guest-1" }),
      })
    )
    expect(txCartCreate).toHaveBeenCalledWith({
      data: {
        userId: null,
        guestId: "guest-1",
        status: "active",
      },
    })
  })

  it('rejects concurrent checkout when the cart has already converted', async () => {
    const service = new CheckoutService(paymentsService)
    setupActiveCart()
    const { txCartUpdate, txOrderCreate } = setupTransactionMocks()
    txCartUpdate.mockResolvedValue({ count: 0 })
    await expect(service.createPendingOrder(
      { userId: 'user-1', guestId: 'guest-1' },
      { customerEmail: 'buyer@example.com', customerName: 'Buyer', shippingAddressLine1: '123 Main', city: 'City', province: 'Province', postalCode: '1100' }
    )).rejects.toBeInstanceOf(BadRequestException)
    expect(txOrderCreate).not.toHaveBeenCalled()
  })

  it("requires paymentIntentId for card payments", async () => {
    const service = new CheckoutService(paymentsService)
    setupActiveCart()

    await expect(
      service.createPendingOrder(
        { userId: "user-1", guestId: "guest-1" },
        {
          customerEmail: "buyer@example.com",
          customerName: "Buyer",
          shippingAddressLine1: "123 Main",
          city: "Quezon City",
          province: "Metro Manila",
          postalCode: "1100",
          paymentMethod: "card",
        }
      )
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("creates the order pending before confirming a card payment", async () => {
    const service = new CheckoutService(paymentsService)
    setupActiveCart()
    const { txOrderCreate } = setupTransactionMocks()

    const result = await service.createPendingOrder(
      { userId: "user-1", guestId: "guest-1" },
      {
        customerEmail: "buyer@example.com",
        customerName: "Buyer",
        shippingAddressLine1: "123 Main",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1100",
        paymentMethod: "card",
        paymentIntentId: "pi_mock_123",
      }
    )

    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          paymentIntentId: "pi_mock_123",
          notes: expect.stringContaining("Payment method: Card"),
        }),
      })
    )
    expect(paymentsService.getIntent).toHaveBeenCalledWith("pi_mock_123")
    expect(mockedPrisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order-1", status: "PENDING" },
      data: { status: "CONFIRMED" },
    })
    expect(result.status).toBe("CONFIRMED")
  })

  it("returns the existing order when checkout retries the same payment intent", async () => {
    const service = new CheckoutService(paymentsService)
    mockedPrisma.order.findFirst.mockResolvedValue({
      id: "order-existing",
      status: "CONFIRMED",
      paymentIntentId: "pi_mock_123",
      subtotalInCents: 20000,
      shippingFeeInCents: 0,
      taxInCents: 1000,
      totalInCents: 21000,
      customerEmail: "buyer@example.com",
      customerName: "Buyer",
      shippingAddressLine1: "123 Main",
      shippingAddressLine2: null,
      city: "Quezon City",
      province: "Metro Manila",
      postalCode: "1100",
      phone: null,
      notes: null,
      createdAt: new Date(),
      items: [
        {
          id: "order-item-1",
          productId: "prod-1",
          quantity: 2,
          unitPriceInCents: 10000,
          lineTotalInCents: 20000,
          product: {
            id: "prod-1",
            slug: "prod-1",
            name: "Product 1",
            imageUrl: null,
          },
        },
      ],
    })

    const result = await service.createPendingOrder(
      { userId: "user-1", guestId: "guest-1" },
      {
        customerEmail: "buyer@example.com",
        customerName: "Buyer",
        shippingAddressLine1: "123 Main",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1100",
        paymentMethod: "card",
        paymentIntentId: "pi_mock_123",
      }
    )

    expect(result.id).toBe("order-existing")
    expect(result.itemCount).toBe(2)
    expect(mockedPrisma.cart.findFirst).not.toHaveBeenCalled()
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled()
  })

  it("confirms a pending order when checkout is retried after payment succeeds", async () => {
    const service = new CheckoutService(paymentsService)
    mockedPrisma.order.findFirst.mockResolvedValue({
      id: "order-existing",
      status: "PENDING",
      paymentIntentId: "pi_mock_123",
      subtotalInCents: 20000,
      shippingFeeInCents: 0,
      taxInCents: 1000,
      totalInCents: 21000,
      customerEmail: "buyer@example.com",
      customerName: "Buyer",
      shippingAddressLine1: "123 Main",
      shippingAddressLine2: null,
      city: "Quezon City",
      province: "Metro Manila",
      postalCode: "1100",
      phone: null,
      notes: null,
      createdAt: new Date(),
      items: [
        {
          id: "order-item-1",
          productId: "prod-1",
          quantity: 2,
          unitPriceInCents: 10000,
          lineTotalInCents: 20000,
          product: {
            id: "prod-1",
            slug: "prod-1",
            name: "Product 1",
            imageUrl: null,
          },
        },
      ],
    })

    const result = await service.createPendingOrder(
      { userId: "user-1", guestId: "guest-1" },
      {
        customerEmail: "buyer@example.com",
        customerName: "Buyer",
        shippingAddressLine1: "123 Main",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1100",
        paymentMethod: "card",
        paymentIntentId: "pi_mock_123",
      }
    )

    expect(result.status).toBe("CONFIRMED")
    expect(mockedPrisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order-existing", status: "PENDING" },
      data: { status: "CONFIRMED" },
    })
    expect(mockedPrisma.cart.findFirst).not.toHaveBeenCalled()
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled()
  })

  it("leaves the order pending when the payment provider lookup fails transiently", async () => {
    const service = new CheckoutService(paymentsService)
    setupActiveCart()
    setupTransactionMocks()
    ;(paymentsService.getIntent as jest.Mock).mockRejectedValue(new Error("provider unavailable"))
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)

    try {
      const result = await service.createPendingOrder(
        { userId: "user-1", guestId: "guest-1" },
        {
          customerEmail: "buyer@example.com",
          customerName: "Buyer",
          shippingAddressLine1: "123 Main",
          city: "Quezon City",
          province: "Metro Manila",
          postalCode: "1100",
          paymentMethod: "card",
          paymentIntentId: "pi_mock_123",
        }
      )

      expect(result.status).toBe("PENDING")
      expect(mockedPrisma.order.updateMany).not.toHaveBeenCalled()
    } finally {
      consoleError.mockRestore()
    }
  })

  it("cancels and restocks the order when the payment intent is invalid", async () => {
    const service = new CheckoutService(paymentsService)
    setupActiveCart()
    const { txOrderUpdateMany, txProductIncrement } = setupTransactionMocks()
    ;(paymentsService.getIntent as jest.Mock).mockRejectedValue(
      new BadRequestException("Payment intent not found")
    )

    await expect(
      service.createPendingOrder(
        { userId: "user-1", guestId: "guest-1" },
        {
          customerEmail: "buyer@example.com",
          customerName: "Buyer",
          shippingAddressLine1: "123 Main",
          city: "Quezon City",
          province: "Metro Manila",
          postalCode: "1100",
          paymentMethod: "card",
          paymentIntentId: "pi_mock_missing",
        }
      )
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(txOrderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-1", status: "PENDING" },
      data: { status: "CANCELLED" },
    })
    expect(txProductIncrement).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { stock: { increment: 2 } },
    })
  })
})
