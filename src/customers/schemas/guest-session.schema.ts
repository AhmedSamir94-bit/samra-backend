import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { applyIdTransform } from '../../common/utils/schema.util';

export type GuestSessionDocument = HydratedDocument<GuestSession>;

@Schema({ timestamps: true, collection: 'guest_sessions' })
export class GuestSession {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, index: true })
  phone!: string;

  @Prop({ required: true, trim: true })
  deliveryAddress!: string;

  @Prop()
  refreshTokenHash?: string;
}

export const GuestSessionSchema = SchemaFactory.createForClass(GuestSession);
applyIdTransform(GuestSessionSchema);
