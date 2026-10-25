import { randomUUID } from "node:crypto"
import { BadRequestException, Injectable, InternalServerErrorException, ServiceUnavailableException } from "@nestjs/common"
import { calculateOrderTotals } from '@workspace/pricing'

import { prisma } from "../prisma"
import { CartService } from '../cart/cart.service'
import type { CartRequestIdentity } from '../cart/cart.types'
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
  metadata?: Record<string, string>
}

type StripeWebhookEvent = {
  id: string
  type: string
  data?: {
    object?: {
      id?: string
      metadata?: Record<string, string>
    }
  }
}

type WebhookClaimResult = {
  alreadyProcessed: boolean
  claimedAt: Date | null
}

type StripeSDK = {
  paymentIntents: {
    create: (payload: {
      amount: number
      currency: string
      automatic_payment_methods: { enabled: boolean }
      metadata: Record<string, string>
    }) => Promise<StripePaymentIntent>
    retrieve: (paymentIntentId: string) => Promise<StripePaymentIntent>
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
    cartId?: string
  }): Promise<PaymentIntentResponse> | PaymentIntentResponse
  confirmIntent(
    paymentIntentId: string,
    payload: ConfirmPaymentIntentPayload
  ): Promise<PaymentIntentResponse> | PaymentIntentResponse
  handleWebhook(
    signature: string,
    rawBody: Buffer
  ): Promise<PaymentWebhookResult> | PaymentWebhookResult
  getIntent(paymentIntentId: string): Promise<PaymentIntentResponse> | PaymentIntentResponse
}

class MockPaymentProvider implements PaymentProvider {
  private readonly intents = new Map<string, PaymentIntentResponse>()

  createIntent(payload: {
    amountInCents: number
    currency: "PHP"
    method: "card"
    cartId?: string
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
      cartId: payload.cartId,
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

  getIntent(paymentIntentId: string): PaymentIntentResponse {
    const intent = this.intents.get(paymentIntentId)
    if (!intent) throw new BadRequestException('Payment intent not found')
    return intent
  }

  handleWebhook(_signature: string, _rawBody: Buffer): PaymentWebhookResult {
    return {
      received: true,
      eventType: "mock.webhook",
      processed: false,
    }
  }
}

export class StripePaymentProvider implements PaymentProvider {
  private readonly secretKey: string
  private readonly webhookSecret: string

  private async claimWebhookEvent(event: StripeWebhookEvent): Promise<WebhookClaimResult> {
    const claimedAt = new Date()
    const staleBefore = new Date(claimedAt.getTime() - 5 * 60 * 1000)
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId: event.id },
      select: { processedAt: true },
    })
    if (existing?.processedAt) return { alreadyProcessed: true, claimedAt: null }

