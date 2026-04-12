import Link from "next/link"

import { formatPHP } from "@/lib/catalog"
import { formatOrderStatus, getOrderStatusVariant } from "@/lib/orders"
import { AdminSearch } from "@/components/admin-search"
import { AdminStatusUpdater } from "@/components/admin-status-updater"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"

function resolveApiBaseURL() {
  if (process.env.NEXT_PUBLIC_AUTH_BASE_URL) return process.env.NEXT_PUBLIC_AUTH_BASE_URL
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  return "http://localhost:4000"
}

type OrderItem = {
  id: string
  status: string
  customerName: string
  customerEmail: string
  totalInCents: number
  itemCount: number
  createdAt: string
}

async function getOrders(): Promise<OrderItem[]> {
  try {
    const res = await fetch(`${resolveApiBaseURL()}/admin/orders`, { cache: "no-store" })
    if (!res.ok) return []
    const data = (await res.json()) as { items: OrderItem[] }
    return data.items
  } catch {
    return []
  }
}

type AdminOrdersPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = await searchParams
  const query = params.q?.toLowerCase() ?? ""
  const statusFilter = params.status ?? ""

  const allOrders = await getOrders()

  const orders = allOrders.filter((order) => {
    const matchesQuery =
      !query ||
      order.customerName.toLowerCase().includes(query) ||
      order.customerEmail.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query)

    const matchesStatus = !statusFilter || order.status === statusFilter

    return matchesQuery && matchesStatus
  })

  const statusCounts = allOrders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const statuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Manage all orders and update their status. ({allOrders.length} total)
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch placeholder="Search by name, email, or order ID..." basePath="/admin/orders" />
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/orders"
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              !statusFilter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All ({allOrders.length})
          </Link>
          {statuses.map((s) => (
            <Link
              key={s}
              href={`/admin/orders?status=${s}`}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {formatOrderStatus(s)} ({statusCounts[s] ?? 0})
            </Link>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {query || statusFilter
                ? "No orders match your search."
                : "No orders yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="transition-colors hover:bg-accent/30">
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="group font-medium hover:underline"
                  >
                    {order.customerName}
                    <span className="ml-2 text-xs text-muted-foreground/60 transition-colors group-hover:text-muted-foreground">
                      View →
                    </span>
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()} · {order.itemCount} item(s)
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <div className="flex items-center gap-2">
                    <Badge variant={getOrderStatusVariant(order.status)}>
                      {formatOrderStatus(order.status)}
                    </Badge>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {formatPHP(order.totalInCents)}
                    </Link>
                  </div>
                  <AdminStatusUpdater orderId={order.id} currentStatus={order.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
