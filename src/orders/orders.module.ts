import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersModule } from '../customers/customers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { PushModule } from '../push/push.module';
import { SalesModule } from '../sales/sales.module';
import {
  CustomerOrdersController,
  StaffOrdersController,
} from './orders.controller';
import { OrdersService } from './orders.service';
import {
  CustomerOrder,
  CustomerOrderSchema,
} from './schemas/customer-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerOrder.name, schema: CustomerOrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    CustomersModule,
    SalesModule,
    NotificationsModule,
    forwardRef(() => PushModule),
  ],
  controllers: [CustomerOrdersController, StaffOrdersController],
  providers: [OrdersService],
  exports: [OrdersService, MongooseModule],
})
export class OrdersModule {}
