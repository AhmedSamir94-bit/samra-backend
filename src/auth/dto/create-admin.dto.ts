import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({ example: 'cashier1' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'pass1234', minLength: 4 })
  @IsString()
  @MinLength(4)
  password!: string;

  @ApiProperty({ example: 'كاشير ١' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
