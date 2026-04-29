import { ProductsService } from './products.service';
import { prisma } from '../prisma';

jest.mock('../prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('ProductsService', () => {
  let service: ProductsService;
  const mockedPrisma = prisma as unknown as {
    product: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService();
  });

  describe('listProducts', () => {
    it('returns products and nextCursor when there are more items', async () => {
      const mockProducts = Array.from({ length: 51 }, (_, i) => ({ id: `prod-${i}` }));
      mockedPrisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.listProducts({ limit: 50 });

      expect(result.items.length).toBe(50);
      expect(result.nextCursor).toBe('prod-49');
    });

    it('returns products and null nextCursor when there are no more items', async () => {
      const mockProducts = Array.from({ length: 50 }, (_, i) => ({ id: `prod-${i}` }));
      mockedPrisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.listProducts({ limit: 50 });

      expect(result.items.length).toBe(50);
      expect(result.nextCursor).toBeNull();
    });

    it('limits based on MAX_PAGE_LIMIT', async () => {
      mockedPrisma.product.findMany.mockResolvedValue([]);

      await service.listProducts({ limit: 500 });
      expect(mockedPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 201, // 200 max limit + 1
        }),
      );
    });

    it('passes cursor to prisma when provided', async () => {
      mockedPrisma.product.findMany.mockResolvedValue([]);

      await service.listProducts({ cursor: 'some-cursor' });

      expect(mockedPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'some-cursor' },
          skip: 1,
        }),
      );
    });
  });

  describe('getProductBySlug', () => {
    it('returns product when found', async () => {
      const mockProduct = { id: 'prod-1', slug: 'test-product' };
      mockedPrisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.getProductBySlug('test-product');

      expect(result).toEqual(mockProduct);
    });

    it('returns null when product not found', async () => {
      mockedPrisma.product.findFirst.mockResolvedValue(null);

      const result = await service.getProductBySlug('non-existent');

      expect(result).toBeNull();
    });
  });
});
