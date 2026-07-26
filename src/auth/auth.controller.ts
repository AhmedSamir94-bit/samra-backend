import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser, AuthUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { CreateAdminGuard } from './guards/create-admin.guard';
import {
  createAdminRequestExample,
  createAdminResponseExample,
  loginRequestExample,
  loginResponseExample,
  logoutResponseExample,
  meResponseExample,
  refreshRequestExample,
} from '../swagger/examples/auth.examples';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login and receive JWT tokens' })
  @ApiBody({ type: LoginDto, examples: { default: { value: loginRequestExample } } })
  @ApiOkResponse({ schema: { example: loginResponseExample } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshDto, examples: { default: { value: refreshRequestExample } } })
  @ApiOkResponse({ schema: { example: loginResponseExample } })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiOkResponse({ schema: { example: logoutResponseExample } })
  logout(@CurrentUser() user: AuthUser) {
    return this.authService.logout(user.userId);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({ schema: { example: meResponseExample } })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.userId);
  }

  @Public()
  @UseGuards(CreateAdminGuard)
  @Post('admins')
  @ApiBearerAuth('access-token')
  @ApiSecurity('admin-setup-key')
  @ApiOperation({
    summary: 'Create admin user',
    description:
      'Allowed when no users exist, or with x-admin-setup-key, or with a valid JWT.',
  })
  @ApiBody({
    type: CreateAdminDto,
    examples: { default: { value: createAdminRequestExample } },
  })
  @ApiOkResponse({ schema: { example: createAdminResponseExample } })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.authService.createAdmin(dto);
  }
}
