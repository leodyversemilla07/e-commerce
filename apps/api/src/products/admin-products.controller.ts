import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { prisma } from '../prisma';

@AllowAnonymous()
@Controller('admin/products')
export class AdminProductsController {
  @Get()
  async listAllProducts() {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
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
    return { items: products, count: products.length };
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
    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
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
    return product;
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
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description }),
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
    return product;
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
