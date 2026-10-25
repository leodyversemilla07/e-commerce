import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { prisma } from '../prisma';
import { AdminApiGuard } from '../admin/admin-api.guard';

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

@AllowAnonymous()
@UseGuards(AdminApiGuard)
@Controller('admin/products')
export class AdminProductsController {
  @Get()
  async listAllProducts(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 20;
    if (!Number.isSafeInteger(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('limit must be a positive integer');
    }
    const take = Math.min(parsedLimit, 100);

    const products = await prisma.product.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        priceInCents: true,
        stock: true,
        isFeatured: true,
        isActive: true,
        category: { select: { name: true, slug: true } },
        createdAt: true,
      },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = products.length > take;
    const page = hasMore ? products.slice(0, take) : products;

    return {
      items: page,
      count: page.length,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  @Get('categories')
  async listCategories() {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
    return { items: categories };
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        priceInCents: true,
        stock: true,
        imageUrl: true,
        isFeatured: true,
        isActive: true,
        categoryId: true,
        category: { select: { id: true, name: true, slug: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  @Post()
  async createProduct(
    @Body()
    body: {
      name: string;
      slug: string;
      description: string;
      priceInCents: number;
      stock?: number;
      imageUrl?: string;
      isFeatured?: boolean;
      isActive?: boolean;
      categoryId: string;
    },
  ) {
    if (!Number.isSafeInteger(body.priceInCents) || body.priceInCents < 0 ||
        !Number.isSafeInteger(body.stock ?? 0) || (body.stock ?? 0) < 0) {
      throw new BadRequestException('Price and stock must be non-negative integers');
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!name || !slug || !body.categoryId) {
      throw new BadRequestException('Name, slug, and category are required');
    }
    try {
      return await prisma.product.create({
        data: {
          name,
          slug,
          description: typeof body.description === 'string' ? body.description.trim() : '',
          priceInCents: body.priceInCents,
          stock: body.stock ?? 0,
          imageUrl: body.imageUrl ?? null,
          isFeatured: body.isFeatured ?? false,
          isActive: body.isActive ?? true,
          categoryId: body.categoryId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          priceInCents: true,
          stock: true,
          isFeatured: true,
          isActive: true,
          category: { select: { name: true, slug: true } },
          createdAt: true,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A product with this slug already exists');
      }
      throw error;
    }
  }

  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      description?: string;
      priceInCents?: number;
      imageUrl?: string | null;
      categoryId?: string;
      isFeatured?: boolean;
      isActive?: boolean;
      stock?: number;
    },
  ) {
    if ((body.priceInCents !== undefined && (!Number.isSafeInteger(body.priceInCents) || body.priceInCents < 0)) ||
        (body.stock !== undefined && (!Number.isSafeInteger(body.stock) || body.stock < 0))) {
      throw new BadRequestException('Price and stock must be non-negative integers');
    }
    const name = body.name?.trim();
    const slug = body.slug?.trim();
    if (body.name !== undefined && !name) throw new BadRequestException('Name is required');
    if (body.slug !== undefined && !slug) throw new BadRequestException('Slug is required');
    try {
      return await prisma.product.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(slug !== undefined && { slug }),
          ...(body.description !== undefined && { description: body.description.trim() }),
          ...(body.priceInCents !== undefined && { priceInCents: body.priceInCents }),
          ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
          ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
          ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          ...(body.stock !== undefined && { stock: body.stock }),
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
          isActive: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A product with this slug already exists');
      }
      throw error;
    }
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, orderItems: { select: { id: true }, take: 1 } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Soft-delete: just deactivate if it has order history
    if (product.orderItems.length > 0) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false, isFeatured: false },
      });
      return { id, name: product.name, deleted: false, deactivated: true };
    }

    // Hard-delete cart items first, then the product
    await prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    return { id, name: product.name, deleted: true, deactivated: false };
  }
}
