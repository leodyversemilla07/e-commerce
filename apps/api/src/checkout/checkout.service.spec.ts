import { BadRequestException } from "@nestjs/common"

import { CheckoutService } from "./checkout.service"
import { prisma } from "../prisma"

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

    const txCartUpdate = jest.fn().mockResolvedValue({})
    const txCartCreate = jest.fn().mockResolvedValue({ id: "cart-2" })

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        order: {
          create: txOrderCreate,
        },
        cart: {
          update: txCartUpdate,
          create: txCartCreate,
        },
      }

      return fn(tx)
    })

    return { txOrderCreate, txCartCreate }
  }

  it("creates a fresh active cart after converting cart to order", async () => {
    const service = new CheckoutService()
    setupActiveCart()
    const { txOrderCreate, txCartCreate } = setupTransactionMocks()

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

    expect(txCartCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        guestId: "guest-1",
        status: "active",
      },
    })
  })

  it("requires paymentIntentId for card payments", async () => {
    const service = new CheckoutService()
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
    const service = new CheckoutService()
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

    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
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
