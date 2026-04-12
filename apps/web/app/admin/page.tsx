import Link from "next/link"
import { ShoppingCart } from "lucide-react"

import { formatPHP } from "@/lib/catalog"
import { formatOrderStatus, getOrderStatusVariant } from "@/lib/orders"
import { AdminCharts } from "@/components/admin/admin-charts"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

function resolveApiBaseURL() {
  if (process.env.NEXT_PUBLIC_AUTH_BASE_URL) return process.env.NEXT_PUBLIC_AUTH_BASE_URL
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  return "http://localhost:4000"
}

type OrderSummary = {
  id: string
  status: string
  customerName: string
  totalInCents: number
  createdAt: string
}

async function getRecentOrders(): Promise<OrderSummary[]> {
  try {
    const res = await fetch(`${resolveApiBaseURL()}/admin/orders`, { cache: "no-store" })
    if (!res.ok) return []
    const data = (await res.json()) as { items: OrderSummary[] }
    return (data.items ?? []).slice(0, 5)
  } catch {
    return []
  }
}

export default async function AdminDashboardPage() {
  const recentOrders = await getRecentOrders()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your store.</p>
      </div>

      {/* Stats + Charts (client component) */}
      <AdminCharts />

      {/* Recent Orders (server-rendered) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link
            href="/admin/orders"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-2 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{order.customerName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{order.id.slice(0, 8)}…</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getOrderStatusVariant(order.status)}>
                      {formatOrderStatus(order.status)}
                    </Badge>
                    <span className="text-sm font-semibold">{formatPHP(order.totalInCents)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
