"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { formatPHP } from "@/lib/catalog"
import { createPendingOrder, type CheckoutPayload, type OrderResponse } from "@/lib/checkout"
import { confirmPaymentIntent, createPaymentIntent } from "@/lib/payments"
import { useCheckoutStore } from "@/providers/checkout-store-provider"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"

type CheckoutFormProps = {
  subtotalInCents: number
  itemCount: number
}

type ShippingMethod = "standard" | "express"
type PaymentMethod = "cod" | "card"
type DeliveryOption = "anytime" | "morning" | "afternoon"

const initialForm: CheckoutPayload = {
  customerEmail: "",
  customerName: "",
  shippingAddressLine1: "",
  shippingAddressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  phone: "",
  notes: "",
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback
  if ("message" in error && typeof error.message === "string") return error.message
  return fallback
}

function getShippingFeeInCents(method: ShippingMethod) {
  return method === "express" ? 19900 : 0
}

export function CheckoutForm({ subtotalInCents, itemCount }: CheckoutFormProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CheckoutPayload>(initialForm)
  const shippingMethod = useCheckoutStore((state) => state.shippingMethod)
  const paymentMethod = useCheckoutStore((state) => state.paymentMethod)
  const deliveryOption = useCheckoutStore((state) => state.deliveryOption)
  const setShippingMethod = useCheckoutStore((state) => state.setShippingMethod)
  const setPaymentMethod = useCheckoutStore((state) => state.setPaymentMethod)
  const setDeliveryOption = useCheckoutStore((state) => state.setDeliveryOption)
  const resetCheckoutState = useCheckoutStore((state) => state.reset)
  const [pending, setPending] = useState(false)
  const [order, setOrder] = useState<OrderResponse | null>(null)

  const canSubmit = useMemo(() => {
    return (
      form.customerEmail.trim() &&
      form.customerName.trim() &&
      form.shippingAddressLine1.trim() &&
      form.city.trim() &&
      form.province.trim() &&
      form.postalCode.trim()
    )
  }, [form])

  const shippingInCents = useMemo(() => getShippingFeeInCents(shippingMethod), [shippingMethod])
  const estimatedTaxInCents = useMemo(() => Math.round(subtotalInCents * 0.05), [subtotalInCents])
  const totalInCents = useMemo(
    () => subtotalInCents + shippingInCents + estimatedTaxInCents,
    [estimatedTaxInCents, shippingInCents, subtotalInCents]
  )

  const update = (key: keyof CheckoutPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async () => {
    if (!canSubmit) {
      toast.error("Please fill all required fields")
      return
    }

    setPending(true)

    const notes = [form.notes?.trim() ? form.notes.trim() : null].filter(Boolean).join(" | ")

    try {
      let paymentIntentId: string | undefined = undefined

      if (paymentMethod === "card") {
        const paymentIntent = await createPaymentIntent({
          amountInCents: totalInCents,
          currency: "PHP",
          method: "card",
        })

        const confirmedIntent = await confirmPaymentIntent(paymentIntent.id)

        if (confirmedIntent.status !== "succeeded") {
          throw new Error(`Card payment is not completed yet (status: ${confirmedIntent.status})`)
        }

        paymentIntentId = confirmedIntent.id
      }

      const created = await createPendingOrder({
        ...form,
        notes,
        shippingMethod,
        deliveryOption,
        paymentMethod,
        paymentIntentId,
      })
      setOrder(created)
      resetCheckoutState()
      await queryClient.invalidateQueries({ queryKey: ["cart"] })
      toast.success("Order created. Status: pending")
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create order"))
    } finally {
      setPending(false)
    }
  }

  if (order) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order placed (pending)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Order ID: {order.id}</p>
          <p>Items: {order.itemCount}</p>
          <p>Subtotal: {formatPHP(order.subtotalInCents)}</p>
          <p>Shipping: {formatPHP(order.shippingFeeInCents)}</p>
          <p>Tax: {formatPHP(order.taxInCents)}</p>
          <p>Total: {formatPHP(order.totalInCents)}</p>
          <p>
            Ship to: {order.customerName}, {order.shippingAddressLine1}, {order.city},{" "}
            {order.province} {order.postalCode}
          </p>
          <p className="text-muted-foreground">
            Shipping: {shippingMethod === "standard" ? "Standard" : "Express"} · Delivery:{" "}
            {deliveryOption === "anytime"
              ? "Anytime"
              : deliveryOption === "morning"
                ? "Morning (8AM–12PM)"
                : "Afternoon (1PM–6PM)"}{" "}
            · Payment: {paymentMethod === "cod" ? "Cash on delivery" : "Card"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Contact information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input
              placeholder="Email *"
              value={form.customerEmail}
              onChange={(event) => update("customerEmail", event.target.value)}
            />
            <Input
              placeholder="Full name *"
              value={form.customerName}
              onChange={(event) => update("customerName", event.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input
              placeholder="Address line 1 *"
              value={form.shippingAddressLine1}
              onChange={(event) => update("shippingAddressLine1", event.target.value)}
            />
            <Input
              placeholder="Address line 2"
              value={form.shippingAddressLine2 ?? ""}
              onChange={(event) => update("shippingAddressLine2", event.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="City *"
                value={form.city}
                onChange={(event) => update("city", event.target.value)}
              />
              <Input
                placeholder="Province *"
                value={form.province}
                onChange={(event) => update("province", event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Postal code *"
                value={form.postalCode}
                onChange={(event) => update("postalCode", event.target.value)}
              />
              <Input
                placeholder="Phone"
                value={form.phone ?? ""}
                onChange={(event) => update("phone", event.target.value)}
              />
            </div>
            <Input
              placeholder="Delivery notes"
              value={form.notes ?? ""}
              onChange={(event) => update("notes", event.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping method</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              type="button"
              variant={shippingMethod === "standard" ? "default" : "outline"}
              onClick={() => setShippingMethod("standard")}
              className="justify-between text-left"
            >
              <span className="text-sm">Standard (3-5 business days)</span>
              <span className="text-xs">{formatPHP(0)}</span>
            </Button>
            <Button
              type="button"
              variant={shippingMethod === "express" ? "default" : "outline"}
              onClick={() => setShippingMethod("express")}
              className="justify-between text-left"
            >
              <span className="text-sm">Express (next day)</span>
              <span className="text-xs">{formatPHP(19900)}</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery option</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              type="button"
              variant={deliveryOption === "anytime" ? "default" : "outline"}
              onClick={() => setDeliveryOption("anytime")}
              className="justify-between text-left"
            >
              <span className="text-sm">Anytime delivery</span>
              <span className="text-xs text-muted-foreground">Most flexible</span>
            </Button>
            <Button
              type="button"
              variant={deliveryOption === "morning" ? "default" : "outline"}
              onClick={() => setDeliveryOption("morning")}
              className="justify-between text-left"
            >
              <span className="text-sm">Morning (8AM–12PM)</span>
              <span className="text-xs text-muted-foreground">Preferred slot</span>
            </Button>
            <Button
              type="button"
              variant={deliveryOption === "afternoon" ? "default" : "outline"}
              onClick={() => setDeliveryOption("afternoon")}
              className="justify-between text-left"
            >
              <span className="text-sm">Afternoon (1PM–6PM)</span>
              <span className="text-xs text-muted-foreground">Preferred slot</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              type="button"
              variant={paymentMethod === "cod" ? "default" : "outline"}
              onClick={() => setPaymentMethod("cod")}
              className="justify-between text-left"
            >
              <span className="text-sm">Cash on delivery</span>
              <span className="text-xs text-muted-foreground">Available</span>
            </Button>
            <Button
              type="button"
              variant={paymentMethod === "card" ? "default" : "outline"}
              onClick={() => setPaymentMethod("card")}
              className="justify-between text-left"
            >
              <span className="text-sm">Card payment</span>
              <span className="text-xs text-muted-foreground">Mock intent (ready)</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Items ({itemCount})</span>
            <span>{formatPHP(subtotalInCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatPHP(shippingInCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimated tax</span>
            <span>{formatPHP(estimatedTaxInCents)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
            <span>Total</span>
            <span>{formatPHP(totalInCents)}</span>
          </div>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || !canSubmit}
            className="w-full"
          >
            {pending ? "Creating order..." : "Complete order"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Secure checkout. Card flow now creates and confirms payment intents before order
            creation.
          </p>
          <Link href="/account/orders" className="block text-center text-xs underline underline-offset-4">
            View your orders
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
