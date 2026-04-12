import { Injectable } from '@nestjs/common';

import { prisma } from '../prisma';

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
  async listProducts(): Promise<ProductListItem[]> {
    return prisma.product.findMany({
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
    });
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
