import { Controller, Get, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private whatsappService: WhatsappService) {}

  @Get('whatsapp/status')
  async whatsappStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('whatsapp/qr')
  async whatsappQr() {
    return this.whatsappService.getWhatsappWebQr();
  }

  @Post('whatsapp/test')
  async testWhatsapp() {
    const result = await this.whatsappService.sendTestMessage(
      '✅ Samra POS — WhatsApp test\n\nتم إرسال رسالة تجريبية بنجاح.',
    );

    return {
      ok: true,
      message: 'Test WhatsApp message sent',
      ...result,
    };
  }
}
