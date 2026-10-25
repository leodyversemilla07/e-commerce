import { BadRequestException } from "@nestjs/common"

import { CheckoutService } from "./checkout.service"
import { prisma } from "../prisma"
import { PaymentsService } from '../payments/payments.service'

const paymentsService = { verifySuccessfulIntent: jest.fn().mockResolvedValue(undefined) } as unknown as PaymentsService

jest.mock("../prisma", () => ({
  prisma: {
    cart: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

describe("CheckoutService", () => {
  const mockedPrisma = prisma as unknown as {
    cart: {
      findFirst: jest.Mock
    }
    $transaction: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()
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
    const txOrderCreate = jest.fn().mockResolvedValue({
      id: "order-1",
      status: "PENDING",
      paymentIntentId: null,
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

    const txCartUpdate = jest.fn().mockResolvedValue({ count: 1 })
    const txCartCreate = jest.fn().mockResolvedValue({ id: "cart-2" })
    const txProductUpdate = jest.fn().mockResolvedValue({ count: 1 })

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        order: {
          create: txOrderCreate,
        },
        cart: {
          updateMany: txCartUpdate,
          create: txCartCreate,
        },
        product: { updateMany: txProductUpdate },
      }

      return fn(tx)
    })

    return { txOrderCreate, txCartCreate, txCartUpdate, txProductUpdate }
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

  it("stores payment intent id in dedicated order field for card payments", async () => {
    const service = new CheckoutService(paymentsService)
    setupActiveCart()
    const { txOrderCreate } = setupTransactionMocks()

    await service.createPendingOrder(
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

    expect(paymentsService.verifySuccessfulIntent).toHaveBeenCalledWith('pi_mock_123', 21000, 'cart-1')
    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CONFIRMED',
          paymentIntentId: "pi_mock_123",
          notes: expect.stringContaining("Payment method: Card"),
        }),
      })
    )

    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: expect.not.stringContaining("Payment intent:"),
        }),
      })
    )
  })
})
