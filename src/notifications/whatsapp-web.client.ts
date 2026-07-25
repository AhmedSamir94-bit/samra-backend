import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { normalizeWhatsappPhone } from './phone.util';

type WhatsappWebClient = {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  once: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  initialize: () => Promise<void>;
  destroy: () => Promise<void>;
  sendMessage: (
    chatId: string,
    message: string,
  ) => Promise<{ id: { id: string } }>;
  info?: { wid?: { user?: string } };
};

@Injectable()
export class WhatsappWebClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappWebClientService.name);

  private client: WhatsappWebClient | null = null;
  private ready = false;
  private lastQr: string | null = null;
  private linkedPhone: string | null = null;

  constructor(private configService: ConfigService) {}

  isActive() {
    return (
      this.configService.get<string>('WHATSAPP_ENABLED') === 'true' &&
      this.configService.get<string>('WHATSAPP_PROVIDER') === 'wwebjs'
    );
  }

  async onModuleInit() {
    if (!this.isActive()) {
      return;
    }

    try {
      await this.start();
    } catch (error) {
      this.logger.error(
        `Failed to start whatsapp-web.js: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
    }
  }

  private async start() {
    const { Client, LocalAuth } = await import('whatsapp-web.js');

    const sessionPath =
      this.configService.get<string>('WHATSAPP_WEB_SESSION_PATH') ||
      '.wwebjs_auth';

    const chromePath =
      this.configService.get<string>('WHATSAPP_WEB_CHROME_PATH') ||
      (process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : undefined);

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...(chromePath ? { executablePath: chromePath } : {}),
      },
    }) as WhatsappWebClient;

    this.client.on('qr', (qr: unknown) => {
      this.lastQr = String(qr);
      this.ready = false;
      this.logger.warn(
        'WhatsApp Web QR required — open GET /api/notifications/whatsapp/qr and scan with your phone',
      );
    });

    this.client.on('ready', () => {
      this.ready = true;
      this.lastQr = null;
      this.linkedPhone = this.client?.info?.wid?.user ?? null;
      this.logger.log(
        `whatsapp-web.js ready${this.linkedPhone ? ` (+${this.linkedPhone})` : ''}`,
      );
    });

    this.client.on('auth_failure', (message: unknown) => {
      this.ready = false;
      this.logger.error(`whatsapp-web.js auth failure: ${message}`);
    });

    this.client.on('disconnected', (reason: unknown) => {
      this.ready = false;
      this.logger.warn(`whatsapp-web.js disconnected: ${reason}`);
    });

    await this.client.initialize();
  }

  getStatus() {
    return {
      connected: this.ready,
      linkedPhone: this.linkedPhone ? `+${this.linkedPhone}` : null,
      needsQr: Boolean(this.lastQr),
      chatIdHint: 'Uses {phone}@c.us — set WHATSAPP_OWNER_PHONE=201013816502',
    };
  }

  getQrCode() {
    return this.lastQr;
  }

  async getQrDataUrl() {
    if (!this.lastQr) {
      return null;
    }

    return QRCode.toDataURL(this.lastQr);
  }

  private waitForReady(timeoutMs: number) {
    return new Promise<void>((resolve, reject) => {
      if (this.ready) {
        resolve();
        return;
      }

      if (!this.client) {
        reject(new Error('whatsapp-web.js client not started'));
        return;
      }

      const timer = setTimeout(() => {
        this.client?.off('ready', onReady);
        reject(
          new Error(
            'WhatsApp Web not ready — scan QR at GET /api/notifications/whatsapp/qr',
          ),
        );
      }, timeoutMs);

      const onReady = () => {
        clearTimeout(timer);
        resolve();
      };

      this.client.once('ready', onReady);
    });
  }

  async sendMessage(phone: string, message: string) {
    if (!this.client) {
      throw new Error(
        'whatsapp-web.js not started — set WHATSAPP_PROVIDER=wwebjs and restart',
      );
    }

    if (!this.ready) {
      if (this.lastQr) {
        throw new Error(
          'WhatsApp Web not linked — scan QR at GET /api/notifications/whatsapp/qr',
        );
      }

      await this.waitForReady(60_000);
    }

    const digits = normalizeWhatsappPhone(phone);
    const chatId = `${digits}@c.us`;
    const result = await this.client.sendMessage(chatId, message);

    return {
      chatId,
      messageId: result.id.id,
    };
  }
}
