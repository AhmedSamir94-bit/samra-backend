import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  PurchaseInvoice,
  PurchaseInvoiceSchema,
} from '../purchases/schemas/purchase-invoice.schema';
import { SaleInvoice, SaleInvoiceSchema } from '../sales/schemas/sale-invoice.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SaleInvoice.name, schema: SaleInvoiceSchema },
      { name: PurchaseInvoice.name, schema: PurchaseInvoiceSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
