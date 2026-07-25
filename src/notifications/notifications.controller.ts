import { Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import {
  whatsappQrResponseExample,
  whatsappStatusResponseExample,
  whatsappTestResponseExample,
} from '../swagger/examples/notification.examples';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private whatsappService: WhatsappService) {}

  @Get('whatsapp/status')
  @ApiOperation({ summary: 'WhatsApp provider status' })
  @ApiOkResponse({ schema: { example: whatsappStatusResponseExample } })
  async whatsappStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('whatsapp/qr')
  @ApiOperation({ summary: 'WhatsApp Web QR (wwebjs provider)' })
  @ApiOkResponse({ schema: { example: whatsappQrResponseExample } })
  async whatsappQr() {
    return this.whatsappService.getWhatsappWebQr();
  }

  @Post('whatsapp/test')
  @ApiOperation({ summary: 'Send a test WhatsApp message to the owner phone' })
  @ApiOkResponse({ schema: { example: whatsappTestResponseExample } })
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
