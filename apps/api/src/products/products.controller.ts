import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { ProductsService } from './products.service';

@AllowAnonymous()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async listProducts(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const result = await this.productsService.listProducts({
      limit: limit ? Number(limit) : undefined,
      cursor,
    });

    return {
      items: result.items,
      count: result.items.length,
      nextCursor: result.nextCursor,
    };
  }

  @Get(':slug')
  async getProduct(@Param('slug') slug: string) {
    const product = await this.productsService.getProductBySlug(slug);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