    if (!existing) {
      try {
        await prisma.paymentWebhookEvent.create({
          data: {
            provider: 'stripe', eventId: event.id, eventType: event.type,
            processing: true, processingAt: claimedAt,
          },
        })
        return { alreadyProcessed: false, claimedAt }
      } catch (error) {
        // Concurrent delivery can insert the same event first. Retry the conditional claim below.
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')) {
          throw error
        }
      }
    }

    const update = await prisma.paymentWebhookEvent.updateMany({
      where: {
        eventId: event.id,
        processedAt: null,
        OR: [
          { processing: false },
          { processing: true, processingAt: { lt: staleBefore } },
          { processing: true, processingAt: null },
        ],
      },
      data: { eventType: event.type, processing: true, processingAt: claimedAt },
    })
    return { alreadyProcessed: false, claimedAt: update.count === 1 ? claimedAt : null }
  }

  private async markWebhookProcessed(eventId: string, claimedAt: Date): Promise<void> {
    await prisma.paymentWebhookEvent.updateMany({
      where: {
        eventId,
        processedAt: null,
        processing: true,
        processingAt: claimedAt,
      },
      data: {
        processedAt: new Date(),
        processing: false,
      },
    })
  }

  private async releaseWebhookClaim(eventId: string, claimedAt: Date): Promise<void> {
    await prisma.paymentWebhookEvent.updateMany({
      where: {
        eventId,
        processedAt: null,
        processing: true,
        processingAt: claimedAt,
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
  }): PaymentIntentResponse {
    const { paymentIntent, defaultMethod } = payload

    if (!paymentIntent.client_secret) {
      throw new InternalServerErrorException("Stripe payment intent did not return a client_secret")
    }
    if (paymentIntent.currency.toUpperCase() !== 'PHP') {
      throw new BadRequestException('Only PHP payment intents are supported')
    }

    return {
      id: paymentIntent.id,
      provider: "stripe",
      status: paymentIntent.status,
      amountInCents: paymentIntent.amount,
      currency: 'PHP',
      method: defaultMethod,
      clientSecret: paymentIntent.client_secret,
      createdAt: new Date(paymentIntent.created * 1000).toISOString(),
      cartId: paymentIntent.metadata?.cartId,
    }
  }

  async createIntent(payload: {
    amountInCents: number
    currency: "PHP"
    method: "card"
    cartId?: string
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
        ...(payload.cartId ? { cartId: payload.cartId } : {}),
      },
    })

    return this.mapIntent({
      paymentIntent,
      defaultMethod: payload.method,
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
    })
  }

  async getIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const Stripe = await this.loadStripe()
    const stripe = new Stripe(this.secretKey)
    return this.mapIntent({
      paymentIntent: await stripe.paymentIntents.retrieve(paymentIntentId),
      defaultMethod: 'card',
    })
  }

  private async processWebhookEvent(event: StripeWebhookEvent): Promise<boolean> {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntentId = event.data?.object?.id
      if (!paymentIntentId) return false

      const updated = await prisma.order.updateMany({
        where: { paymentIntentId, status: "PENDING" },
        data: { status: "CONFIRMED" },
      })
      if (updated.count > 0) return true

      const existing = await prisma.order.findUnique({
        where: { paymentIntentId },
        select: { status: true },
      })
      if (existing?.status === "CONFIRMED") return true
      if (existing?.status === "CANCELLED") {
        // The payment captured after the order was cancelled. Retrying cannot
        // fix this; it needs an operator-visible refund.
        console.error(
          `[payments] succeeded payment for cancelled order intent ${paymentIntentId}; refund required`
        )
        return false
      }

      if (event.data?.object?.metadata?.source === "e-commerce-checkout") {
        // Checkout may still be committing the order. Do not acknowledge the
        // event; let the provider redeliver it after the order exists.
        throw new ServiceUnavailableException(
          "Order not found for payment intent; retry webhook"
        )
      }

      return false
    }

    if (event.type === "payment_intent.canceled") {
      const paymentIntentId = event.data?.object?.id
      if (!paymentIntentId) return false
      return this.cancelPendingOrderForIntent(paymentIntentId)
    }

    return false
  }

  private async cancelPendingOrderForIntent(paymentIntentId: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { paymentIntentId },
      include: { items: { select: { productId: true, quantity: true } } },
    })
    if (!order) return false
    if (order.status === "CANCELLED") return true
    if (order.status !== "PENDING") return false

    return prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      })
      if (cancelled.count !== 1) return false

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }

      return true
    })
  }

  async handleWebhook(signature: string, rawBody: Buffer): Promise<PaymentWebhookResult> {
    const Stripe = await this.loadStripe()
    const stripe = new Stripe(this.secretKey)

    const event = stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret)
    const claim = await this.claimWebhookEvent(event)

    if (claim.alreadyProcessed || !claim.claimedAt) {
      return {
        received: true,
        eventType: event.type,
        processed: false,
      }
    }

    try {
      const processed = await this.processWebhookEvent(event)

      await this.markWebhookProcessed(event.id, claim.claimedAt)

      return {
        received: true,
        eventType: event.type,
        processed,
      }
    } catch (error) {
      await this.releaseWebhookClaim(event.id, claim.claimedAt)
      throw error
    }
  }
}

