import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { applyIdTransform } from '../../common/utils/schema.util';
import {
  ExpensePaymentMethod,
  ExpenseType,
} from '../expense-type';

@Schema({ timestamps: true })
export class Expense {
  @Prop({ required: true, unique: true })
  expenseNumber!: string;

  @Prop({ required: true, enum: ExpenseType })
  type!: ExpenseType;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true })
  date!: string;

  @Prop({ required: true })
  time!: string;

  @Prop({
    required: true,
    enum: ExpensePaymentMethod,
    default: ExpensePaymentMethod.CASH,
  })
  paymentMethod!: ExpensePaymentMethod;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  createdBy?: string;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
applyIdTransform(ExpenseSchema);
ExpenseSchema.index({ date: 1, type: 1 });
