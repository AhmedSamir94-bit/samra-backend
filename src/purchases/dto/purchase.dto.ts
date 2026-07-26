import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductUnit } from '../../products/product-unit';

class PurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  productName!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
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

  @IsOptional()
  @IsEnum(ProductUnit)
  unitType?: ProductUnit;
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
