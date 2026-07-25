import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PurchaseItemDto {
  @ApiProperty({ example: 'كولا 330مل' })
  @IsString()
  @IsNotEmpty()
  productName!: string;

  @ApiPropertyOptional({ example: '6223000000001' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 50, minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 8, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice!: number;

  @ApiProperty({ example: 15, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice!: number;

  @ApiPropertyOptional({ example: 'مشروبات' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class CreatePurchaseDto {
  @ApiPropertyOptional({ example: 'P-2026-0001' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiProperty({ example: 'مورد النيل' })
  @IsString()
  @IsNotEmpty()
  supplier!: string;

  @ApiPropertyOptional({ example: '2026-07-25', description: 'ISO date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}

export class UpdatePurchaseDto extends CreatePurchaseDto {}
