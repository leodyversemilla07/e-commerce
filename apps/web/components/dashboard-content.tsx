"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Package, ShoppingCart, TrendingUp } from "lucide-react"

import { formatOrderStatus, getOrderStatusVariant, getOrders, type OrdersListItem } from "@/lib/orders"
import { formatPHP } from "@/lib/catalog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

export function DashboardContent({ userName }: { userName: string }) {
  const [orders, setOrders] = useState<OrdersListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getOrders()
        setOrders(data.items)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const totalOrders = orders.length
  const pendingOrders = orders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED").length
  const totalSpent = orders.reduce((sum, o) => sum + o.totalInCents, 0)
  const recentOrders = orders.slice(0, 3)

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s an overview of your account.
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {["a", "b", "c"].map((key) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Spent
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatPHP(totalSpent)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your latest purchases</CardDescription>
          </div>
          {orders.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/account/orders">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {["a", "b", "c"].map((key) => (
                <div key={key} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Package className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No orders yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start shopping to see your orders here.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {order.id.slice(0, 8)}…
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
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

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/products" className="block">
          <Card className="transition-colors hover:bg-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" />
                Browse Products
              </CardTitle>
              <CardDescription>Continue shopping</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/account/orders" className="block">
          <Card className="transition-colors hover:bg-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Order History
              </CardTitle>
              <CardDescription>Track your orders</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
