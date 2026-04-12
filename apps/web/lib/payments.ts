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

function resolveApiBaseURL() {
  if (process.env.NEXT_PUBLIC_AUTH_BASE_URL) {
    return process.env.NEXT_PUBLIC_AUTH_BASE_URL
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`
  }

  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL
  }

  return "http://localhost:4000"
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback

  if ("message" in payload) {
    const message = payload.message
    if (typeof message === "string") return message
    if (Array.isArray(message) && typeof message[0] === "string") return message[0]
  }

  return fallback
}

async function parseJSON<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function createPaymentIntent(
  payload: CreatePaymentIntentPayload
): Promise<PaymentIntentResponse> {
  const response = await fetch(`${resolveApiBaseURL()}/payments/intents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(extractErrorMessage(body, "Failed to create payment intent"))
  }

  return parseJSON<PaymentIntentResponse>(response)
}

export async function confirmPaymentIntent(
  paymentIntentId: string,
  payload: ConfirmPaymentIntentPayload = {}
): Promise<PaymentIntentResponse> {
  const response = await fetch(
    `${resolveApiBaseURL()}/payments/intents/${encodeURIComponent(paymentIntentId)}/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(extractErrorMessage(body, "Failed to confirm payment intent"))
  }

  return parseJSON<PaymentIntentResponse>(response)
}
