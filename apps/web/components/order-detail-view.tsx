"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { formatPHP } from "@/lib/catalog"
import { getOrderById, type OrderDetail } from "@/lib/orders"
import { OrderStatusTimeline } from "@/components/order-status-timeline"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

type OrderDetailViewProps = {
  orderId: string
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {['item-1', 'item-2', 'item-3'].map((id) => (
            <div key={id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-7 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function OrderDetailView({ orderId }: OrderDetailViewProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getOrderById(orderId)
        setOrder(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load order"
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [orderId])

  if (loading) {
    return <OrderDetailSkeleton />
  }

  if (error || !order) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{error ?? "Order not found"}</p>
          <Link href="/account/orders" className="text-sm underline underline-offset-4">
            Back to orders
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="break-all">Order {order.id}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <OrderStatusTimeline status={order.status} />
          <div className="space-y-2 text-sm">
            <p>Placed: {new Date(order.createdAt).toLocaleString()}</p>
            <p>Customer: {order.customerName}</p>
            <p>Email: {order.customerEmail}</p>
            <p>
              Shipping: {order.shippingAddressLine1}
              {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""}, {order.city}, {order.province} {order.postalCode}
            </p>
            {order.phone ? <p>Phone: {order.phone}</p> : null}
            {order.notes ? <p>Notes: {order.notes}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
              <div>
                <p className="font-medium">{item.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Qty {item.quantity} × {formatPHP(item.unitPriceInCents)}
                </p>
              </div>
              <p className="font-semibold">{formatPHP(item.lineTotalInCents)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6 text-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Subtotal</p>
            <p>{formatPHP(order.subtotalInCents)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Shipping</p>
            <p>{formatPHP(order.shippingFeeInCents)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Tax</p>
            <p>{formatPHP(order.taxInCents)}</p>
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-lg font-semibold">
            <p>Total</p>
            <p>{formatPHP(order.totalInCents)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
