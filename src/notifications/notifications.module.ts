import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { StockAlertService } from './stock-alert.service';
import { WhatsappWebClientService } from './whatsapp-web.client';
import { WhatsappService } from './whatsapp.service';

@Module({
  controllers: [NotificationsController],
  providers: [WhatsappWebClientService, WhatsappService, StockAlertService],
  exports: [StockAlertService, WhatsappService],
})
export class NotificationsModule {}
