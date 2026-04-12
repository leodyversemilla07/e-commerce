import { randomUUID } from "node:crypto"
import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common"

import { prisma } from "../prisma"
import type {
  ConfirmPaymentIntentPayload,
  CreatePaymentIntentPayload,
  PaymentIntentResponse,
  PaymentWebhookResult,
} from "./payments.types"

type PaymentProviderName = "mock" | "stripe"

type StripePaymentIntent = {
  id: string
  status: PaymentIntentResponse["status"]
  amount: number
  currency: string
  client_secret: string | null
  created: number
}

type StripeWebhookEvent = {
  id: string
  type: string
  data?: {
    object?: {
      id?: string
    }
  }
}

type WebhookClaimResult = {
  alreadyProcessed: boolean
  claimed: boolean
}

type StripeSDK = {
  paymentIntents: {
    create: (payload: {
      amount: number
      currency: string
      automatic_payment_methods: { enabled: boolean }
      metadata: Record<string, string>
    }) => Promise<StripePaymentIntent>
    confirm: (
      paymentIntentId: string,
      payload?: {
        payment_method?: string
      }
    ) => Promise<StripePaymentIntent>
  }
  webhooks: {
    constructEvent: (payload: Buffer, signature: string, secret: string) => StripeWebhookEvent
  }
}

type PaymentProvider = {
  createIntent(payload: {
    amountInCents: number
    currency: "PHP"
    method: "card"
  }): Promise<PaymentIntentResponse> | PaymentIntentResponse
  confirmIntent(
    paymentIntentId: string,
    payload: ConfirmPaymentIntentPayload
  ): Promise<PaymentIntentResponse> | PaymentIntentResponse
  handleWebhook(
    signature: string,
    rawBody: Buffer
  ): Promise<PaymentWebhookResult> | PaymentWebhookResult
}

class MockPaymentProvider implements PaymentProvider {
  private readonly intents = new Map<string, PaymentIntentResponse>()

  createIntent(payload: {
    amountInCents: number
    currency: "PHP"
    method: "card"
  }): PaymentIntentResponse {
    const intentId = `pi_mock_${randomUUID().replace(/-/g, "")}`

    const intent: PaymentIntentResponse = {
      id: intentId,
      provider: "mock",
      status: "requires_confirmation",
      amountInCents: payload.amountInCents,
      currency: payload.currency,
      method: payload.method,
      clientSecret: `mock_secret_${intentId}`,
      createdAt: new Date().toISOString(),
    }

    this.intents.set(intentId, intent)

    return intent
  }

  confirmIntent(
    paymentIntentId: string,
    _payload: ConfirmPaymentIntentPayload
  ): PaymentIntentResponse {
    const existing = this.intents.get(paymentIntentId)
    if (!existing) {
      throw new BadRequestException("Payment intent not found")
    }

    const confirmed = {
      ...existing,
      status: "succeeded" as const,
    }

    this.intents.set(paymentIntentId, confirmed)

    return confirmed
  }

  handleWebhook(_signature: string, _rawBody: Buffer): PaymentWebhookResult {
    return {
      received: true,
      eventType: "mock.webhook",
      processed: false,
    }
  }
}

class StripePaymentProvider implements PaymentProvider {
  private readonly secretKey: string
  private readonly webhookSecret: string

