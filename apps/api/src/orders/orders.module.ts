import { Module } from '@nestjs/common';

import { AdminOrdersController } from './admin-orders.controller';
import { OrdersCleanupService } from './orders-cleanup.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrdersCleanupService],
})
export class OrdersModule {}
