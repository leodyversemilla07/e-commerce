"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useAddToCartMutation } from "@/hooks/use-cart"
import { Button } from "@workspace/ui/components/button"

type AddToCartButtonProps = {
  productId: string
  showBuyNow?: boolean
}

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "Unable to add item to cart"
  if ("message" in error && typeof error.message === "string") return error.message
  return "Unable to add item to cart"
}

export function AddToCartButton({ productId, showBuyNow = false }: AddToCartButtonProps) {
  const router = useRouter()
  const addToCartMutation = useAddToCartMutation()
  const [pendingAction, setPendingAction] = useState<"add" | "buy" | null>(null)

  const onAdd = async () => {
    setPendingAction("add")

    try {
      const cart = await addToCartMutation.mutateAsync({ productId })
      toast.success(`Added to cart • ${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setPendingAction(null)
    }
  }

  const onBuyNow = async () => {
    setPendingAction("buy")

    try {
      await addToCartMutation.mutateAsync({ productId })
      router.push("/checkout")
    } catch (error) {
      toast.error(getErrorMessage(error))
      setPendingAction(null)
    }
  }

  if (!showBuyNow) {
    return (
      <Button onClick={onAdd} disabled={pendingAction !== null} className="w-full sm:w-auto">
        {pendingAction === "add" ? "Adding..." : "Add to cart"}
      </Button>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button onClick={onAdd} disabled={pendingAction !== null} variant="outline" className="w-full sm:w-auto">
        {pendingAction === "add" ? "Adding..." : "Add to cart"}
      </Button>
      <Button onClick={onBuyNow} disabled={pendingAction !== null} className="w-full sm:w-auto">
        {pendingAction === "buy" ? "Redirecting..." : "Buy now"}
      </Button>
    </div>
  )
}
