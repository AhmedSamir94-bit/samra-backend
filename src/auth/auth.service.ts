import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user-role';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginDto } from './dto/login.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private getAccessExpiresInSeconds() {
    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    if (expiresIn.endsWith('m')) return Number(expiresIn.replace('m', '')) * 60;
    if (expiresIn.endsWith('h')) return Number(expiresIn.replace('h', '')) * 3600;
    return Number(expiresIn) || 900;
  }

  private async createTokenPair(user: {
    _id: { toString(): string };
    username: string;
    name: string;
    role?: UserRole;
  }): Promise<TokenPair> {
    const role = user.role || UserRole.SUPER_ADMIN;
    const payload = {
      sub: user._id.toString(),
      username: user.username,
      name: user.name,
      role,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = randomBytes(64).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.usersService.updateRefreshTokenHash(user._id.toString(), refreshTokenHash);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessExpiresInSeconds(),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user) {
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    if (!user.role) {
      user.role = UserRole.SUPER_ADMIN;
      await user.save();
    }

    const tokens = await this.createTokenPair(user);

    return {
      ...tokens,
      user: this.usersService.toPublicUser(user),
    };
  }

  async refresh(refreshToken: string) {
    const matchedUser = await this.usersService.findUserByRefreshToken(refreshToken);

    if (!matchedUser) {
      throw new UnauthorizedException('رمز التحديث غير صالح');
    }

    if (!matchedUser.role) {
      matchedUser.role = UserRole.SUPER_ADMIN;
      await matchedUser.save();
    }

    const tokens = await this.createTokenPair(matchedUser);

    return {
      ...tokens,
      user: this.usersService.toPublicUser(matchedUser),
    };
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshTokenHash(userId, undefined);
    return { message: 'تم تسجيل الخروج بنجاح' };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }

    if (!user.role) {
      user.role = UserRole.SUPER_ADMIN;
      await user.save();
    }

    return this.usersService.toPublicUser(user);
  }

  async createAdmin(dto: CreateAdminDto) {
    const userCount = await this.usersService.countUsers();
    const user = await this.usersService.create({
      username: dto.username,
      password: dto.password,
      name: dto.name,
      role:
        userCount === 0
          ? UserRole.SUPER_ADMIN
          : dto.role || UserRole.ADMIN,
    });

    return this.usersService.toPublicUser(user);
  }
}
