import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../../users/users.service';

@Injectable()
export class CreateAdminGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userCount = await this.usersService.countUsers();

    if (userCount === 0) {
      return true;
    }

    const setupKey = request.headers['x-admin-setup-key'];
    const expectedKey = this.configService.get<string>('ADMIN_SETUP_KEY');

    if (expectedKey && setupKey === expectedKey) {
      return true;
    }

    const result = await super.canActivate(context);
    return result as boolean;
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        'يجب تسجيل الدخول أو إرسال رمز الإعداد (x-admin-setup-key) لإنشاء مستخدم',
      );
    }

    return user;
  }
}
