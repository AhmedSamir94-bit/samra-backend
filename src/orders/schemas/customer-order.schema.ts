import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { applyIdTransform } from '../../common/utils/schema.util';
import { OrderStatus } from '../order-status';

export type CustomerOrderDocument = HydratedDocument<CustomerOrder>;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, min: 0.001 })
  quantity!: number;

  @Prop({ required: true })
  unitType!: string;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class OrderStatusEvent {
  @Prop({ type: String, enum: OrderStatus, required: true })
  status!: OrderStatus;

  @Prop({ default: () => new Date() })
  at!: Date;

  @Prop({ trim: true, default: '' })
  note!: string;
}

export const OrderStatusEventSchema =
  SchemaFactory.createForClass(OrderStatusEvent);

@Schema({ timestamps: true, collection: 'customer_orders' })
export class CustomerOrder {
  @Prop({ required: true, unique: true, index: true })
  orderNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'GuestSession', required: true, index: true })
  guestSessionId!: Types.ObjectId;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true, index: true })
  customerPhone!: string;

  @Prop({ required: true })
  deliveryAddress!: string;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.RECEIVED,
    index: true,
  })
  status!: OrderStatus;

  @Prop({ type: [OrderItemSchema], required: true })
  items!: OrderItem[];

  @Prop({ required: true, min: 0 })
  subtotal!: number;

  @Prop({ required: true, min: 0 })
  total!: number;

  @Prop({ trim: true, default: '' })
  notes!: string;

  @Prop({ type: [OrderStatusEventSchema], default: [] })
  statusHistory!: OrderStatusEvent[];

  @Prop({ default: false })
  stockDeducted!: boolean;

  @Prop({ trim: true, default: '' })
  saleInvoiceId!: string;
}

export const CustomerOrderSchema = SchemaFactory.createForClass(CustomerOrder);
applyIdTransform(CustomerOrderSchema);
