import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { applyIdTransform } from '../../common/utils/schema.util';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, default: 0, min: 0 })
  cost!: number;

  @Prop({ required: true, default: 0, min: 0 })
  stock!: number;

  @Prop({ trim: true, sparse: true, unique: true })
  barcode?: string;

  @Prop({ trim: true })
  category?: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
applyIdTransform(ProductSchema);
