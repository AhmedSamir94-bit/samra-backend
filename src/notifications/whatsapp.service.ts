import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeWhatsappPhone } from './phone.util';
import { WhatsappWebClientService } from './whatsapp-web.client';

type WhatsappProvider = 'cloud' | 'greenapi' | 'twilio' | 'wwebjs' | 'console';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private configService: ConfigService,
    private whatsappWebClient: WhatsappWebClientService,
  ) {}

  async onModuleInit() {
    if (!this.isEnabled() || this.getProvider() !== 'greenapi') {
      return;
    }

    try {
      const status = await this.getGreenApiStatus();
      if (status.selfMessaging) {
        this.logger.log(
          `Self-messaging mode: alerts go to your linked WhatsApp (${status.ownerPhone}). ` +
            'Open WhatsApp → "Message yourself" (no sound/popup). Keep .env as 201013816502.',
        );
      }
    } catch (error) {
      this.logger.debug(
        `Could not verify Green API: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private isEnabled() {
    return this.configService.get<string>('WHATSAPP_ENABLED') === 'true';
  }

  private getProvider(): WhatsappProvider {
    const provider = this.configService.get<string>('WHATSAPP_PROVIDER') || 'console';
    return provider as WhatsappProvider;
  }

  private normalizePhone(phone: string) {
    return normalizeWhatsappPhone(phone);
  }

  private getOwnerPhone() {
    const phone = this.configService.get<string>('WHATSAPP_OWNER_PHONE');
    return phone ? this.normalizePhone(phone) : '';
  }

  async sendToOwner(message: string) {
    if (!this.isEnabled()) {
      this.logger.debug(`WhatsApp disabled. Message: ${message}`);
      return;
    }

    const phone = this.getOwnerPhone();
    if (!phone) {
      this.logger.warn('WHATSAPP_OWNER_PHONE is not configured');
      return;
    }

    try {
      await this.sendMessage(phone, message);
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp via ${this.getProvider()}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async sendTestMessage(message: string) {
    if (!this.isEnabled()) {
      throw new Error('WHATSAPP_ENABLED is not true');
    }

    const phone = this.getOwnerPhone();
    if (!phone) {
      throw new Error('WHATSAPP_OWNER_PHONE is not configured');
    }

    const chatId =
      this.getProvider() === 'greenapi'
        ? await this.resolveGreenApiChatId(phone)
        : this.getProvider() === 'wwebjs'
          ? `${phone}@c.us`
          : undefined;

    await this.sendMessage(phone, message);

    const status =
      this.getProvider() === 'greenapi'
        ? await this.getGreenApiStatus()
        : this.getProvider() === 'wwebjs'
          ? await this.getWwebJsStatus()
          : { selfMessaging: false, quotaExceeded: false };

    return {
      phone: `+${phone}`,
      provider: this.getProvider(),
      chatId,
      selfMessaging: 'selfMessaging' in status ? status.selfMessaging : false,
      deliveryHint:
        'deliveryHint' in status ? status.deliveryHint : undefined,
      quotaExceeded:
        'quotaExceeded' in status ? status.quotaExceeded : false,
    };
  }

  async getWhatsappWebQr() {
    if (this.getProvider() !== 'wwebjs') {
      throw new BadRequestException('Set WHATSAPP_PROVIDER=wwebjs to use QR linking');
    }

    const qrDataUrl = await this.whatsappWebClient.getQrDataUrl();
    const status = this.whatsappWebClient.getStatus();

    if (!qrDataUrl) {
      return {
        needsQr: false,
        connected: status.connected,
        linkedPhone: status.linkedPhone,
        message: status.connected
          ? 'WhatsApp Web is already linked'
          : 'QR not ready yet — wait a few seconds and refresh',
      };
    }

    return {
      needsQr: true,
      connected: false,
      qrDataUrl,
      message: 'Scan with WhatsApp → Linked devices → Link a device',
    };
  }

  async getWwebJsStatus() {
    const webStatus = this.whatsappWebClient.getStatus();
    const ownerPhone = this.getOwnerPhone();
    const linkedDigits = webStatus.linkedPhone?.replace(/\D/g, '') ?? '';

    return {
      enabled: this.isEnabled(),
      provider: 'wwebjs' as const,
      ...webStatus,
      ownerPhone: ownerPhone ? `+${ownerPhone}` : null,
      chatIdFormat: ownerPhone ? this.toGreenApiChatId(ownerPhone) : null,
      selfMessaging: Boolean(
        linkedDigits && ownerPhone && this.phonesMatch(linkedDigits, ownerPhone),
      ),
      deliveryHint: webStatus.connected
        ? 'Messages send via whatsapp-web.js using {phone}@c.us'
        : webStatus.needsQr
          ? 'Scan QR at GET /api/notifications/whatsapp/qr'
          : 'WhatsApp Web is starting…',
      quotaExceeded: false,
      quotaDescription: null as string | null,
    };
  }

  async getGreenApiStatus() {
    const ownerPhone = this.getOwnerPhone();
    const linkedPhone = await this.getGreenApiLinkedPhone();
    const { instanceId, apiToken, apiHost } = this.getGreenApiConfig();

    const stateResponse = await fetch(
      `${apiHost}/waInstance${instanceId}/getStateInstance/${apiToken}`,
    );
    const statePayload = (await stateResponse.json()) as {
      stateInstance?: string;
    };

    const selfMessaging = Boolean(
      linkedPhone && ownerPhone && this.phonesMatch(linkedPhone, ownerPhone),
    );

    return {
      enabled: this.isEnabled(),
      provider: this.getProvider(),
      stateInstance: statePayload.stateInstance ?? 'unknown',
      linkedPhone: linkedPhone ? `+${linkedPhone}` : null,
      ownerPhone: ownerPhone ? `+${ownerPhone}` : null,
      selfMessaging,
      chatIdFormat: selfMessaging && ownerPhone ? this.toGreenApiChatId(ownerPhone) : null,
      deliveryHint: selfMessaging
        ? 'WhatsApp → search your number → "Message yourself". No popup notification.'
        : null,
      quotaExceeded: false,
      quotaDescription: null as string | null,
    };
  }

  async getStatus() {
    if (this.getProvider() === 'greenapi') {
      return this.getGreenApiStatus();
    }

    if (this.getProvider() === 'wwebjs') {
      return this.getWwebJsStatus();
    }

    return {
      enabled: this.isEnabled(),
      provider: this.getProvider(),
      ownerPhone: this.getOwnerPhone() ? `+${this.getOwnerPhone()}` : null,
    };
  }

  private async sendMessage(phone: string, message: string) {
    const provider = this.getProvider();

    switch (provider) {
      case 'cloud':
        await this.sendViaCloudApi(phone, message);
        break;
      case 'greenapi':
        await this.sendViaGreenApi(phone, message);
        break;
      case 'twilio':
        await this.sendViaTwilio(phone, message);
        break;
      case 'wwebjs': {
        const result = await this.whatsappWebClient.sendMessage(phone, message);
        this.logger.log(
          `WhatsApp sent via whatsapp-web.js to +${this.normalizePhone(phone)} (${result.chatId}, id: ${result.messageId})`,
        );
        break;
      }
      case 'console':
      default:
        this.logger.log(`[WhatsApp → +${phone}] ${message}`);
        break;
    }
  }

  /** Meta WhatsApp Cloud API — official, free dev tier */
  private async sendViaCloudApi(phone: string, message: string) {
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

    if (!phoneNumberId || !accessToken) {
      throw new Error(
        'Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN (developers.facebook.com)',
      );
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`WhatsApp Cloud API: ${await response.text()}`);
    }
  }

  /** Green API — uses your own WhatsApp (green-api.com) */
  private async getGreenApiLinkedPhone() {
    const instanceId = this.configService.get<string>('GREENAPI_INSTANCE_ID');
    const apiToken = this.configService.get<string>('GREENAPI_API_TOKEN');

    if (!instanceId || !apiToken) {
      return null;
    }

    const apiHost =
      this.configService.get<string>('GREENAPI_API_HOST') ||
      'https://api.green-api.com';

    const response = await fetch(
      `${apiHost}/waInstance${instanceId}/getSettings/${apiToken}`,
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { wid?: string };
    return payload.wid?.replace('@c.us', '').replace(/\D/g, '') || null;
  }

  private phonesMatch(a: string, b: string) {
    const left = this.normalizePhone(a);
    const right = this.normalizePhone(b);

    if (!left || !right) {
      return false;
    }

    if (left === right) {
      return true;
    }

    return left.endsWith(right) || right.endsWith(left);
  }

  private getGreenApiConfig() {
    const instanceId = this.configService.get<string>('GREENAPI_INSTANCE_ID');
    const apiToken = this.configService.get<string>('GREENAPI_API_TOKEN');
    const apiHost =
      this.configService.get<string>('GREENAPI_API_HOST') ||
      'https://api.green-api.com';

    if (!instanceId || !apiToken) {
      throw new Error(
        'Set GREENAPI_INSTANCE_ID and GREENAPI_API_TOKEN (green-api.com)',
      );
    }

    return { instanceId, apiToken, apiHost };
  }

  private toGreenApiChatId(phone: string) {
    return `${this.normalizePhone(phone)}@c.us`;
  }

  private async resolveGreenApiChatId(phone: string) {
    const digits = this.normalizePhone(phone);
    const chatId = `${digits}@c.us`;

    const { instanceId, apiToken, apiHost } = this.getGreenApiConfig();

    const response = await fetch(
      `${apiHost}/waInstance${instanceId}/checkWhatsapp/${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: Number(digits) }),
      },
    );

    const payload = (await response.json()) as {
      existsWhatsapp?: boolean;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(`Green API checkWhatsapp: ${payload.message || JSON.stringify(payload)}`);
    }

    if (!payload.existsWhatsapp) {
      throw new Error(`Green API: +${digits} is not registered on WhatsApp`);
    }

    return chatId;
  }

  private parseGreenApiSendResponse(payload: Record<string, unknown>) {
    const invokeStatus = payload.invokeStatus as
      | { status?: string; description?: string }
      | undefined;
    const correspondentsStatus = payload.correspondentsStatus as
      | { status?: string; description?: string }
      | undefined;

    if (
      invokeStatus?.status?.includes('QUOTE') ||
      correspondentsStatus?.status?.includes('QUOTE')
    ) {
      throw new Error(
        `Green API quota exceeded: ${invokeStatus?.description || correspondentsStatus?.description}. ` +
          'Upgrade your plan at console.green-api.com or use WHATSAPP_OWNER_PHONE set to an allowed correspondent number.',
      );
    }

    const idMessage = payload.idMessage as string | undefined;
    if (!idMessage) {
      throw new Error(`Green API: ${JSON.stringify(payload)}`);
    }

    return idMessage;
  }

  private async sendViaGreenApi(phone: string, message: string) {
    const { instanceId, apiToken, apiHost } = this.getGreenApiConfig();
    const digits = this.normalizePhone(phone);
    const chatId = await this.resolveGreenApiChatId(phone);

    const response = await fetch(
      `${apiHost}/waInstance${instanceId}/sendMessage/${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          message,
        }),
      },
    );

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(
        `Green API: ${(payload.message as string) || JSON.stringify(payload)}`,
      );
    }

    const idMessage = this.parseGreenApiSendResponse(payload);
    const isSelf = this.phonesMatch(
      (await this.getGreenApiLinkedPhone()) ?? '',
      digits,
    );

    this.logger.log(
      `WhatsApp sent via Green API to +${digits} (${chatId}, idMessage: ${idMessage})` +
        (isSelf ? ' — check "Message yourself" chat on your phone' : ''),
    );
  }

  /** Twilio WhatsApp — sandbox or approved business number */
  private async sendViaTwilio(phone: string, message: string) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const from =
      this.configService.get<string>('TWILIO_WHATSAPP_FROM') ||
      'whatsapp:+14155238886';

    if (!accountSid || !authToken) {
      throw new Error(
        'Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN (twilio.com/console)',
      );
    }

    const body = new URLSearchParams({
      From: from,
      To: `whatsapp:+${phone}`,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );

    const payload = (await response.json()) as {
      sid?: string;
      status?: string;
      message?: string;
      code?: number;
    };

    if (!response.ok) {
      throw new Error(
        `Twilio: ${payload.message || JSON.stringify(payload)} (code ${payload.code ?? response.status})`,
      );
    }

    this.logger.log(
      `WhatsApp sent via Twilio to +${phone} (SID: ${payload.sid}, status: ${payload.status})`,
    );
  }


}
