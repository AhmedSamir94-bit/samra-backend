import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PushModule } from '../push/push.module';
import {
  CustomerOrder,
  CustomerOrderSchema,
} from '../orders/schemas/customer-order.schema';
import { CustomerChatController, StaffChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/message.schema';

@Module({
  imports: [
    AuthModule,
    PushModule,
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: CustomerOrder.name, schema: CustomerOrderSchema },
    ]),
  ],
  controllers: [CustomerChatController, StaffChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
