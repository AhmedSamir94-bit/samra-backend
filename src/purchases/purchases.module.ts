import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import {
  PurchaseInvoice,
  PurchaseInvoiceSchema,
} from './schemas/purchase-invoice.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseInvoice.name, schema: PurchaseInvoiceSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
