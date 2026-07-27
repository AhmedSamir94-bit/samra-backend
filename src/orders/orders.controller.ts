import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role';
import { OrderStatus } from './order-status';
import { CreateCustomerOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Customer Orders')
@ApiBearerAuth('access-token')
@Controller('customer/orders')
@Roles(UserRole.GUEST)
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place a delivery order' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerOrderDto) {
    return this.ordersService.createForGuest(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my orders' })
  list(@CurrentUser() user: AuthUser) {
    return this.ordersService.listForGuest(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.getForGuest(user.userId, id);
  }
}

@ApiTags('Staff Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class StaffOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all customer orders' })
  list(
    @Query('status') status?: OrderStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ordersService.findAllStaff(status, from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  get(@Param('id') id: string) {
    return this.ordersService.findOneStaff(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark delivered and create sale invoice' })
  complete(@Param('id') id: string) {
    return this.ordersService.updateStatus(id, {
      status: OrderStatus.DELIVERED,
      note: 'تم التسليم',
    });
  }
}
