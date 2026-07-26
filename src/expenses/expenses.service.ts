import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  getCurrentTime,
  getDateRange,
  getTodayDateString,
} from '../common/utils/schema.util';
import { ExpensePaymentMethod } from './expense-type';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { Expense } from './schemas/expense.schema';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private expenseModel: Model<Expense>,
  ) {}

  findAll(from?: string, to?: string, type?: string) {
    const filter: Record<string, unknown> = {
      ...getDateRange(from, to),
    };

    if (type) {
      filter.type = type;
    }

    return this.expenseModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const expense = await this.expenseModel.findById(id).exec();
    if (!expense) {
      throw new NotFoundException('المصروف غير موجود');
    }
    return expense;
  }

  async getNextExpenseNumber() {
    const expenseNumber = await this.generateNextExpenseNumber();
    return { expenseNumber };
  }

  private async generateNextExpenseNumber() {
    const expenses = await this.expenseModel
      .find()
      .select('expenseNumber')
      .exec();
    let maxNum = 0;

    for (const expense of expenses) {
      const match = expense.expenseNumber.match(/^EXP-(\d+)$/);
      if (match) {
        maxNum = Math.max(maxNum, Number.parseInt(match[1], 10));
      }
    }

    return `EXP-${String(maxNum + 1).padStart(6, '0')}`;
  }

  async create(dto: CreateExpenseDto, createdBy?: string) {
    const expenseNumber = await this.generateNextExpenseNumber();
    const date = dto.date?.trim() || getTodayDateString();

    return this.expenseModel.create({
      expenseNumber,
      type: dto.type,
      description: dto.description.trim(),
      amount: dto.amount,
      date,
      time: getCurrentTime(),
      paymentMethod: dto.paymentMethod || ExpensePaymentMethod.CASH,
      notes: dto.notes?.trim() || undefined,
      createdBy: createdBy || undefined,
    });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const existing = await this.expenseModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('المصروف غير موجود');
    }

    const expense = await this.expenseModel
      .findByIdAndUpdate(
        id,
        {
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.description !== undefined && {
            description: dto.description.trim(),
          }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.date !== undefined && { date: dto.date.trim() }),
          ...(dto.paymentMethod !== undefined && {
            paymentMethod: dto.paymentMethod,
          }),
          ...(dto.notes !== undefined && {
            notes: dto.notes.trim() || undefined,
          }),
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!expense) {
      throw new NotFoundException('المصروف غير موجود');
    }

    return expense;
  }

  async remove(id: string) {
    const expense = await this.expenseModel.findByIdAndDelete(id).exec();
    if (!expense) {
      throw new NotFoundException('المصروف غير موجود');
    }
  }
}
