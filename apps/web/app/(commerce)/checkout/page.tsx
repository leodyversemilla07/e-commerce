"use client"

import { CheckoutForm } from "@/components/checkout-form"
import { useCartQuery } from "@/hooks/use-cart"

export default function CheckoutPage() {
  const { data: cart, isLoading: loading } = useCartQuery()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-sm text-muted-foreground">Confirm shipping details and create your order.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading checkout...</p>
      ) : !cart || cart.itemCount === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Your cart is empty. Add items before checkout.
        </div>
      ) : (
        <CheckoutForm subtotalInCents={cart.subtotalInCents} itemCount={cart.itemCount} />
      )}
    </div>
  )
}
