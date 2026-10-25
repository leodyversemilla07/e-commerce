import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { OrderStatus } from './orders.types';
import { prisma } from '../prisma';
import { AdminApiGuard } from '../admin/admin-api.guard';
import { OrdersService } from './orders.service';

@AllowAnonymous()
@UseGuards(AdminApiGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async listAllOrders(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.ordersService.listAllOrders({
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, slug: true, name: true, imageUrl: true },
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
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      shippingAddressLine1: order.shippingAddressLine1,
      shippingAddressLine2: order.shippingAddressLine2,
      city: order.city,
      province: order.province,
      postalCode: order.postalCode,
      phone: order.phone,
      notes: order.notes,
      subtotalInCents: order.subtotalInCents,
      shippingFeeInCents: order.shippingFeeInCents,
      taxInCents: order.taxInCents,
      totalInCents: order.totalInCents,
      hasCardPayment: Boolean(order.paymentIntentId),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      itemCount: order.items.length,
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

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    if (!['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      throw new BadRequestException('Invalid order status');
    }
    const order = await this.ordersService.updateOrderStatus(id, status);
    return { id: order.id, status: order.status };
  }
}
