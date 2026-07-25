import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  username: string;
  name: string;
  type?: 'access' | 'refresh';
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

    // Reject refresh tokens used as Bearer access tokens
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('رمز الدخول غير صالح');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      name: payload.name,
    };
  }
}
