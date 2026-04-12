export type CartItem = {
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
    stock: number
  }
}

export type CartResponse = {
  id: string
  status: string
  itemCount: number
  subtotalInCents: number
  items: CartItem[]
  updatedAt: string
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

async function parseJSON<T>(response: Response): Promise<T> {
  return (await response.json()) as T
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

export async function getCart(): Promise<CartResponse> {
  const response = await fetch(`${resolveApiBaseURL()}/cart`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch cart")
  }

  return parseJSON<CartResponse>(response)
}

export async function addToCart(productId: string, quantity = 1): Promise<CartResponse> {
  const response = await fetch(`${resolveApiBaseURL()}/cart/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productId, quantity }),
    credentials: "include",
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(extractErrorMessage(payload, "Failed to add item to cart"))
  }

  return parseJSON<CartResponse>(response)
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<CartResponse> {
  const response = await fetch(`${resolveApiBaseURL()}/cart/items/${itemId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ quantity }),
    credentials: "include",
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(extractErrorMessage(payload, "Failed to update cart item"))
  }

  return parseJSON<CartResponse>(response)
}

export async function removeCartItem(itemId: string): Promise<CartResponse> {
  const response = await fetch(`${resolveApiBaseURL()}/cart/items/${itemId}`, {
    method: "DELETE",
    credentials: "include",
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(extractErrorMessage(payload, "Failed to remove cart item"))
  }

  return parseJSON<CartResponse>(response)
}
