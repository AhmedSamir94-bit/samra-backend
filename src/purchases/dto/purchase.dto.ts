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

class PurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  productName!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice!: number;

  @IsOptional()
  @IsString()
  category?: string;
}

export class CreatePurchaseDto {
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsString()
  @IsNotEmpty()
  supplier!: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}

export class UpdatePurchaseDto extends CreatePurchaseDto {}
