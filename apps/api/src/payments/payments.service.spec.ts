import { BadRequestException, InternalServerErrorException } from "@nestjs/common"

import { prisma } from "../prisma"
import { PaymentsService } from "./payments.service"

jest.mock("../prisma", () => ({
  prisma: {
    order: {
      updateMany: jest.fn(),
    },
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
    order: {
      updateMany: jest.Mock
    }
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
    mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null)
    mockedPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: "evt_row_1" })
    mockedPrisma.paymentWebhookEvent.updateMany.mockResolvedValue({ count: 1 })
  })

  afterAll(() => {
    process.env = originalEnv
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

  it("handles webhook as no-op for mock provider", async () => {
    const service = new PaymentsService()

    const result = await service.handleWebhook("sig_mock", Buffer.from("{}"))

    expect(result).toEqual({
      received: true,
      eventType: "mock.webhook",
      processed: false,
    })
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
})
