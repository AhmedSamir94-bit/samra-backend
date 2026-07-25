import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'admin123', minLength: 4, description: 'Password' })
  @IsString()
  @MinLength(4)
  password!: string;
}
