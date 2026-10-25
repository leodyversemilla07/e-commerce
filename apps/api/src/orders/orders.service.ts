import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '../prisma';
import type { OrderStatus, OrdersRequestIdentity } from './orders.types';

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

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

  async listOrders(
    identity: OrdersRequestIdentity,
    options: { limit?: number; cursor?: string } = {},
  ) {
    if (options.limit !== undefined && (!Number.isSafeInteger(options.limit) || options.limit < 1)) {
      throw new BadRequestException('limit must be a positive integer');
    }
    const limit = Math.min(options.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const cursor = options.cursor;

    const orders = await prisma.order.findMany({
      where: this.whereForIdentity(identity),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = orders.length > limit;
    const page = hasMore ? orders.slice(0, limit) : orders;

    return {
      items: page.map((order) => ({
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
      count: page.length,
      nextCursor: hasMore ? page[page.length - 1].id : null,
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
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === status) return order;
      const allowed: Record<OrderStatus, OrderStatus[]> = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: [],
        CANCELLED: [],
      };
      if (!(allowed[order.status as OrderStatus] ?? []).includes(status)) {
        throw new BadRequestException(`Cannot change order from ${order.status} to ${status}`);
      }
      if (status === 'CANCELLED' && order.paymentIntentId) {
        throw new BadRequestException('Paid orders require a refund before cancellation');
      }

      const changed = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { status },
      });
      if (changed.count !== 1) throw new BadRequestException('Order status changed; retry');
      if (status === 'CANCELLED') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      return { ...order, status };
    });
  }

  async listAllOrders(options: { limit?: number; cursor?: string } = {}) {
    if (options.limit !== undefined && (!Number.isSafeInteger(options.limit) || options.limit < 1)) {
      throw new BadRequestException('limit must be a positive integer');
    }
    const limit = Math.min(options.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const cursor = options.cursor;

    const orders = await prisma.order.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = orders.length > limit;
    const page = hasMore ? orders.slice(0, limit) : orders;

    return {
      items: page.map((order) => ({
        id: order.id,
        status: order.status,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        totalInCents: order.totalInCents,
        hasCardPayment: Boolean(order.paymentIntentId),
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      count: page.length,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }
}
