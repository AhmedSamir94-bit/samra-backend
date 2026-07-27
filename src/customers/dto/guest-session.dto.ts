import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateGuestSessionDto {
  @ApiProperty({ example: 'محمد أحمد' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '01012345678' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  phone!: string;

  @ApiProperty({ example: 'شارع النيل، القاهرة' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  deliveryAddress!: string;
}
