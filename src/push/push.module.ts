import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { AppNotification, AppNotificationSchema } from './schemas/app-notification.schema';
import {
  PushSubscriptionEntity,
  PushSubscriptionSchema,
} from './schemas/push-subscription.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: PushSubscriptionEntity.name, schema: PushSubscriptionSchema },
      { name: AppNotification.name, schema: AppNotificationSchema },
    ]),
  ],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
