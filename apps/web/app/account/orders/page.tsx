import { OrdersView } from "@/components/orders-view"

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Your Orders</h1>
        <p className="text-sm text-muted-foreground">Track your pending and completed orders.</p>
      </div>
      <OrdersView />
    </div>
  )
}
