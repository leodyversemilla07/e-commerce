import { Injectable } from '@nestjs/common';

import { prisma } from '../prisma';

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceInCents: number;
  stock: number;
  imageUrl: string | null;
  isFeatured: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
};

@Injectable()
export class ProductsService {
  async listProducts(options: { limit?: number; cursor?: string } = {}): Promise<{
    items: ProductListItem[];
    nextCursor: string | null;
  }> {
    const limit = Math.min(options.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const cursor = options.cursor;

    const rows = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        priceInCents: true,
        stock: true,
        imageUrl: true,
        isFeatured: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async getProductBySlug(slug: string) {
    return prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        priceInCents: true,
        stock: true,
        imageUrl: true,
        isFeatured: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
