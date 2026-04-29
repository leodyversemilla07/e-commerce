import { BadRequestException, Injectable } from "@nestjs/common"

import { prisma } from "../prisma"
import type { CheckoutPayload, CheckoutRequestIdentity } from "./checkout.types"

type OrderItem = {
  quantity: number
  unitPriceInCents: number
  lineTotalInCents: number
  product: { name: string; slug: string; id: string; imageUrl: string | null }
}

async function sendOrderConfirmationEmail(order: {
  id: string
  customerEmail: string
  customerName: string
  totalInCents: number
  subtotalInCents: number
  shippingFeeInCents: number
  taxInCents: number
  items: OrderItem[]
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (!apiKey) {
    console.log(`[checkout] order confirmation for ${order.customerEmail} — order ${order.id}`)
    return
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "no-reply@leodyversemilla07.com"

  const formatPrice = (cents: number) =>
    `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`

  const itemRows = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${item.product.name}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">${formatPrice(item.lineTotalInCents)}</td>
        </tr>`
    )
    .join("")

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h2 style="color:#111">Order Confirmed 🎉</h2>
      <p>Hi ${order.customerName}, thank you for your order!</p>
      <p style="color:#666;font-size:13px">Order ID: <strong>${order.id}</strong></p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f8f8f8">
            <th style="padding:8px 0;text-align:left">Item</th>
            <th style="padding:8px 0;text-align:center">Qty</th>
            <th style="padding:8px 0;text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <table style="width:100%;margin:8px 0">
        <tr><td>Subtotal</td><td style="text-align:right">${formatPrice(order.subtotalInCents)}</td></tr>
        <tr><td>Shipping</td><td style="text-align:right">${formatPrice(order.shippingFeeInCents)}</td></tr>
        <tr><td>Tax (5%)</td><td style="text-align:right">${formatPrice(order.taxInCents)}</td></tr>
        <tr style="font-weight:bold;border-top:2px solid #111">
          <td style="padding-top:8px">Total</td>
          <td style="padding-top:8px;text-align:right">${formatPrice(order.totalInCents)}</td>
        </tr>
      </table>

      <p style="color:#666;font-size:12px;margin-top:24px">
        You can track your order status in your account. We'll notify you when it ships.
      </p>
    </div>
  `.trim()

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [order.customerEmail],
      subject: `Order confirmed — #${order.id.slice(0, 8).toUpperCase()}`,
      html,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`[checkout] failed to send confirmation email: ${response.status} ${body}`)
  }
}

function normalize(value: string | null | undefined) {
  return value?.trim() ?? ""
}

function getShippingFeeInCents(method: "standard" | "express") {
  return method === "express" ? 19900 : 0
}

function getDeliveryOptionLabel(option: "anytime" | "morning" | "afternoon") {
  if (option === "morning") return "Morning (8AM–12PM)"
  if (option === "afternoon") return "Afternoon (1PM–6PM)"
  return "Anytime"
}

@Injectable()
export class CheckoutService {
  private async getActiveCart(identity: CheckoutRequestIdentity) {
    const cart = await prisma.cart.findFirst({
      where: {
        status: "active",
        OR: [
          identity.userId ? { userId: identity.userId } : undefined,
          { guestId: identity.guestId },
        ].filter(Boolean) as { userId?: string; guestId?: string }[],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                stock: true,
                isActive: true,
                priceInCents: true,
              },
            },
          },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Cart is empty")
    }

    return cart
  }

  private validatePayload(payload: CheckoutPayload) {
    const requiredFields: Array<[string, string]> = [
      ["customerEmail", normalize(payload.customerEmail)],
      ["customerName", normalize(payload.customerName)],
      ["shippingAddressLine1", normalize(payload.shippingAddressLine1)],
      ["city", normalize(payload.city)],
      ["province", normalize(payload.province)],
      ["postalCode", normalize(payload.postalCode)],
    ]

    const missing = requiredFields.find(([, value]) => !value)
    if (missing) {
      throw new BadRequestException(`${missing[0]} is required`)
    }
  }

  async createPendingOrder(identity: CheckoutRequestIdentity, payload: CheckoutPayload) {
    this.validatePayload(payload)

    const cart = await this.getActiveCart(identity)

    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw new BadRequestException("One or more cart items are no longer available")
      }

      if (item.quantity > item.product.stock) {
        throw new BadRequestException("One or more cart items exceed available stock")
      }
    }

    const subtotalInCents = cart.items.reduce(
      (sum, item) => sum + item.unitPriceInCents * item.quantity,
      0
    )

    const shippingMethod = payload.shippingMethod === "express" ? "express" : "standard"
    const deliveryOption =
      payload.deliveryOption === "morning" || payload.deliveryOption === "afternoon"
        ? payload.deliveryOption
        : "anytime"
    const paymentMethod = payload.paymentMethod === "card" ? "card" : "cod"
    const paymentIntentId = normalize(payload.paymentIntentId) || null

    if (paymentMethod === "card" && !paymentIntentId) {
      throw new BadRequestException("paymentIntentId is required for card payments")
    }
    const shippingFeeInCents = getShippingFeeInCents(shippingMethod)
    const taxInCents = Math.round(subtotalInCents * 0.05)
    const totalInCents = subtotalInCents + shippingFeeInCents + taxInCents

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: identity.userId,
          guestId: identity.guestId,
          status: "PENDING",
          customerEmail: normalize(payload.customerEmail),
          customerName: normalize(payload.customerName),
          shippingAddressLine1: normalize(payload.shippingAddressLine1),
          shippingAddressLine2: normalize(payload.shippingAddressLine2) || null,
          city: normalize(payload.city),
          province: normalize(payload.province),
          postalCode: normalize(payload.postalCode),
          phone: normalize(payload.phone) || null,
          notes:
            [
              normalize(payload.notes) || null,
              `Delivery option: ${getDeliveryOptionLabel(deliveryOption)}`,
              `Payment method: ${paymentMethod === "cod" ? "Cash on delivery" : "Card"}`,
            ]
              .filter(Boolean)
              .join(" | ") || null,
          paymentIntentId,
          subtotalInCents,
          shippingFeeInCents,
          taxInCents,
          totalInCents,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPriceInCents: item.unitPriceInCents,
              lineTotalInCents: item.unitPriceInCents * item.quantity,
            })),
          },
        },
        include: {
          items: {
            orderBy: { createdAt: "asc" },
            include: {
              product: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      })

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          status: "converted",
        },
      })

      await tx.cart.create({
        data: {
          userId: identity.userId,
          guestId: identity.guestId,
          status: "active",
        },
      })

      return createdOrder
    })

    // Fire-and-forget — email failure must never fail a successful order
    sendOrderConfirmationEmail({
      id: order.id,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      totalInCents: order.totalInCents,
      subtotalInCents: order.subtotalInCents,
      shippingFeeInCents: order.shippingFeeInCents,
      taxInCents: order.taxInCents,
      items: order.items,
    }).catch((err) => console.error("[checkout] confirmation email error:", err))

    return {
      id: order.id,
      status: order.status,
      subtotalInCents: order.subtotalInCents,
      shippingFeeInCents: order.shippingFeeInCents,
      taxInCents: order.taxInCents,
      totalInCents: order.totalInCents,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      shippingAddressLine1: order.shippingAddressLine1,
      shippingAddressLine2: order.shippingAddressLine2,
      city: order.city,
      province: order.province,
      postalCode: order.postalCode,
      phone: order.phone,
      notes: order.notes,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        lineTotalInCents: item.lineTotalInCents,
        product: item.product,
      })),
    }
  }
}