  private async claimWebhookEvent(event: StripeWebhookEvent): Promise<WebhookClaimResult> {
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId: event.id },
      select: { id: true, processedAt: true, processing: true },
    })

    if (existing?.processedAt) {
      return { alreadyProcessed: true, claimed: false }
    }

    if (!existing) {
      try {
        await prisma.paymentWebhookEvent.create({
          data: {
            provider: "stripe",
            eventId: event.id,
            eventType: event.type,
            processing: true,
            processingAt: new Date(),
          },
        })

        return { alreadyProcessed: false, claimed: true }
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          const latest = await prisma.paymentWebhookEvent.findUnique({
            where: { eventId: event.id },
            select: { processedAt: true, processing: true },
          })

          if (latest?.processedAt) {
            return { alreadyProcessed: true, claimed: false }
          }

          return { alreadyProcessed: false, claimed: false }
        }

        throw error
      }
    }

    const update = await prisma.paymentWebhookEvent.updateMany({
      where: {
        eventId: event.id,
        processedAt: null,
        processing: false,
      },
      data: {
        eventType: event.type,
        processing: true,
        processingAt: new Date(),
      },
    })

    return {
      alreadyProcessed: false,
      claimed: update.count > 0,
    }
  }

  private async markWebhookProcessed(eventId: string): Promise<void> {
    await prisma.paymentWebhookEvent.updateMany({
      where: {
        eventId,
        processedAt: null,
      },
      data: {
        processedAt: new Date(),
        processing: false,
      },
    })
  }

  private async releaseWebhookClaim(eventId: string): Promise<void> {
    await prisma.paymentWebhookEvent.updateMany({
      where: {
        eventId,
        processedAt: null,
        processing: true,
      },
      data: {
        processing: false,
      },
    })
  }

  constructor(secretKey: string, webhookSecret: string) {
    this.secretKey = secretKey
    this.webhookSecret = webhookSecret
  }

  private async loadStripe(): Promise<new (secretKey: string) => StripeSDK> {
    type MinimalStripeModule = {
      default: new (secretKey: string) => StripeSDK
    }

    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string
    ) => Promise<MinimalStripeModule>
    const StripeModule = await dynamicImport("stripe").catch(() => null)

    if (!StripeModule?.default) {
      throw new InternalServerErrorException(
        "Stripe SDK not installed. Install with your workspace package manager before enabling PAYMENT_PROVIDER=stripe"
      )
    }

    return StripeModule.default
  }

  private mapIntent(payload: {
    paymentIntent: StripePaymentIntent
    defaultMethod: "card"
    defaultCurrency: "PHP"
  }): PaymentIntentResponse {
    const { paymentIntent, defaultMethod, defaultCurrency } = payload

    if (!paymentIntent.client_secret) {
      throw new InternalServerErrorException("Stripe payment intent did not return a client_secret")
    }

    return {
      id: paymentIntent.id,
      provider: "stripe",
      status: paymentIntent.status,
      amountInCents: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase() === "PHP" ? "PHP" : defaultCurrency,
      method: defaultMethod,
      clientSecret: paymentIntent.client_secret,
      createdAt: new Date(paymentIntent.created * 1000).toISOString(),
    }
  }

  async createIntent(payload: {
    amountInCents: number
    currency: "PHP"
    method: "card"
  }): Promise<PaymentIntentResponse> {
    const Stripe = await this.loadStripe()
    const stripe = new Stripe(this.secretKey)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: payload.amountInCents,
      currency: payload.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        source: "e-commerce-checkout",
      },
    })

    return this.mapIntent({
      paymentIntent,
      defaultMethod: payload.method,
      defaultCurrency: payload.currency,
    })
  }

  async confirmIntent(
    paymentIntentId: string,
    payload: ConfirmPaymentIntentPayload
  ): Promise<PaymentIntentResponse> {
    const Stripe = await this.loadStripe()
    const stripe = new Stripe(this.secretKey)

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: payload.paymentMethodId,
    })

    return this.mapIntent({
      paymentIntent,
      defaultMethod: "card",
      defaultCurrency: "PHP",
    })
  }

  async handleWebhook(signature: string, rawBody: Buffer): Promise<PaymentWebhookResult> {
    const Stripe = await this.loadStripe()
    const stripe = new Stripe(this.secretKey)

    const event = stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret)
    const claim = await this.claimWebhookEvent(event)

    if (claim.alreadyProcessed || !claim.claimed) {
      return {
        received: true,
        eventType: event.type,
        processed: false,
      }
    }

    try {
      if (event.type === "payment_intent.succeeded") {
        const paymentIntentId = event.data?.object?.id

        if (paymentIntentId) {
          await prisma.order.updateMany({
            where: {
              status: "PENDING",
              paymentIntentId,
            },
            data: {
              status: "CONFIRMED",
            },
          })

          await this.markWebhookProcessed(event.id)

          return {
            received: true,
            eventType: event.type,
            processed: true,
          }
        }
      }

      await this.markWebhookProcessed(event.id)

      return {
        received: true,
        eventType: event.type,
        processed: false,
      }
    } catch (error) {
      await this.releaseWebhookClaim(event.id)
      throw error
    }
  }
}

@Injectable()
export class PaymentsService {
  private mockProvider = new MockPaymentProvider()

  private resolveProviderName(): PaymentProviderName {
    const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase()

    if (!configured || configured === "mock") return "mock"
    if (configured === "stripe") return "stripe"

    throw new InternalServerErrorException(
      `Unsupported PAYMENT_PROVIDER: ${configured}. Supported values: mock, stripe`
    )
  }

  private resolveProvider(): PaymentProvider {
    const providerName = this.resolveProviderName()

    if (providerName === "mock") {
      return this.mockProvider
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim()
    if (!stripeSecretKey) {
      throw new InternalServerErrorException(
        "STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe"
      )
    }

    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    if (!stripeWebhookSecret) {
      throw new InternalServerErrorException(
        "STRIPE_WEBHOOK_SECRET is required when PAYMENT_PROVIDER=stripe"
      )
    }

    return new StripePaymentProvider(stripeSecretKey, stripeWebhookSecret)
  }

  async createIntent(payload: CreatePaymentIntentPayload): Promise<PaymentIntentResponse> {
    const amountInCents = Number(payload.amountInCents ?? 0)

    if (!Number.isFinite(amountInCents) || amountInCents < 1) {
      throw new BadRequestException("amountInCents must be at least 1")
    }

    const currency = payload.currency ?? "PHP"
    const method = payload.method ?? "card"

    if (currency !== "PHP") {
      throw new BadRequestException("Only PHP is currently supported")
    }

    if (method !== "card") {
      throw new BadRequestException("Only card method is currently supported")
    }

    const provider = this.resolveProvider()
    return provider.createIntent({
      amountInCents,
      currency,
      method,
    })
  }

  async confirmIntent(
    paymentIntentId: string,
    payload: ConfirmPaymentIntentPayload
  ): Promise<PaymentIntentResponse> {
    const normalizedPaymentIntentId = paymentIntentId.trim()

    if (!normalizedPaymentIntentId) {
      throw new BadRequestException("paymentIntentId is required")
    }

    const provider = this.resolveProvider()
    return provider.confirmIntent(normalizedPaymentIntentId, payload)
  }

  async handleWebhook(signature: string, rawBody: Buffer): Promise<PaymentWebhookResult> {
    if (!signature.trim()) {
      throw new BadRequestException("Missing stripe-signature header")
    }

    const provider = this.resolveProvider()
    return provider.handleWebhook(signature, rawBody)
  }
}
