import { Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '../prisma';
import type { OrderStatus } from '../generated/prisma/client';
import type { OrdersRequestIdentity } from './orders.types';

@Injectable()
export class OrdersService {
  private whereForIdentity(identity: OrdersRequestIdentity) {
    return {
      OR: [
        identity.userId ? { userId: identity.userId } : undefined,
        { guestId: identity.guestId },
      ].filter(Boolean) as { userId?: string; guestId?: string }[],
    };
  }

  async listOrders(identity: OrdersRequestIdentity) {
    const orders = await prisma.order.findMany({
      where: this.whereForIdentity(identity),
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
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
      take: 50,
    });

    return {
      items: orders.map((order) => ({
        id: order.id,
        status: order.status,
        subtotalInCents: order.subtotalInCents,
        shippingFeeInCents: order.shippingFeeInCents,
        taxInCents: order.taxInCents,
        totalInCents: order.totalInCents,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        createdAt: order.createdAt,
      })),
      count: orders.length,
    };
  }

  async getOrderById(identity: OrdersRequestIdentity, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...this.whereForIdentity(identity),
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
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
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

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
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        lineTotalInCents: item.lineTotalInCents,
        product: item.product,
      })),
    };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  async listAllOrders() {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      take: 100,
    });

    return {
      items: orders.map((order) => ({
        id: order.id,
        status: order.status,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        totalInCents: order.totalInCents,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      count: orders.length,
    };
  }
}
