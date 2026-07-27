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
import { ProductUnit } from '../product-unit';

export class CreateProductDto {
  @ApiProperty({ example: 'كولا 330مل' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 15, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 8, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: '6223000000001' })
  @IsOptional()
  @IsEnum(ProductUnit)
  unitType?: ProductUnit;

  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 'مشروبات' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Product image as data URL (image/*;base64,...) or https URL',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'كولا 330مل' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 16, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 95, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 8.5, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: '6223000000001' })
  @IsOptional()
  @IsEnum(ProductUnit)
  unitType?: ProductUnit;

  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 'مشروبات' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Product image as data URL (image/*;base64,...) or https URL',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
