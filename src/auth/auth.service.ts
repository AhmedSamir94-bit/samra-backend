import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
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
  }): Promise<TokenPair> {
    const payload = {
      sub: user._id.toString(),
      username: user.username,
      name: user.name,
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

    const tokens = await this.createTokenPair(user);

    return {
      ...tokens,
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
      },
    };
  }

  async refresh(refreshToken: string) {
    const matchedUser = await this.usersService.findUserByRefreshToken(refreshToken);

    if (!matchedUser) {
      throw new UnauthorizedException('رمز التحديث غير صالح');
    }

    const tokens = await this.createTokenPair(matchedUser);

    return {
      ...tokens,
      user: {
        id: matchedUser._id.toString(),
        username: matchedUser.username,
        name: matchedUser.name,
      },
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

    return {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
    };
  }

  async createAdmin(dto: CreateAdminDto) {
    const user = await this.usersService.create(dto);

    return {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
    };
  }
}
