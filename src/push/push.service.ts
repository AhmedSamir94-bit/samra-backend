import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as webpush from 'web-push';
import { UsersService } from '../users/users.service';
import {
  PushSubscriptionEntity,
  PushSubscriptionDocument,
} from './schemas/push-subscription.schema';
import { AppNotification } from './schemas/app-notification.schema';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    @InjectModel(PushSubscriptionEntity.name)
    private readonly subModel: Model<PushSubscriptionEntity>,
    @InjectModel(AppNotification.name)
    private readonly notifModel: Model<AppNotification>,
  ) {}

  onModuleInit(): void {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const subject = (
      this.config.get<string>('VAPID_SUBJECT') || 'mailto:admin@samra.com'
    ).trim();

    if (!publicKey || !privateKey) {
      this.logger.warn('[push] VAPID keys missing — push disabled');
      return;
    }

    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
      this.logger.log('[push] VAPID configured');
    } catch (err) {
      this.enabled = false;
      this.logger.error(`[push] VAPID setup failed: ${(err as Error).message}`);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY', '').trim();
  }

  async saveSubscription(
    userId: string,
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
    audience: 'CUSTOMER' | 'STAFF' = 'STAFF',
  ): Promise<PushSubscriptionDocument> {
    const p256dh = this.normalizeKey(subscription.keys?.p256dh);
    const auth = this.normalizeKey(subscription.keys?.auth);
    if (!subscription.endpoint?.startsWith('https://')) {
      throw new BadRequestException('Invalid push endpoint');
    }
    if (p256dh.length < 80 || auth.length < 20) {
      throw new BadRequestException('Invalid push keys');
    }

    return (await this.subModel
      .findOneAndUpdate(
        { endpoint: subscription.endpoint },
        {
          userId: new Types.ObjectId(userId),
          endpoint: subscription.endpoint,
          keys: { p256dh, auth },
          audience,
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .exec()) as PushSubscriptionDocument;
  }

  async removeSubscription(userId: string, endpoint?: string): Promise<void> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (endpoint) filter.endpoint = endpoint;
    await this.subModel.deleteMany(filter).exec();
  }

  async notifyUser(
    userId: string,
    payload: PushPayload,
    opts?: { skipInbox?: boolean },
  ): Promise<number> {
    if (!opts?.skipInbox) {
      await this.enqueueForUsers([userId], payload);
    }
    if (!this.enabled) return 0;

    const subs = await this.subModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();
    if (!subs.length) return 0;

    const { sent } = await this.sendToSubs(subs, payload);
    return sent;
  }

  async notifyStaff(payload: PushPayload): Promise<number> {
    const staffIds = await this.usersService.findAllStaffIds();
    await this.enqueueForUsers(staffIds, payload);

    if (!this.enabled) return 0;

    const subs = await this.subModel.find({ audience: 'STAFF' }).exec();
    if (!subs.length) return 0;

    const { sent } = await this.sendToSubs(subs, payload);
    return sent;
  }

  async listUnreadInbox(
    userId: string,
    limit = 20,
  ): Promise<
    Array<{
      id: string;
      title: string;
      body: string;
      url: string;
      tag: string;
      createdAt?: string;
    }>
  > {
    const rows = await this.notifModel
      .find({ userId: new Types.ObjectId(userId), read: false })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 50))
      .lean()
      .exec();

    return rows.map((row) => {
      const createdAt = (row as { createdAt?: Date }).createdAt;
      return {
        id: String(row._id),
        title: String(row.title ?? ''),
        body: String(row.body ?? ''),
        url: String(row.url ?? '/'),
        tag: String(row.tag ?? 'samra'),
        createdAt:
          createdAt instanceof Date ? createdAt.toISOString() : undefined,
      };
    });
  }

  async markInboxRead(userId: string, ids?: string[]): Promise<number> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      read: false,
    };
    if (ids?.length) {
      filter._id = {
        $in: ids
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id)),
      };
    }
    const res = await this.notifModel.updateMany(filter, { read: true }).exec();
    return res.modifiedCount ?? 0;
  }

  private async enqueueForUsers(
    userIds: string[],
    payload: PushPayload,
  ): Promise<void> {
    const unique = [
      ...new Set(
        userIds
          .map((id) => id.trim())
          .filter((id) => Types.ObjectId.isValid(id)),
      ),
    ];
    if (!unique.length) return;

    try {
      await this.notifModel.insertMany(
        unique.map((id) => ({
          userId: new Types.ObjectId(id),
          title: payload.title,
          body: payload.body,
          url: payload.url || '/',
          tag: payload.tag || `samra-${Date.now()}`,
          read: false,
        })),
        { ordered: false },
      );
    } catch (err) {
      this.logger.warn(`[push] inbox enqueue failed: ${(err as Error).message}`);
    }
  }

  private async sendToSubs(
    subs: PushSubscriptionDocument[],
    payload: PushPayload,
  ): Promise<{ sent: number; failed: number }> {
    const body = JSON.stringify({
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: payload.tag || `samra-${Date.now()}`,
        renotify: true,
        requireInteraction: true,
        data: { url: payload.url || '/' },
      },
      title: payload.title,
      body: payload.body,
    });

    let sent = 0;
    let failed = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            },
            body,
            { TTL: 3600, urgency: 'high' },
          );
          sent += 1;
        } catch (err: unknown) {
          failed += 1;
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await this.subModel.deleteOne({ _id: sub._id }).exec();
          }
        }
      }),
    );
    return { sent, failed };
  }

  private normalizeKey(value: string | undefined): string {
    return String(value ?? '')
      .trim()
      .replace(/ /g, '+');
  }
}
