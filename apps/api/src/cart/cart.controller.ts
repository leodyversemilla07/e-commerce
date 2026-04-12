import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';

import { CartService } from './cart.service';
import { getCartIdentity } from './cart.utils';

type AddItemDto = {
  productId: string;
  quantity?: number;
};

type UpdateItemQuantityDto = {
  quantity: number;
};

@AllowAnonymous()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const identity = getCartIdentity(req, res);
    return this.cartService.getCart(identity);
  }

  @Post('items')
  async addItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: AddItemDto,
  ) {
    const identity = getCartIdentity(req, res);

    return this.cartService.addItem(identity, {
      productId: body.productId,
      quantity: body.quantity ?? 1,
    });
  }

  @Patch('items/:itemId')
  async updateItemQuantity(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
    @Body() body: UpdateItemQuantityDto,
  ) {
    const identity = getCartIdentity(req, res);
    return this.cartService.updateItemQuantity(identity, itemId, body.quantity);
  }

  @Delete('items/:itemId')
  async removeItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
  ) {
    const identity = getCartIdentity(req, res);
    return this.cartService.removeItem(identity, itemId);
  }
}
