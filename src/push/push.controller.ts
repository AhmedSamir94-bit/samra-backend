import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role';
import {
  MarkInboxReadDto,
  SavePushSubscriptionDto,
  UnsubscribePushDto,
} from './dto/push.dto';
import { PushService } from './push.service';

@ApiTags('Push')
@Controller()
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Public()
  @Get('push/vapid-public-key')
  @ApiOperation({ summary: 'VAPID public key for browser push' })
  vapidKey() {
    return {
      publicKey: this.pushService.getPublicKey(),
      enabled: this.pushService.isEnabled(),
    };
  }

  @Post('customer/push/subscribe')
  @ApiBearerAuth('access-token')
  @ApiTags('Customer Push')
  @Roles(UserRole.GUEST)
  @ApiOperation({ summary: 'Save customer push subscription' })
  async subscribeCustomer(
    @CurrentUser() user: AuthUser,
    @Body() dto: SavePushSubscriptionDto,
  ) {
    const sub = await this.pushService.saveSubscription(
      user.userId,
      dto,
      'CUSTOMER',
    );
    const confirmationSent = await this.pushService.notifyUser(
      user.userId,
      {
        title: 'تم تفعيل الإشعارات',
        body: 'ستصلك تحديثات طلباتك هنا',
        url: '/orders',
        tag: `push-welcome-${Date.now()}`,
      },
      { skipInbox: true },
    );
    return { id: String(sub._id), confirmationSent };
  }

  @Delete('customer/push/subscribe')
  @ApiBearerAuth('access-token')
  @ApiTags('Customer Push')
  @Roles(UserRole.GUEST)
  unsubscribeCustomer(
    @CurrentUser() user: AuthUser,
    @Body() body: UnsubscribePushDto,
  ) {
    return this.pushService.removeSubscription(user.userId, body.endpoint);
  }

  @Get('customer/push/inbox')
  @ApiBearerAuth('access-token')
  @ApiTags('Customer Push')
  @Roles(UserRole.GUEST)
  inboxCustomer(@CurrentUser() user: AuthUser) {
    return this.pushService.listUnreadInbox(user.userId);
  }

  @Post('customer/push/inbox/read')
  @ApiBearerAuth('access-token')
  @ApiTags('Customer Push')
  @Roles(UserRole.GUEST)
  async inboxCustomerRead(
    @CurrentUser() user: AuthUser,
    @Body() body: MarkInboxReadDto,
  ) {
    const modified = await this.pushService.markInboxRead(
      user.userId,
      body.ids,
    );
    return { modified };
  }

  @Post('staff/push/subscribe')
  @ApiBearerAuth('access-token')
  @ApiTags('Staff Push')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Save staff push subscription' })
  async subscribeStaff(
    @CurrentUser() user: AuthUser,
    @Body() dto: SavePushSubscriptionDto,
  ) {
    const sub = await this.pushService.saveSubscription(
      user.userId,
      dto,
      'STAFF',
    );
    const confirmationSent = await this.pushService.notifyUser(
      user.userId,
      {
        title: 'تم تفعيل إشعارات الطلبات',
        body: 'ستصلك تنبيهات الطلبات الجديدة',
        url: '/delivery-orders',
        tag: `push-welcome-staff-${Date.now()}`,
      },
      { skipInbox: true },
    );
    return { id: String(sub._id), confirmationSent };
  }

  @Delete('staff/push/subscribe')
  @ApiBearerAuth('access-token')
  @ApiTags('Staff Push')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  unsubscribeStaff(
    @CurrentUser() user: AuthUser,
    @Body() body: UnsubscribePushDto,
  ) {
    return this.pushService.removeSubscription(user.userId, body.endpoint);
  }

  @Get('staff/push/inbox')
  @ApiBearerAuth('access-token')
  @ApiTags('Staff Push')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  inboxStaff(@CurrentUser() user: AuthUser) {
    return this.pushService.listUnreadInbox(user.userId);
  }

  @Post('staff/push/inbox/read')
  @ApiBearerAuth('access-token')
  @ApiTags('Staff Push')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async inboxStaffRead(
    @CurrentUser() user: AuthUser,
    @Body() body: MarkInboxReadDto,
  ) {
    const modified = await this.pushService.markInboxRead(
      user.userId,
      body.ids,
    );
    return { modified };
  }
}
