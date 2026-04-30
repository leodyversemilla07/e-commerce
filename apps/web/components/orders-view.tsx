"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { formatOrderStatus, formatOrderTotal, getOrderStatusVariant, getOrders, type OrdersListItem } from "@/lib/orders"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

function OrdersViewSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {['order-row-1', 'order-row-2', 'order-row-3'].map((id) => (
        <Card key={id}>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function OrdersView() {
  const [orders, setOrders] = useState<OrdersListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
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

  if (loading) {
    return <OrdersViewSkeleton />
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No orders yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Create your first order from checkout.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-mono text-xs sm:text-sm">{order.id}</p>
              <p className="text-sm">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Badge variant={getOrderStatusVariant(order.status)}>{formatOrderStatus(order.status)}</Badge>
              <p className="text-sm text-muted-foreground">{order.itemCount} item(s)</p>
              <p className="text-lg font-semibold">{formatOrderTotal(order.totalInCents)}</p>
              <Link href={`/account/orders/${order.id}`} className="text-sm underline underline-offset-4">
                View details
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
