import { CartService } from './cart.service';
import { prisma } from '../prisma';

jest.mock('../prisma', () => ({
  prisma: {
    cart: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    cartItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('CartService', () => {
  const mockedPrisma = prisma as unknown as {
    cart: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    cartItem: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    product: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges guest cart into user cart on sign-in and keeps a single active cart', async () => {
    const service = new CartService();

    const userCart = { id: 'cart-user-1', userId: 'user-1', guestId: null, status: 'active' };
    const guestCart = { id: 'cart-guest-1', userId: null, guestId: 'guest-1', status: 'active' };

    mockedPrisma.cart.findFirst
      .mockResolvedValueOnce(userCart)
      .mockResolvedValueOnce(guestCart);

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        cart: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              id: userCart.id,
              items: [{ id: 'u-item-1', productId: 'prod-1', quantity: 1, unitPriceInCents: 10000 }],
            })
            .mockResolvedValueOnce({
              id: guestCart.id,
              items: [
                { id: 'g-item-1', productId: 'prod-1', quantity: 2, unitPriceInCents: 10000 },
                { id: 'g-item-2', productId: 'prod-2', quantity: 1, unitPriceInCents: 20000 },
              ],
            }),
          update: jest.fn().mockResolvedValue({}),
        },
        product: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'prod-1', stock: 2, isActive: true, priceInCents: 10000 },
            { id: 'prod-2', stock: 5, isActive: true, priceInCents: 20000 },
          ]),
        },
        cartItem: {
          upsert: jest.fn().mockResolvedValue({}),
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };

      const result = await fn(tx);
      mockedPrisma.cartItem.upsert.mock.calls.push(...tx.cartItem.upsert.mock.calls);
      mockedPrisma.cartItem.deleteMany.mock.calls.push(...tx.cartItem.deleteMany.mock.calls);
      mockedPrisma.cart.update.mock.calls.push(...tx.cart.update.mock.calls);
      return result;
    });

    mockedPrisma.cart.findUnique.mockResolvedValue({
      id: userCart.id,
      status: 'active',
      updatedAt: new Date(),
      items: [
        {
          id: 'u-item-1',
          productId: 'prod-1',
          quantity: 2,
          unitPriceInCents: 10000,
          product: { id: 'prod-1', slug: 'prod-1', name: 'Prod 1', imageUrl: null, stock: 2 },
        },
        {
          id: 'u-item-2',
          productId: 'prod-2',
          quantity: 1,
          unitPriceInCents: 20000,
          product: { id: 'prod-2', slug: 'prod-2', name: 'Prod 2', imageUrl: null, stock: 5 },
        },
      ],
    });

    await service.getCart({ userId: 'user-1', guestId: 'guest-1' });

    expect(mockedPrisma.$transaction).toHaveBeenCalled();
    expect(mockedPrisma.cartItem.upsert).toHaveBeenCalledTimes(2);
    expect(mockedPrisma.cart.update).toHaveBeenCalledWith({
      where: { id: guestCart.id },
      data: { status: 'merged' },
    });
  });
});
