import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { applyIdTransform } from '../../common/utils/schema.util';
import { ProductUnit } from '../../products/product-unit';

@Schema({ _id: false })
export class SaleItem {
  @Prop({ type: Types.ObjectId, ref: 'Product' })
  productId?: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, min: 0.001 })
  quantity!: number;

  @Prop()
  barcode?: string;

  @Prop({ default: 0, min: 0 })
  unitCost?: number;

  @Prop({
    type: String,
    enum: Object.values(ProductUnit),
    default: ProductUnit.PIECE,
  })
  unitType?: ProductUnit;
}

export const SaleItemSchema = SchemaFactory.createForClass(SaleItem);

export type SaleInvoiceDocument = HydratedDocument<SaleInvoice>;

@Schema({ timestamps: true })
export class SaleInvoice {
  @Prop({ required: true, unique: true })
  invoiceNumber!: string;

  @Prop({ required: true })
  date!: string;

  @Prop({ required: true })
  time!: string;

  @Prop({ type: [SaleItemSchema], required: true })
  items!: SaleItem[];

  @Prop({ required: true, min: 0 })
  total!: number;

  @Prop({ required: true, default: 'البائع الرئيسي' })
  cashier!: string;
}

export const SaleInvoiceSchema = SchemaFactory.createForClass(SaleInvoice);
applyIdTransform(SaleInvoiceSchema);
