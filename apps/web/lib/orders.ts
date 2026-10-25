import { formatPHP } from "./catalog"
import { adminServerFetch } from './admin-api'

function apiBaseURL() {
  return process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? `${window.location.protocol}//${window.location.hostname}:4000`
}

function adminFetch(path: string, init: RequestInit = {}) {
  if (typeof window === 'undefined') return adminServerFetch(path, init)
  return fetch(`/api/admin/backend/${path}`, init)
}

type OrderItem = {
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
}

export type OrdersListItem = {
  id: string
  status: string
  subtotalInCents: number
  shippingFeeInCents: number
  taxInCents: number
  totalInCents: number
  itemCount: number
  customerName: string
  customerEmail: string
  createdAt: string
}

export type OrdersListResponse = {
  items: OrdersListItem[]
  count: number
}

export type OrderDetail = {
  id: string
  status: string
  subtotalInCents: number
  shippingFeeInCents: number
  taxInCents: number
  totalInCents: number
  hasCardPayment?: boolean
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
  updatedAt: string
  items: OrderItem[]
}

async function parseJSON<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function getOrders(): Promise<OrdersListResponse> {
  const items: OrdersListItem[] = []
  let cursor: string | null = null
  do {
    const query: string = cursor ? `?limit=100&cursor=${encodeURIComponent(cursor)}` : '?limit=100'
    const response: Response = await fetch(`${apiBaseURL()}/orders${query}`, {
      cache: 'no-store', credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed to fetch orders')
    const page: OrdersListResponse & { nextCursor?: string | null } = await parseJSON(response)
    items.push(...page.items)
    if (page.nextCursor && page.nextCursor === cursor) throw new Error('Order pagination did not advance')
    cursor = page.nextCursor ?? null
  } while (cursor)
  return { items, count: items.length }
}

export async function getOrderById(id: string): Promise<OrderDetail> {
  const response = await fetch(`${apiBaseURL()}/orders/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
    credentials: 'include',
  })

  if (response.status === 404) {
    throw new Error("Order not found")
  }

  if (!response.ok) {
    throw new Error("Failed to fetch order")
  }

  return parseJSON<OrderDetail>(response)
}

export function formatOrderStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    pending: "Pending",
    confirmed: "Confirmed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  }
  return map[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
}

export function getOrderStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toUpperCase()
  if (s === "DELIVERED") return "default"
  if (s === "CANCELLED") return "destructive"
  if (s === "SHIPPED") return "secondary"
  return "outline"
}

// Admin API
export async function adminListOrders(): Promise<OrdersListResponse> {
  const response = await adminFetch('orders', {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch orders")
  }

  return parseJSON<OrdersListResponse>(response)
}

export async function adminUpdateOrderStatus(orderId: string, status: string) {
  const response = await adminFetch(`orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Failed to update order status')
  }

  return parseJSON<{ id: string; status: string }>(response)
}

export async function adminUpdateProduct(
  productId: string,
  data: {
    name?: string
    slug?: string
    description?: string
    priceInCents?: number
    imageUrl?: string | null
    categoryId?: string
    isFeatured?: boolean
    isActive?: boolean
    stock?: number
  },
) {
  const response = await adminFetch(`products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error("Failed to update product")
  }

  return parseJSON(response)
}

export type AdminCategory = {
  id: string
  name: string
  slug: string
}

export type AdminProduct = {
  id: string
  name: string
  slug: string
  description: string
  priceInCents: number
  stock: number
  imageUrl: string | null
  isFeatured: boolean
  isActive: boolean
  categoryId: string
  category: { id: string; name: string; slug: string }
  createdAt: string
  updatedAt: string
}

export async function adminGetProduct(productId: string): Promise<AdminProduct> {
  const response = await adminFetch(`products/${encodeURIComponent(productId)}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch product")
  }

  return parseJSON<AdminProduct>(response)
}

export async function adminListCategories(): Promise<AdminCategory[]> {
  const response = await adminFetch('products/categories', {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch categories")
  }

  const data = await parseJSON<{ items: AdminCategory[] }>(response)
  return data.items
}

export async function adminCreateProduct(data: {
  name: string
  slug: string
  description: string
  priceInCents: number
  stock?: number
  imageUrl?: string
  isFeatured?: boolean
  isActive?: boolean
  categoryId: string
}) {
  const response = await adminFetch('products', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to create product: ${err}`)
  }

  return parseJSON<{ id: string; name: string; slug: string }>(response)
}

export async function adminDeleteProduct(productId: string) {
  const response = await adminFetch(`products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete product")
  }

  return parseJSON<{ id: string; name: string; deleted: boolean; deactivated: boolean }>(response)
}

export async function adminGetOrderById(orderId: string): Promise<OrderDetail> {
  const response = await adminFetch(`orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch order")
  }

  return parseJSON<OrderDetail>(response)
}

export function formatOrderTotal(amountInCents: number) {
  return formatPHP(amountInCents)
}
