import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminStatusUpdater } from "@/components/admin-status-updater"
import { formatPHP } from "@/lib/catalog"
import { adminGetOrderById, formatOrderStatus, getOrderStatusVariant, type OrderDetail } from "@/lib/orders"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params

  let order: OrderDetail
  try {
    order = await adminGetOrderById(id)
  } catch {
    notFound()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">← Back to Orders</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Order Details</h1>
          <p className="font-mono text-sm text-muted-foreground">{order.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getOrderStatusVariant(order.status)}>
            {formatOrderStatus(order.status)}
          </Badge>
          <AdminStatusUpdater orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {order.customerName}</p>
            <p><span className="text-muted-foreground">Email:</span> {order.customerEmail}</p>
            {order.phone && (
              <p><span className="text-muted-foreground">Phone:</span> {order.phone}</p>
            )}
            {order.notes && (
              <p><span className="text-muted-foreground">Notes:</span> {order.notes}</p>
            )}
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{order.shippingAddressLine1}</p>
            {order.shippingAddressLine2 && <p>{order.shippingAddressLine2}</p>}
            <p>{order.city}, {order.province} {order.postalCode}</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items ({order.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPHP(item.unitPriceInCents)} × {item.quantity}
                  </p>
                </div>
                <p className="font-semibold">{formatPHP(item.lineTotalInCents)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPHP(order.subtotalInCents)}</span>
            </div>
            {order.shippingFeeInCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatPHP(order.shippingFeeInCents)}</span>
              </div>
            )}
            {order.taxInCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPHP(order.taxInCents)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatPHP(order.totalInCents)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <div className="text-xs text-muted-foreground">
        <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(order.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  )
}
