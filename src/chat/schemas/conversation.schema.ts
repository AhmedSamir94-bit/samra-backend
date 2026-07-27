import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { applyIdTransform } from '../../common/utils/schema.util';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true, collection: 'chat_conversations' })
export class Conversation {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  orderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  guestSessionId!: Types.ObjectId;

  @Prop({ trim: true, default: '' })
  customerName!: string;

  @Prop({ trim: true, default: '' })
  orderNumber!: string;

  @Prop({ trim: true, default: '' })
  lastMessage!: string;

  @Prop({ type: Date, default: null })
  lastMessageAt!: Date | null;

  @Prop({ default: 0, min: 0 })
  unreadForStaff!: number;

  @Prop({ default: 0, min: 0 })
  unreadForCustomer!: number;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ lastMessageAt: -1 });
applyIdTransform(ConversationSchema);
