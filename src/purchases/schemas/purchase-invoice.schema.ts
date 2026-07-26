import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { applyIdTransform } from '../../common/utils/schema.util';
import { ProductUnit } from '../../products/product-unit';

@Schema({ _id: false })
export class PurchaseItem {
  @Prop({ required: true })
  productName!: string;

  @Prop({ default: '' })
  barcode!: string;

  @Prop({ required: true, min: 0.001 })
  quantity!: number;

  @Prop({ required: true, min: 0 })
  purchasePrice!: number;

  @Prop({ required: true, min: 0 })
  salePrice!: number;

  @Prop({ default: '' })
  category!: string;

  @Prop({
    type: String,
    enum: Object.values(ProductUnit),
    default: ProductUnit.PIECE,
  })
  unitType!: ProductUnit;
}

export const PurchaseItemSchema = SchemaFactory.createForClass(PurchaseItem);

export type PurchaseInvoiceDocument = HydratedDocument<PurchaseInvoice>;

@Schema({ timestamps: true })
export class PurchaseInvoice {
  @Prop({ required: true, unique: true })
  invoiceNumber!: string;

  @Prop({ required: true })
  supplier!: string;

  @Prop({ required: true })
  date!: string;

  @Prop({ required: true })
  time!: string;

  @Prop({ type: [PurchaseItemSchema], required: true })
  items!: PurchaseItem[];

  @Prop({ required: true, min: 0 })
  total!: number;
}

export const PurchaseInvoiceSchema =
  SchemaFactory.createForClass(PurchaseInvoice);
applyIdTransform(PurchaseInvoiceSchema);
