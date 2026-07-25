import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginDto } from './dto/login.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AccessJwtPayload {
  sub: string;
  username: string;
  name: string;
  type: 'access';
}

interface RefreshJwtPayload {
  sub: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private getAccessSecret() {
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'samra-access-secret-change-me'
    );
  }

  private getRefreshSecret() {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'samra-refresh-secret-change-me'
    );
  }

  private getAccessExpiresIn() {
    return this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
  }

  private getRefreshExpiresIn() {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  private getAccessExpiresInSeconds() {
    const expiresIn = this.getAccessExpiresIn();
    if (expiresIn.endsWith('m')) {
      return Number(expiresIn.replace('m', '')) * 60;
    }
    if (expiresIn.endsWith('h')) {
      return Number(expiresIn.replace('h', '')) * 3600;
    }
    if (expiresIn.endsWith('d')) {
      return Number(expiresIn.replace('d', '')) * 86400;
    }
    return Number(expiresIn) || 900;
  }

  private async createTokenPair(user: {
    _id: { toString(): string };
    username: string;
    name: string;
  }): Promise<TokenPair> {
    const userId = user._id.toString();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        username: user.username,
        name: user.name,
        type: 'access',
      } satisfies AccessJwtPayload,
      {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessExpiresIn() as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        type: 'refresh',
      } satisfies RefreshJwtPayload,
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpiresIn() as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshTokenHash(userId, refreshTokenHash);

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
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException('رمز التحديث مطلوب');
    }

    let payload: RefreshJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(
        refreshToken,
        { secret: this.getRefreshSecret() },
      );
    } catch {
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي');
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('رمز التحديث غير صالح');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('رمز التحديث غير صالح');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      // Token was rotated or user logged out
      throw new UnauthorizedException('رمز التحديث غير صالح');
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
