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

import { clearGuestCartCookie } from '../guest-cart';
import { CartService } from './cart.service';
import type { CartRequestIdentity } from './cart.types';
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

  private consumeGuestCookie(identity: CartRequestIdentity, res: Response): void {
    if (identity.userId && identity.guestId) {
      clearGuestCartCookie(res);
    }
  }

  @Get()
  async getCart(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const identity = getCartIdentity(req, res);
    const cart = await this.cartService.getCart(identity);
    this.consumeGuestCookie(identity, res);
    return cart;
  }

  @Post('items')
  async addItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: AddItemDto,
  ) {
    const identity = getCartIdentity(req, res);
    const cart = await this.cartService.addItem(identity, {
      productId: body.productId,
      quantity: body.quantity ?? 1,
    });
    this.consumeGuestCookie(identity, res);
    return cart;
  }

  @Patch('items/:itemId')
  async updateItemQuantity(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
    @Body() body: UpdateItemQuantityDto,
  ) {
    const identity = getCartIdentity(req, res);
    const cart = await this.cartService.updateItemQuantity(identity, itemId, body.quantity);
    this.consumeGuestCookie(identity, res);
    return cart;
  }

  @Delete('items/:itemId')
  async removeItem(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
  ) {
    const identity = getCartIdentity(req, res);
    const cart = await this.cartService.removeItem(identity, itemId);
    this.consumeGuestCookie(identity, res);
    return cart;
  }
}
