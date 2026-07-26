import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from './user-role';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@Roles(UserRole.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (super_admin only)' })
  @ApiOkResponse({ description: 'Users list' })
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => this.usersService.toPublicUser(user));
  }

  @Post()
  @ApiOperation({ summary: 'Create user (super_admin only)' })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return this.usersService.toPublicUser(user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user (super_admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(id, dto);
    return this.usersService.toPublicUser(user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete user (super_admin only)' })
  async remove(@Param('id') id: string, @CurrentUser() current: AuthUser) {
    if (current.userId === id) {
      throw new ForbiddenException('لا يمكنك حذف حسابك الحالي');
    }
    await this.usersService.remove(id);
  }
}
