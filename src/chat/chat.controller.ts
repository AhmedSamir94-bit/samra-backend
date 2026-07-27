import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Customer Chat')
@ApiBearerAuth('access-token')
@Controller('customer/chat')
@Roles(UserRole.GUEST)
export class CustomerChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':orderId')
  @ApiOperation({ summary: 'Get chat thread for an order' })
  async thread(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    const order = await this.chatService.assertGuestAccess(orderId, user.userId);
    const conversation = await this.chatService.getOrCreateConversation(order);
    const messages = await this.chatService.getMessages(orderId);
    await this.chatService.markRead(orderId, UserRole.GUEST);
    return { conversation, messages };
  }

  @Post(':orderId')
  @ApiOperation({ summary: 'Send a chat message' })
  async send(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: SendMessageDto,
  ) {
    const order = await this.chatService.assertGuestAccess(orderId, user.userId);
    return this.chatService.sendMessage({
      orderId,
      senderId: user.userId,
      senderRole: UserRole.GUEST,
      text: dto.text,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      guestSessionId: order.guestSessionId.toString(),
    });
  }
}

@ApiTags('Staff Chat')
@ApiBearerAuth('access-token')
@Controller('staff/chat')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class StaffChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List order chat conversations' })
  conversations() {
    return this.chatService.listConversations();
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get chat thread for an order' })
  async thread(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    const messages = await this.chatService.getMessages(orderId);
    await this.chatService.markRead(orderId, user.role);
    return { messages };
  }

  @Post(':orderId')
  @ApiOperation({ summary: 'Send a chat message to customer' })
  send(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage({
      orderId,
      senderId: user.userId,
      senderRole: user.role,
      text: dto.text,
    });
  }
}
