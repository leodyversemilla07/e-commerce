import { BadRequestException, InternalServerErrorException, ServiceUnavailableException } from "@nestjs/common"

import { prisma } from "../prisma"
import { PaymentsService, StripePaymentProvider } from "./payments.service"

jest.mock("../prisma", () => ({
  prisma: {
    cart: { findUnique: jest.fn() },
    order: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    product: { update: jest.fn() },
    $transaction: jest.fn(),
    paymentWebhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

describe("PaymentsService", () => {
  const originalEnv = { ...process.env }
  const mockedPrisma = prisma as unknown as {
    cart: { findUnique: jest.Mock }
    order: {
      updateMany: jest.Mock
      findUnique: jest.Mock
    }
    product: { update: jest.Mock }
    $transaction: jest.Mock
    paymentWebhookEvent: {
      findUnique: jest.Mock
      create: jest.Mock
      updateMany: jest.Mock
    }
  }

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.PAYMENT_PROVIDER = undefined
    process.env.STRIPE_SECRET_KEY = undefined
    process.env.STRIPE_WEBHOOK_SECRET = undefined
    jest.clearAllMocks()
    mockedPrisma.order.updateMany.mockResolvedValue({ count: 1 })
    mockedPrisma.order.findUnique.mockResolvedValue(null)
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null)
    mockedPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: "evt_row_1" })
    mockedPrisma.paymentWebhookEvent.updateMany.mockResolvedValue({ count: 1 })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('reclaims a stale Stripe webhook lease and scopes completion to that lease', async () => {
    const provider = new StripePaymentProvider('sk_test', 'whsec_test') as unknown as {
      claimWebhookEvent: (event: { id: string; type: string }) => Promise<{ claimedAt: Date | null }>
      markWebhookProcessed: (id: string, claimedAt: Date) => Promise<void>
      releaseWebhookClaim: (id: string, claimedAt: Date) => Promise<void>
    }
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue({ processedAt: null, processing: true })
    const claim = await provider.claimWebhookEvent({ id: 'evt_1', type: 'payment_intent.succeeded' })
    expect(claim.claimedAt).toBeInstanceOf(Date)
    if (!claim.claimedAt) throw new Error('Webhook claim was not acquired')
    expect(mockedPrisma.paymentWebhookEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: 'evt_1',
          OR: expect.arrayContaining([{ processing: true, processingAt: expect.objectContaining({ lt: expect.any(Date) }) }]),
        }),
      }),
    )
    await provider.markWebhookProcessed('evt_1', claim.claimedAt)
    await provider.releaseWebhookClaim('evt_1', claim.claimedAt)
    for (const call of mockedPrisma.paymentWebhookEvent.updateMany.mock.calls.slice(1)) {
      expect(call[0].where.processingAt).toEqual(claim.claimedAt)
    }
  })

  it('does not claim a webhook already processed or leased by another worker', async () => {
    const provider = new StripePaymentProvider('sk_test', 'whsec_test') as unknown as {
      claimWebhookEvent: (event: { id: string; type: string }) => Promise<{ claimedAt: Date | null; alreadyProcessed: boolean }>
    }
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue({ processedAt: new Date() })
    const processed = await provider.claimWebhookEvent({ id: 'evt_1', type: 'payment_intent.succeeded' })
    expect(processed).toEqual({ alreadyProcessed: true, claimedAt: null })
    expect(mockedPrisma.paymentWebhookEvent.updateMany).not.toHaveBeenCalled()
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue({ processedAt: null, processing: true })
    mockedPrisma.paymentWebhookEvent.updateMany.mockResolvedValue({ count: 0 })
    const inFlight = await provider.claimWebhookEvent({ id: 'evt_2', type: 'payment_intent.succeeded' })
    expect(inFlight.claimedAt).toBeNull()
  })

  it("creates mock card payment intent by default", async () => {
    const service = new PaymentsService()

    const result = await service.createIntent({
      amountInCents: 12345,
      currency: "PHP",
      method: "card",
    })

    expect(result.id).toContain("pi_mock_")
    expect(result.provider).toBe("mock")
    expect(result.status).toBe("requires_confirmation")
    expect(result.amountInCents).toBe(12345)
    expect(result.currency).toBe("PHP")
    expect(result.method).toBe("card")
    expect(result.clientSecret).toContain("mock_secret_")
  })

  it("confirms mock payment intent", async () => {
    const service = new PaymentsService()

    const created = await service.createIntent({ amountInCents: 2200 })
    const confirmed = await service.confirmIntent(created.id, {})

    expect(confirmed.id).toBe(created.id)
    expect(confirmed.provider).toBe("mock")
    expect(confirmed.status).toBe("succeeded")
  })

  it('requires a succeeded payment for the exact order total', async () => {
    const service = new PaymentsService()
    const intent = await service.createIntent({ amountInCents: 2200 })
    await expect(service.verifySuccessfulIntent(intent.id, 2200)).rejects.toBeInstanceOf(BadRequestException)
    await service.confirmIntent(intent.id, {})
    await expect(service.verifySuccessfulIntent(intent.id, 100)).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.verifySuccessfulIntent(intent.id, 2200)).resolves.toBeUndefined()
  })

  it('binds payment intents to the priced cart and rejects a different cart', async () => {
    const cartService = { getCart: jest.fn().mockResolvedValue({ id: 'cart-1' }) }
    mockedPrisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1', status: 'active', items: [
        { quantity: 2, product: { isActive: true, stock: 5, priceInCents: 1000 } },
      ],
    })
    const service = new PaymentsService(cartService as never)
    await expect(service.createCartIntent({ userId: null, guestId: 'guest-1' }, {
      amountInCents: 100,
    })).rejects.toBeInstanceOf(BadRequestException)
    const intent = await service.createCartIntent({ userId: null, guestId: 'guest-1' }, {
      amountInCents: 2100,
    })
    expect(intent.cartId).toBe('cart-1')
    cartService.getCart.mockResolvedValue({ id: 'cart-2' })
    mockedPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-2', status: 'active', items: [
      { quantity: 2, product: { isActive: true, stock: 5, priceInCents: 1000 } },
    ] })
    await expect(service.confirmCartIntent({ userId: null, guestId: 'guest-2' }, intent.id, {}))
      .rejects.toBeInstanceOf(BadRequestException)
    await expect(service.verifySuccessfulIntent(intent.id, 2100, 'cart-2'))
      .rejects.toBeInstanceOf(BadRequestException)
  })

  it("handles webhook as no-op for mock provider", async () => {
    const service = new PaymentsService()

    const result = await service.handleWebhook("sig_mock", Buffer.from("{}"))

    expect(result).toEqual({
      received: true,
      eventType: "mock.webhook",
      processed: false,
    })
  })

  it('refuses to create live Stripe charges before the card flow is ready', async () => {
    process.env.PAYMENT_PROVIDER = 'stripe'
    const service = new PaymentsService()
    expect(service.getCapabilities()).toEqual({ cardAvailable: false })
    await expect(service.createCartIntent({ userId: null, guestId: 'guest-1' }, { amountInCents: 100 }))
      .rejects.toBeInstanceOf(ServiceUnavailableException)
    await expect(service.confirmCartIntent({ userId: null, guestId: 'guest-1' }, 'pi_123', {}))
      .rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it("fails with helpful error if stripe provider selected but stripe SDK missing", async () => {
    process.env.PAYMENT_PROVIDER = "stripe"
    process.env.STRIPE_SECRET_KEY = "sk_test_123"
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123"

    const service = new PaymentsService()

    await expect(
      service.createIntent({
        amountInCents: 5000,
        currency: "PHP",
        method: "card",
      })
    ).rejects.toBeInstanceOf(InternalServerErrorException)
  })

  it("fails confirm when stripe provider selected but stripe SDK missing", async () => {
    process.env.PAYMENT_PROVIDER = "stripe"
    process.env.STRIPE_SECRET_KEY = "sk_test_123"
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123"

    const service = new PaymentsService()

    await expect(service.confirmIntent("pi_123", {})).rejects.toBeInstanceOf(
      InternalServerErrorException
    )
  })

  it("fails when stripe provider is selected without STRIPE_SECRET_KEY", async () => {
    process.env.PAYMENT_PROVIDER = "stripe"

    const service = new PaymentsService()

    await expect(
      service.createIntent({
        amountInCents: 1000,
      })
    ).rejects.toBeInstanceOf(InternalServerErrorException)
  })

  it("fails on unsupported payment provider", async () => {
    process.env.PAYMENT_PROVIDER = "paypal"

    const service = new PaymentsService()

    await expect(
      service.createIntent({
        amountInCents: 1000,
      })
    ).rejects.toBeInstanceOf(InternalServerErrorException)
  })

  it("rejects invalid amount", async () => {
    const service = new PaymentsService()

    await expect(
      service.createIntent({
        amountInCents: 0,
      })
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("rejects confirm for unknown mock payment intent id", async () => {
    const service = new PaymentsService()

    await expect(service.confirmIntent("pi_mock_missing", {})).rejects.toBeInstanceOf(
      BadRequestException
    )
  })

  it("rejects webhook when stripe-signature header is missing", async () => {
    const service = new PaymentsService()

    await expect(service.handleWebhook("", Buffer.from("{}"))).rejects.toBeInstanceOf(
      BadRequestException
    )
  })

  it("fails webhook when stripe mode missing STRIPE_WEBHOOK_SECRET", async () => {
    process.env.PAYMENT_PROVIDER = "stripe"
    process.env.STRIPE_SECRET_KEY = "sk_test_123"

    const service = new PaymentsService()

    await expect(service.handleWebhook("sig_test", Buffer.from("{}"))).rejects.toBeInstanceOf(
      InternalServerErrorException
    )
  })

  it("tracks webhook event processing state when handling mock webhook", async () => {
    const service = new PaymentsService()

    const result = await service.handleWebhook("sig_mock", Buffer.from("{}"))

    expect(result).toEqual({
      received: true,
      eventType: "mock.webhook",
      processed: false,
    })

    expect(mockedPrisma.paymentWebhookEvent.findUnique).not.toHaveBeenCalled()
    expect(mockedPrisma.paymentWebhookEvent.create).not.toHaveBeenCalled()
    expect(mockedPrisma.paymentWebhookEvent.updateMany).not.toHaveBeenCalled()
  })

  function stripeProvider() {
    return new StripePaymentProvider("sk_test", "whsec_test") as unknown as {
      processWebhookEvent: (event: {
        id: string
        type: string
        data?: { object?: { id?: string; metadata?: Record<string, string> } }
      }) => Promise<boolean>
    }
  }

  it("confirms a pending order for a succeeded payment", async () => {
    const processed = await stripeProvider().processWebhookEvent({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1", metadata: { source: "e-commerce-checkout" } } },
    })

    expect(processed).toBe(true)
    expect(mockedPrisma.order.updateMany).toHaveBeenCalledWith({
      where: { paymentIntentId: "pi_1", status: "PENDING" },
      data: { status: "CONFIRMED" },
    })
  })

  it("acknowledges a duplicate success only when the order is already confirmed", async () => {
    mockedPrisma.order.updateMany.mockResolvedValue({ count: 0 })
    mockedPrisma.order.findUnique.mockResolvedValue({ status: "CONFIRMED" })

    const processed = await stripeProvider().processWebhookEvent({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1", metadata: { source: "e-commerce-checkout" } } },
    })

    expect(processed).toBe(true)
  })

  it("asks the provider to retry a succeeded event whose order is not committed yet", async () => {
    mockedPrisma.order.updateMany.mockResolvedValue({ count: 0 })
    mockedPrisma.order.findUnique.mockResolvedValue(null)

    await expect(
      stripeProvider().processWebhookEvent({
        id: "evt_1",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_1", metadata: { source: "e-commerce-checkout" } } },
      })
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it("acknowledges an unrelated success without requiring a local order", async () => {
    mockedPrisma.order.updateMany.mockResolvedValue({ count: 0 })
    mockedPrisma.order.findUnique.mockResolvedValue(null)

    const processed = await stripeProvider().processWebhookEvent({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1" } },
    })

    expect(processed).toBe(false)
  })

  it("cancels a pending order and restores stock when its payment intent is canceled", async () => {
    const txOrderUpdateMany = jest.fn().mockResolvedValue({ count: 1 })
    const txProductUpdate = jest.fn().mockResolvedValue({})
    mockedPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      status: "PENDING",
      items: [{ productId: "prod-1", quantity: 2 }],
    })
    mockedPrisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          order: { updateMany: txOrderUpdateMany },
          product: { update: txProductUpdate },
        })
    )

    const processed = await stripeProvider().processWebhookEvent({
      id: "evt_2",
      type: "payment_intent.canceled",
      data: { object: { id: "pi_1" } },
    })

    expect(processed).toBe(true)
    expect(txOrderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-1", status: "PENDING" },
      data: { status: "CANCELLED" },
    })
    expect(txProductUpdate).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { stock: { increment: 2 } },
    })
  })

  it("does not cancel or restock a confirmed order when its intent is canceled", async () => {
    mockedPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      status: "CONFIRMED",
      items: [],
    })

    const processed = await stripeProvider().processWebhookEvent({
      id: "evt_2",
      type: "payment_intent.canceled",
      data: { object: { id: "pi_1" } },
    })

    expect(processed).toBe(false)
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled()
  })
})
