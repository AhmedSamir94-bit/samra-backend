import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../users/user-role';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
