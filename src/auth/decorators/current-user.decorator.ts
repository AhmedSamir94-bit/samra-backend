import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../users/user-role';

export interface AuthUser {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
