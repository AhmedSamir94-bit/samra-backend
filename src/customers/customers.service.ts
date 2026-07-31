import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { UserRole } from '../users/user-role';
import { CreateGuestSessionDto } from './dto/guest-session.dto';
import { GuestSession } from './schemas/guest-session.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(GuestSession.name)
    private readonly sessionModel: Model<GuestSession>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private getGuestExpiresInSeconds(): number {
    const raw =
      this.config.get<string>('JWT_GUEST_EXPIRES_IN') ||
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ||
      '15m';
    if (raw.endsWith('d')) return Number(raw.replace('d', '')) * 86400;
    if (raw.endsWith('h')) return Number(raw.replace('h', '')) * 3600;
    if (raw.endsWith('m')) return Number(raw.replace('m', '')) * 60;
    return Number(raw) || 900;
  }

  private async issueTokens(session: GuestSession & { _id: { toString(): string } }) {
    const sessionId = session._id.toString();
    const payload = {
      sub: sessionId,
      name: session.name,
      phone: session.phone,
      role: UserRole.GUEST,
    };

    const expiresIn = this.getGuestExpiresInSeconds();
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn,
    });
    const refreshToken = randomBytes(64).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.sessionModel
      .findByIdAndUpdate(sessionId, { refreshTokenHash })
      .exec();

    return {
      accessToken,
      refreshToken,
      expiresIn,
      session: {
        id: sessionId,
        name: session.name,
        phone: session.phone,
        deliveryAddress: session.deliveryAddress,
      },
    };
  }

  async createSession(dto: CreateGuestSessionDto) {
    const session = await this.sessionModel.create({
      name: dto.name.trim(),
      phone: dto.phone.trim(),
      deliveryAddress: dto.deliveryAddress.trim(),
    });

    return this.issueTokens(session);
  }

  async refresh(refreshToken: string) {
    const matched = await this.findSessionByRefreshToken(refreshToken);
    if (!matched) {
      throw new UnauthorizedException('رمز التحديث غير صالح');
    }
    return this.issueTokens(matched);
  }

  private async findSessionByRefreshToken(refreshToken: string) {
    const candidates = await this.sessionModel
      .find({ refreshTokenHash: { $exists: true, $ne: null } })
      .exec();

    for (const session of candidates) {
      if (
        session.refreshTokenHash &&
        (await bcrypt.compare(refreshToken, session.refreshTokenHash))
      ) {
        return session;
      }
    }
    return null;
  }

  async getSession(sessionId: string) {
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException('الجلسة غير موجودة');
    }
    return {
      id: session._id.toString(),
      name: session.name,
      phone: session.phone,
      deliveryAddress: session.deliveryAddress,
    };
  }

  findById(sessionId: string) {
    return this.sessionModel.findById(sessionId).exec();
  }
}
