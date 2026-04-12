import { Controller, Get, Param, Req } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';

import { OrdersService } from './orders.service';
import { getOrdersIdentity } from './orders.utils';

@AllowAnonymous()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async listOrders(@Req() req: Request) {
    const identity = getOrdersIdentity(req);
    return this.ordersService.listOrders(identity);
  }

  @Get(':id')
  async getOrderById(@Req() req: Request, @Param('id') id: string) {
    const identity = getOrdersIdentity(req);
    return this.ordersService.getOrderById(identity, id);
  }
}
