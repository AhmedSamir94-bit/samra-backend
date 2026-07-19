import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { applyIdTransform } from '../../common/utils/schema.util';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, default: '#3B82F6' })
  color!: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
applyIdTransform(CategorySchema);
