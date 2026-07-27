import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
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
    const raw = this.config.get<string>('JWT_GUEST_EXPIRES_IN') || '7d';
    if (raw.endsWith('d')) return Number(raw.replace('d', '')) * 86400;
    if (raw.endsWith('h')) return Number(raw.replace('h', '')) * 3600;
    if (raw.endsWith('m')) return Number(raw.replace('m', '')) * 60;
    return Number(raw) || 604800;
  }

  async createSession(dto: CreateGuestSessionDto) {
    const session = await this.sessionModel.create({
      name: dto.name.trim(),
      phone: dto.phone.trim(),
      deliveryAddress: dto.deliveryAddress.trim(),
    });

    const sessionId = session._id.toString();
    const payload = {
      sub: sessionId,
      name: session.name,
      phone: session.phone,
      role: UserRole.GUEST,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.getGuestExpiresInSeconds(),
    });

    return {
      accessToken,
      expiresIn: this.getGuestExpiresInSeconds(),
      session: {
        id: sessionId,
        name: session.name,
        phone: session.phone,
        deliveryAddress: session.deliveryAddress,
      },
    };
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
