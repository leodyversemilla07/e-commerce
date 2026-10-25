import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { OrdersService } from './orders.service';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class OrdersCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersCleanupService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly ordersService: OrdersService) {}

  onModuleInit(): void {
    void this.cleanup();
    this.timer = setInterval(() => void this.cleanup(), CLEANUP_INTERVAL_MS);
    // Do not keep the process alive solely for the cleanup loop.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async cleanup(): Promise<void> {
    try {
      const expired = await this.ordersService.expireStalePendingOrders();
      if (expired > 0) {
        this.logger.log(`Expired ${expired} stale cash-on-delivery order(s)`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to expire stale pending orders',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
