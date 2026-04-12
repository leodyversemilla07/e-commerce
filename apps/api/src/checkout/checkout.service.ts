import { BadRequestException, Injectable } from "@nestjs/common"

import { prisma } from "../prisma"
import type { CheckoutPayload, CheckoutRequestIdentity } from "./checkout.types"

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
