import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { auth } from './auth';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminAnalyticsController } from './admin/admin-analytics.controller';

@Module({
  imports: [AuthModule.forRoot({ auth }), ProductsModule, CartModule, CheckoutModule, OrdersModule, PaymentsModule],
  controllers: [AppController, AdminAnalyticsController],
  providers: [AppService],
})
export class AppModule {}
