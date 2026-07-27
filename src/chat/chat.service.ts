import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Server } from 'socket.io';
import { UserRole, isStaffRole } from '../users/user-role';
import { PushService } from '../push/push.service';
import { CustomerOrder } from '../orders/schemas/customer-order.schema';
import { ChatMessage } from './schemas/message.schema';
import { Conversation } from './schemas/conversation.schema';

export const STAFF_ROOM = 'staff';
export const orderRoom = (orderId: string) => `order:${orderId}`;
export const orderViewRoom = (orderId: string, side: 'staff' | 'customer') =>
  `view:${side}:${orderId}`;

interface SendMessageInput {
  orderId: string;
  senderId: string;
  senderRole: string;
  text: string;
  customerName?: string;
  orderNumber?: string;
  guestSessionId?: string;
}

function view(doc: { toJSON: () => unknown }): Record<string, unknown> {
  return doc.toJSON() as Record<string, unknown>;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private server: Server | null = null;
  private viewingRooms = new Set<string>();

  constructor(
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessage>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(CustomerOrder.name)
    private readonly orderModel: Model<CustomerOrder>,
    private readonly pushService: PushService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  setViewing(orderId: string, side: 'staff' | 'customer', active: boolean): void {
    const key = `${side}:${orderId}`;
    if (active) this.viewingRooms.add(key);
    else this.viewingRooms.delete(key);
  }

  isViewing(orderId: string, side: 'staff' | 'customer'): boolean {
    return this.viewingRooms.has(`${side}:${orderId}`);
  }

  async getOrCreateConversation(
    order: CustomerOrder & { _id: Types.ObjectId },
  ): Promise<Record<string, unknown>> {
    const orderObjectId = order._id;
    const conversation = await this.conversationModel
      .findOneAndUpdate(
        { orderId: orderObjectId },
        {
          $setOnInsert: {
            orderId: orderObjectId,
            guestSessionId: order.guestSessionId,
            customerName: order.customerName,
            orderNumber: order.orderNumber,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
    return view(conversation!);
  }

  async listConversations(): Promise<Record<string, unknown>[]> {
    const conversations = await this.conversationModel
      .find()
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .exec();
    return conversations.map((c) => view(c));
  }

  async getMessages(orderId: string): Promise<Record<string, unknown>[]> {
    const messages = await this.messageModel
      .find({ orderId: new Types.ObjectId(orderId) })
      .sort({ createdAt: 1 })
      .limit(500)
      .exec();
    return messages.map((m) => view(m));
  }

  async assertGuestAccess(orderId: string, guestSessionId: string) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.guestSessionId.toString() !== guestSessionId) {
      throw new ForbiddenException('ليس لديك صلاحية لهذا الطلب');
    }
    return order;
  }

  async sendMessage(input: SendMessageInput): Promise<Record<string, unknown>> {
    const orderObjectId = new Types.ObjectId(input.orderId);
    const text = input.text.trim();
    const fromCustomer = input.senderRole === UserRole.GUEST;

    const message = await this.messageModel.create({
      orderId: orderObjectId,
      senderId: new Types.ObjectId(input.senderId),
      senderRole: input.senderRole,
      text,
      read: false,
    });

    const update: Record<string, unknown> = {
      lastMessage: text,
      lastMessageAt: new Date(),
      $inc: fromCustomer ? { unreadForStaff: 1 } : { unreadForCustomer: 1 },
    };
    if (input.customerName) update.customerName = input.customerName;
    if (input.orderNumber) update.orderNumber = input.orderNumber;
    if (input.guestSessionId) {
      update.guestSessionId = new Types.ObjectId(input.guestSessionId);
    }

    const conversation = await this.conversationModel
      .findOneAndUpdate({ orderId: orderObjectId }, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
      .exec();

    const messageView = view(message);
    await this.pushToRecipient(input, text, fromCustomer);

    try {
      this.emitMessage(input.orderId, messageView);
      if (conversation) {
        this.emitConversation(input.orderId, view(conversation));
      }
    } catch (err) {
      this.logger.warn(`Chat emit failed: ${(err as Error).message}`);
    }

    return messageView;
  }

  private async pushToRecipient(
    input: SendMessageInput,
    text: string,
    fromCustomer: boolean,
  ): Promise<void> {
    const preview = text.length > 120 ? `${text.slice(0, 117)}…` : text;
    const tag = `chat-${input.orderId}-${Date.now()}`;

    if (fromCustomer) {
      if (this.isViewing(input.orderId, 'staff')) return;
      await this.pushService.notifyStaff({
        title: `رسالة من ${input.customerName || 'عميل'}`,
        body: preview,
        url: '/customer-chat',
        tag,
      });
    } else {
      if (this.isViewing(input.orderId, 'customer')) return;
      const order = await this.orderModel.findById(input.orderId).exec();
      if (!order) return;
      await this.pushService.notifyUser(order.guestSessionId.toString(), {
        title: 'رسالة من المتجر',
        body: preview,
        url: `/orders/${input.orderId}`,
        tag,
      });
    }
  }

  async markRead(orderId: string, readerRole: string): Promise<void> {
    const orderObjectId = new Types.ObjectId(orderId);
    const readerIsStaff = isStaffRole(readerRole);

    await this.messageModel
      .updateMany(
        {
          orderId: orderObjectId,
          senderRole: readerIsStaff ? UserRole.GUEST : { $ne: UserRole.GUEST },
          read: false,
        },
        { read: true },
      )
      .exec();

    const conversation = await this.conversationModel
      .findOneAndUpdate(
        { orderId: orderObjectId },
        readerIsStaff ? { unreadForStaff: 0 } : { unreadForCustomer: 0 },
        { new: true },
      )
      .exec();

    if (conversation) this.emitConversation(orderId, view(conversation));
  }

  private emitMessage(orderId: string, message: Record<string, unknown>): void {
    if (!this.server) return;
    this.server
      .to(orderRoom(orderId))
      .to(STAFF_ROOM)
      .emit('message:new', message);
  }

  private emitConversation(
    orderId: string,
    conversation: Record<string, unknown>,
  ): void {
    if (!this.server) return;
    this.server
      .to(orderRoom(orderId))
      .to(STAFF_ROOM)
      .emit('conversation:update', conversation);
  }
}
