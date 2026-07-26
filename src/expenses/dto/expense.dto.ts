import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  ExpensePaymentMethod,
  ExpenseType,
} from '../expense-type';

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseType, example: ExpenseType.ELECTRICITY })
  @IsEnum(ExpenseType)
  type!: ExpenseType;

  @ApiProperty({ example: 'فاتورة كهرباء شهر يوليو' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 850, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({
    example: '2026-07-25',
    description: 'ISO date YYYY-MM-DD',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    enum: ExpensePaymentMethod,
    example: ExpensePaymentMethod.CASH,
  })
  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod;

  @ApiPropertyOptional({ example: 'تم الدفع نقداً' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateExpenseDto {
  @ApiPropertyOptional({ enum: ExpenseType })
  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @ApiPropertyOptional({ example: 'فاتورة كهرباء شهر يوليو' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({ example: 850, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: '2026-07-25' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ enum: ExpensePaymentMethod })
  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  paymentMethod?: ExpensePaymentMethod;

  @ApiPropertyOptional({ example: 'تم الدفع نقداً' })
  @IsOptional()
  @IsString()
  notes?: string;
}
