export type CreatePaymentIntentPayload = {
  amountInCents: number
  currency?: "PHP"
  method?: "card"
}

export type ConfirmPaymentIntentPayload = {
  paymentMethodId?: string
}

export type PaymentIntentResponse = {
  id: string
  provider: "mock" | "stripe"
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "requires_action"
    | "processing"
    | "requires_capture"
    | "succeeded"
    | "canceled"
  amountInCents: number
  currency: "PHP"
  method: "card"
  clientSecret: string
  createdAt: string
}

export type PaymentWebhookResult = {
  received: true
  eventType: string
  processed: boolean
}
