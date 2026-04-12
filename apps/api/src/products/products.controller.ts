import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { ProductsService } from './products.service';

@AllowAnonymous()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async listProducts() {
    const products = await this.productsService.listProducts();

    return {
      items: products,
      count: products.length,
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
