import { BadRequestException, NotFoundException } from '@nestjs/common';

import { prisma } from '../prisma';
import { OrdersService } from './orders.service';

jest.mock('../prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    product: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const mockedPrisma = prisma as unknown as {
  order: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
  };
  product: { update: jest.Mock };
  $transaction: jest.Mock;
};

function makeOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'order-1',
    status: 'PENDING',
    customerName: 'Leodyver S. Semilla',
    customerEmail: 'leodyversemilla07@gmail.com',
    shippingAddressLine1: '123 Main St',
    shippingAddressLine2: null,
    city: 'Quezon City',
    province: 'Metro Manila',
    postalCode: '1100',
    phone: null,
    notes: 'Delivery option: Anytime | Payment method: Cash on delivery',
    subtotalInCents: 20000,
    shippingFeeInCents: 0,
    taxInCents: 1000,
    totalInCents: 21000,
    paymentIntentId: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        quantity: 2,
        unitPriceInCents: 10000,
        lineTotalInCents: 20000,
        createdAt: new Date(),
        product: { id: 'prod-1', slug: 'prod-1', name: 'Product 1', imageUrl: null },
      },
    ],
    ...overrides,
  };
}

describe('OrdersService', () => {
  const identity = { userId: 'user-1', guestId: 'guest-1' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn({ order: mockedPrisma.order, product: mockedPrisma.product }));
    mockedPrisma.order.updateMany.mockResolvedValue({ count: 1 });
  });

  // ─── listOrders ────────────────────────────────────────────────────────────

  describe('listOrders', () => {
    it('returns mapped orders with default pagination', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([makeOrder()]);

      const service = new OrdersService();
      const result = await service.listOrders(identity);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('order-1');
      expect(result.nextCursor).toBeNull();
    });

    it('sets nextCursor when there are more results than the limit', async () => {
      const orders = Array.from({ length: 21 }, (_, i) =>
        makeOrder({ id: `order-${i + 1}` }),
      );
      mockedPrisma.order.findMany.mockResolvedValue(orders);

      const service = new OrdersService();
      const result = await service.listOrders(identity, { limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('order-20');
    });

    it('caps limit at MAX_PAGE_LIMIT (100)', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([]);

      const service = new OrdersService();
      await service.listOrders(identity, { limit: 9999 });

      const callArgs = mockedPrisma.order.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(101); // limit(100) + 1
    });

    it('passes cursor to prisma when provided', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([]);

      const service = new OrdersService();
      await service.listOrders(identity, { cursor: 'order-5' });

      const callArgs = mockedPrisma.order.findMany.mock.calls[0][0];
      expect(callArgs.cursor).toEqual({ id: 'order-5' });
      expect(callArgs.skip).toBe(1);
    });

    it('returns empty items and null nextCursor when no orders exist', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([]);

      const service = new OrdersService();
      const result = await service.listOrders(identity);

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('scopes authenticated reads to userId and ignores a stale guest id', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([]);

      await new OrdersService().listOrders({ userId: 'user-1', guestId: 'stale-guest' });

      expect(mockedPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('scopes guest reads to unowned guest orders', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([]);

      await new OrdersService().listOrders({ userId: null, guestId: 'guest-1' });

      expect(mockedPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guestId: 'guest-1', userId: null } }),
      );
    });
  });

  // ─── getOrderById ──────────────────────────────────────────────────────────

  describe('getOrderById', () => {
    it('returns order detail when found', async () => {
      mockedPrisma.order.findFirst.mockResolvedValue(makeOrder());

      const service = new OrdersService();
      const result = await service.getOrderById(identity, 'order-1');

      expect(result.id).toBe('order-1');
      expect(result.items).toHaveLength(1);
      expect(result.itemCount).toBe(2);
    });

    it('throws NotFoundException when order does not exist', async () => {
      mockedPrisma.order.findFirst.mockResolvedValue(null);

      const service = new OrdersService();

      await expect(service.getOrderById(identity, 'missing-order')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ─── updateOrderStatus ─────────────────────────────────────────────────────

  describe('updateOrderStatus', () => {
    it('updates and returns the order status', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(makeOrder());

      const service = new OrdersService();
      const result = await service.updateOrderStatus('order-1', 'CONFIRMED');

      expect(result.status).toBe('CONFIRMED');
      expect(mockedPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1', status: 'PENDING' },
          data: { status: 'CONFIRMED' },
        }),
      );
    });

    it('restores inventory when cancelling an order once', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(makeOrder());
      const service = new OrdersService();
      await service.updateOrderStatus('order-1', 'CANCELLED');
      expect(mockedPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' }, data: { stock: { increment: 2 } },
      });
    });

    it('does not cancel a paid order without a refund', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(makeOrder({ status: 'CONFIRMED', paymentIntentId: 'pi_paid' }));
      await expect(new OrdersService().updateOrderStatus('order-1', 'CANCELLED'))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(mockedPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockedPrisma.product.update).not.toHaveBeenCalled();
    });

    it('does not restock shipped or delivered orders via cancellation', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(makeOrder({ status: 'SHIPPED' }));
      await expect(new OrdersService().updateOrderStatus('order-1', 'CANCELLED'))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(mockedPrisma.product.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when order to update does not exist', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);

      const service = new OrdersService();

      await expect(service.updateOrderStatus('missing', 'SHIPPED')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ─── expireStalePendingOrders ──────────────────────────────────────────────

  describe('expireStalePendingOrders', () => {
    it('cancels stale COD orders and restores their stock', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([makeOrder()]);

      const service = new OrdersService();
      const expired = await service.expireStalePendingOrders(new Date('2025-01-05T00:00:00Z'));

      expect(expired).toBe(1);
      expect(mockedPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            paymentIntentId: null,
            createdAt: { lt: expect.any(Date) },
          }),
        }),
      );
      expect(mockedPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1', status: 'PENDING', paymentIntentId: null },
          data: { status: 'CANCELLED' },
        }),
      );
      expect(mockedPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 2 } },
      });
    });

    it('does not expire an order claimed by another worker', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([makeOrder()]);
      mockedPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      const expired = await new OrdersService().expireStalePendingOrders();

      expect(expired).toBe(0);
      expect(mockedPrisma.product.update).not.toHaveBeenCalled();
    });
  });

  // ─── listAllOrders ─────────────────────────────────────────────────────────

  describe('listAllOrders', () => {
    it('returns all orders with default pagination', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([makeOrder()]);

      const service = new OrdersService();
      const result = await service.listAllOrders();

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('sets nextCursor when there are more results than the limit', async () => {
      const orders = Array.from({ length: 21 }, (_, i) =>
        makeOrder({ id: `order-${i + 1}` }),
      );
      mockedPrisma.order.findMany.mockResolvedValue(orders);

      const service = new OrdersService();
      const result = await service.listAllOrders({ limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('order-20');
    });

    it('passes cursor to prisma when provided', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([]);

      const service = new OrdersService();
      await service.listAllOrders({ cursor: 'order-10' });

      const callArgs = mockedPrisma.order.findMany.mock.calls[0][0];
      expect(callArgs.cursor).toEqual({ id: 'order-10' });
    });
  });
});