@Injectable()
export class PaymentsService {
  constructor(private readonly cartService?: CartService) {}

  private mockProvider = new MockPaymentProvider()

  private async pricedCart(identity: CartRequestIdentity) {
    if (!this.cartService) throw new InternalServerErrorException('Cart service is not available')
    const current = await this.cartService.getCart(identity)
    const cart = await prisma.cart.findUnique({
      where: { id: current.id },
      include: { items: { include: { product: true } } },
    })
    if (!cart || cart.status !== 'active' || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty')
    }
    for (const item of cart.items) {
      if (!item.product.isActive || item.quantity > item.product.stock) {
        throw new BadRequestException('Cart items are unavailable')
      }
    }
    return {
      cartId: cart.id,
      subtotal: cart.items.reduce((sum, item) => sum + item.product.priceInCents * item.quantity, 0),
    }
  }

  async createCartIntent(identity: CartRequestIdentity, payload: CreatePaymentIntentPayload): Promise<PaymentIntentResponse> {
    if (this.resolveProviderName() === 'stripe') {
      throw new ServiceUnavailableException('Stripe card checkout is disabled until the complete payment flow is implemented')
    }
    if (!payload || (payload.shippingMethod !== undefined && !['standard', 'express'].includes(payload.shippingMethod))) {
      throw new BadRequestException('Invalid shipping method')
    }
    const cart = await this.pricedCart(identity)
    const total = calculateOrderTotals(cart.subtotal, payload.shippingMethod ?? 'standard').totalInCents
    if (payload.amountInCents !== total) {
      throw new BadRequestException('Payment amount does not match cart total')
    }
    return this.createIntent(payload, cart.cartId)
  }

  async confirmCartIntent(identity: CartRequestIdentity, paymentIntentId: string, payload: ConfirmPaymentIntentPayload) {
    if (this.resolveProviderName() === 'stripe') {
      throw new ServiceUnavailableException('Stripe card checkout is disabled until the complete payment flow is implemented')
    }
    const cart = await this.pricedCart(identity)
    const intent = await this.resolveProvider().getIntent(paymentIntentId)
    if (intent.cartId !== cart.cartId) throw new BadRequestException('Payment intent does not belong to this cart')
    return this.confirmIntent(paymentIntentId, payload)
  }

  private resolveProviderName(): PaymentProviderName {
    const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase()

    if (!configured || configured === "mock") return "mock"
    if (configured === "stripe") return "stripe"

    throw new InternalServerErrorException(
      `Unsupported PAYMENT_PROVIDER: ${configured}. Supported values: mock, stripe`
    )
  }

  getCapabilities() {
    // The storefront has no Stripe Elements card-entry flow yet.
    return { cardAvailable: this.resolveProviderName() === 'mock' }
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

  async createIntent(payload: CreatePaymentIntentPayload, cartId?: string): Promise<PaymentIntentResponse> {
    const amountInCents = Number(payload.amountInCents ?? 0)

    if (!Number.isSafeInteger(amountInCents) || amountInCents < 1) {
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
      cartId,
    })
  }

  async getIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const normalizedPaymentIntentId = paymentIntentId.trim()

    if (!normalizedPaymentIntentId) {
      throw new BadRequestException("paymentIntentId is required")
    }

    return this.resolveProvider().getIntent(normalizedPaymentIntentId)
  }

  async verifySuccessfulIntent(paymentIntentId: string, expectedAmount: number, cartId?: string): Promise<void> {
    const intent = await this.getIntent(paymentIntentId)
    if (intent.status !== 'succeeded' || intent.amountInCents !== expectedAmount || intent.currency !== 'PHP' ||
        (cartId !== undefined && intent.cartId !== cartId)) {
      throw new BadRequestException('Payment is not completed for this order total')
    }
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
