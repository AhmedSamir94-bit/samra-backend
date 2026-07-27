import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserRole, isStaffRole } from '../users/user-role';
import {
  ChatService,
  STAFF_ROOM,
  orderRoom,
  orderViewRoom,
} from './chat.service';

interface SocketUser {
  userId: string;
  role: string;
  name?: string;
}

type ChatSocket = Socket & { data: { user?: SocketUser } };

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server): void {
    this.chatService.setServer(server);
    this.logger.log('Chat gateway ready');
  }

  async handleConnection(client: ChatSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('Missing token');

      const payload = this.jwtService.verify<{
        sub: string;
        role?: string;
        name?: string;
      }>(token, {
        secret:
          this.config.get<string>('JWT_ACCESS_SECRET') ||
          'samra-access-secret-change-me',
      });

      const role = payload.role || UserRole.SUPER_ADMIN;
      client.data.user = {
        userId: payload.sub,
        role,
        name: payload.name,
      };

      if (isStaffRole(role)) {
        await client.join(STAFF_ROOM);
      }
    } catch (err) {
      this.logger.warn(`Socket rejected: ${(err as Error).message}`);
      client.emit('chat:error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('order:join')
  async onJoin(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() body: { orderId?: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user || !body?.orderId) return;

    if (user.role === UserRole.GUEST) {
      await this.chatService.assertGuestAccess(body.orderId, user.userId);
    }

    await client.join(orderRoom(body.orderId));
  }

  @SubscribeMessage('chat:view')
  async onView(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() body: { orderId?: string; active?: boolean },
  ): Promise<void> {
    const user = client.data.user;
    if (!user || !body?.orderId) return;

    const side = user.role === UserRole.GUEST ? 'customer' : 'staff';
    const room = orderViewRoom(body.orderId, side);

    if (body.active) {
      await client.join(room);
      this.chatService.setViewing(body.orderId, side, true);
      await this.chatService.markRead(body.orderId, user.role);
    } else {
      await client.leave(room);
      this.chatService.setViewing(body.orderId, side, false);
    }
  }

  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() body: { orderId?: string; isTyping?: boolean },
  ): void {
    const user = client.data.user;
    if (!user || !body?.orderId) return;

    const payload = {
      orderId: body.orderId,
      isTyping: !!body.isTyping,
      role: user.role,
    };

    if (user.role === UserRole.GUEST) {
      this.server.to(STAFF_ROOM).emit('typing', payload);
    } else {
      this.server.to(orderRoom(body.orderId)).emit('typing', payload);
    }
  }

  private extractToken(client: ChatSocket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token;
    const query = client.handshake.query?.token;
    if (typeof query === 'string') return query;
    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return null;
  }
}
