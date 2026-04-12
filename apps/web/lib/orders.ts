import { formatPHP } from "./catalog"

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

export async function getOrders(): Promise<OrdersListResponse> {
  const response = await fetch("/api/orders", {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch orders")
  }

  return parseJSON<OrdersListResponse>(response)
}

export async function getOrderById(id: string): Promise<OrderDetail> {
  const response = await fetch(`/api/orders/${id}`, {
    method: "GET",
    cache: "no-store",
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
  const response = await fetch(`${resolveApiBaseURL()}/admin/orders`, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch orders")
  }

  return parseJSON<OrdersListResponse>(response)
}

export async function adminUpdateOrderStatus(orderId: string, status: string) {
  const response = await fetch(`${resolveApiBaseURL()}/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    throw new Error("Failed to update order status")
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
  const response = await fetch(`${resolveApiBaseURL()}/admin/products/${productId}`, {
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
  const response = await fetch(`${resolveApiBaseURL()}/admin/products/${productId}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch product")
  }

  return parseJSON<AdminProduct>(response)
}

export async function adminListCategories(): Promise<AdminCategory[]> {
  const response = await fetch(`${resolveApiBaseURL()}/admin/products/categories`, {
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
  const response = await fetch(`${resolveApiBaseURL()}/admin/products`, {
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
  const response = await fetch(`${resolveApiBaseURL()}/admin/products/${productId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete product")
  }

  return parseJSON<{ id: string; name: string; deleted: boolean; deactivated: boolean }>(response)
}

export async function adminGetOrderById(orderId: string): Promise<OrderDetail> {
  const response = await fetch(`${resolveApiBaseURL()}/admin/orders/${orderId}`, {
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
