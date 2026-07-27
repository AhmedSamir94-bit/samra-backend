import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaleCartItemDto {
  @ApiProperty({ example: '67abc123def4567890123456', description: 'Product id' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 'كولا 330مل' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;
}

export class CreateSaleDto {
  @ApiProperty({ type: [SaleCartItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleCartItemDto)
  items!: SaleCartItemDto[];

  @ApiPropertyOptional({ example: 'admin' })
  @IsOptional()
  @IsString()
  cashier?: string;

  @ApiPropertyOptional({ enum: ['pos', 'delivery'], default: 'pos' })
  @IsOptional()
  @IsIn(['pos', 'delivery'])
  source?: 'pos' | 'delivery';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerOrderNumber?: string;
}
