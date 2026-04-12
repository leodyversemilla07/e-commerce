export type CheckoutPayload = {
  customerEmail: string
  customerName: string
  shippingAddressLine1: string
  shippingAddressLine2?: string
  city: string
  province: string
  postalCode: string
  phone?: string
  notes?: string
  shippingMethod?: "standard" | "express"
  deliveryOption?: "anytime" | "morning" | "afternoon"
  paymentMethod?: "cod" | "card"
  paymentIntentId?: string
}

export type OrderResponse = {
  id: string
  status: string
  subtotalInCents: number
  shippingFeeInCents: number
  taxInCents: number
  totalInCents: number
  itemCount: number
  customerEmail: string
  customerName: string
  shippingAddressLine1: string
  shippingAddressLine2: string | null
  city: string
  province: string
  postalCode: string
  phone: string | null
  notes: string | null
  createdAt: string
  items: Array<{
    id: string
    productId: string
    quantity: number
    unitPriceInCents: number
    lineTotalInCents: number
    product: {
      id: string
      slug: string
      name: string
      imageUrl: string | null
    }
  }>
}

function resolveApiBaseURL() {
  if (process.env.NEXT_PUBLIC_AUTH_BASE_URL) {
    return process.env.NEXT_PUBLIC_AUTH_BASE_URL
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000`
  }

  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL
  }

  return 'http://localhost:4000'
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback

  if ('message' in payload) {
    const message = payload.message
    if (typeof message === 'string') return message
    if (Array.isArray(message) && typeof message[0] === 'string') return message[0]
  }

  return fallback
}

async function parseJSON<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function createPendingOrder(payload: CheckoutPayload): Promise<OrderResponse> {
  const response = await fetch(`${resolveApiBaseURL()}/checkout/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(extractErrorMessage(body, 'Failed to create order'))
  }

  return parseJSON<OrderResponse>(response)
}
