import { Controller, Get, Query } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { prisma } from '../prisma';

@AllowAnonymous()
@Controller('admin/analytics')
export class AdminAnalyticsController {
  @Get('overview')
  async getOverview() {
    // Get total revenue, orders, products, customers
    const [totalRevenue, totalOrders, totalProducts, totalCustomers] =
      await Promise.all([
        prisma.order.aggregate({
          _sum: { totalInCents: true },
          where: { status: { not: 'CANCELLED' } },
        }),
        prisma.order.count(),
        prisma.product.count(),
        prisma.user.count(),
      ]);

    // Get pending orders
    const pendingOrders = await prisma.order.count({
      where: { status: 'PENDING' },
    });

    return {
      totalRevenueInCents: totalRevenue._sum.totalInCents ?? 0,
      totalOrders,
      pendingOrders,
      totalProducts,
      totalCustomers,
    };
  }

  @Get('revenue-by-day')
  async getRevenueByDay(@Query('days') days?: string) {
    const numDays = Math.min(Math.max(Number.parseInt(days ?? '30', 10) || 30, 1), 365);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: 'CANCELLED' },
      },
      select: { createdAt: true, totalInCents: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const revenueByDay = new Map<string, number>();
    const ordersByDay = new Map<string, number>();

    for (const order of orders) {
      const day = order.createdAt.toISOString().split('T')[0];
      revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + order.totalInCents);
      ordersByDay.set(day, (ordersByDay.get(day) ?? 0) + 1);
    }

    // Fill in missing days with 0
    const result: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 0; i < numDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const day = date.toISOString().split('T')[0];
      result.push({
        date: day,
        revenue: revenueByDay.get(day) ?? 0,
        orders: ordersByDay.get(day) ?? 0,
      });
    }

    return result;
  }

  @Get('orders-by-status')
  async getOrdersByStatus() {
    const statuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

    const counts = await Promise.all(
      statuses.map((status) =>
        prisma.order.count({ where: { status } })
      )
    );

    return statuses.map((status, i) => ({
      status,
      count: counts[i],
    }));
  }

  @Get('top-products')
  async getTopProducts(@Query('limit') limit?: string) {
    const numLimit = Math.min(Math.max(Number.parseInt(limit ?? '5', 10) || 5, 1), 20);

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { lineTotalInCents: true, quantity: true },
      orderBy: { _sum: { lineTotalInCents: 'desc' } },
      take: numLimit,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return topProducts.map((p) => ({
      productId: p.productId,
      name: productMap.get(p.productId) ?? 'Unknown',
      revenueInCents: p._sum.lineTotalInCents ?? 0,
      quantitySold: p._sum.quantity ?? 0,
    }));
  }

  @Get('revenue-by-category')
  async getRevenueByCategory() {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { status: { not: 'CANCELLED' } },
      },
      select: {
        lineTotalInCents: true,
        product: {
          select: {
            category: { select: { name: true } },
          },
        },
      },
    });

    const revenueByCategory = new Map<string, number>();
    for (const item of orderItems) {
      const category = item.product.category.name;
      revenueByCategory.set(
        category,
        (revenueByCategory.get(category) ?? 0) + item.lineTotalInCents
      );
    }

    return Array.from(revenueByCategory.entries())
      .map(([name, revenueInCents]) => ({ name, revenueInCents }))
      .sort((a, b) => b.revenueInCents - a.revenueInCents);
  }
}
