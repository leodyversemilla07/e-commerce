"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import {
  useCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemQuantityMutation,
} from "@/hooks/use-cart"
import { formatPHP } from "@/lib/catalog"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "Something went wrong"
  if ("message" in error && typeof error.message === "string") return error.message
  return "Something went wrong"
}

export function CartView() {
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const { data: cart, isLoading: loading, error, refetch } = useCartQuery()
  const updateMutation = useUpdateCartItemQuantityMutation()
  const removeMutation = useRemoveCartItemMutation()

  const updateQuantity = async (itemId: string, quantity: number) => {
    setUpdatingItemId(itemId)

    try {
      await updateMutation.mutateAsync({ itemId, quantity })
      toast.success("Quantity updated")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setUpdatingItemId(null)
    }
  }

  const removeItem = async (itemId: string) => {
    setUpdatingItemId(itemId)

    try {
      await removeMutation.mutateAsync({ itemId })
      toast.success("Item removed from cart")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setUpdatingItemId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading cart...</p>
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load cart</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {getErrorMessage(error)}. Please try again.
          </p>
          <Button onClick={() => void refetch()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your cart is empty</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/products">Browse products</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {cart.items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{item.product.name}</p>
              <p className="text-sm text-muted-foreground">{formatPHP(item.unitPriceInCents)} each</p>
              <p className="text-sm">Line total: {formatPHP(item.lineTotalInCents)}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={item.quantity <= 1 || updatingItemId === item.id}
                onClick={() => void updateQuantity(item.id, item.quantity - 1)}
              >
                -
              </Button>
              <span className="w-8 text-center text-sm">{item.quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={updatingItemId === item.id}
                onClick={() => void updateQuantity(item.id, item.quantity + 1)}
              >
                +
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={updatingItemId === item.id}
                onClick={() => void removeItem(item.id)}
              >
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Subtotal ({cart.itemCount} items)</p>
            <p className="text-lg font-semibold">{formatPHP(cart.subtotalInCents)}</p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/checkout">Proceed to checkout</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
