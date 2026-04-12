import { CartView } from "@/components/cart-view"

export default function CartPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Your Cart</h1>
        <p className="text-sm text-muted-foreground">Review your items before checkout.</p>
      </div>
      <CartView />
    </div>
  )
}
