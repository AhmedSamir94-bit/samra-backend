import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role';
import { CustomersService } from './customers.service';
import { CreateGuestSessionDto } from './dto/guest-session.dto';

@ApiTags('Customer')
@Controller('customer')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Public()
  @Post('session')
  @ApiOperation({ summary: 'Create guest session (name + phone + address)' })
  createSession(@Body() dto: CreateGuestSessionDto) {
    return this.customersService.createSession(dto);
  }

  @Get('session')
  @ApiBearerAuth('access-token')
  @Roles(UserRole.GUEST)
  @ApiOperation({ summary: 'Get current guest session' })
  getSession(@CurrentUser() user: AuthUser) {
    return this.customersService.getSession(user.userId);
  }
}
