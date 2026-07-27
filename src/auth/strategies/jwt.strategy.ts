import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../users/user-role';
import { AuthUser } from '../decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  username?: string;
  name: string;
  role?: UserRole;
  phone?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'samra-access-secret-change-me',
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (!payload.sub) {
      throw new UnauthorizedException('رمز الدخول غير صالح');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      name: payload.name,
      role: payload.role || UserRole.SUPER_ADMIN,
      phone: payload.phone,
    };
  }
}
