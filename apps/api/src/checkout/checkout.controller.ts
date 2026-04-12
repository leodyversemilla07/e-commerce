import { Body, Controller, Post, Req } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';

import { CheckoutService } from './checkout.service';
import type { CheckoutPayload } from './checkout.types';
import { getCheckoutIdentity } from './checkout.utils';

type CreateOrderDto = CheckoutPayload & {
  shippingMethod?: 'standard' | 'express';
};

@AllowAnonymous()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('create-order')
  async createOrder(@Req() req: Request, @Body() body: CreateOrderDto) {
    const identity = getCheckoutIdentity(req);
    return this.checkoutService.createPendingOrder(identity, body);
  }
}
