import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  ADMIN_ROOM,
  NotificationsService,
  userRoom,
} from './notifications.service';

/**
 * Authenticated push channel for notifications, on its own namespace so it
 * shares nothing with the public chat socket.
 *
 * A client connects with `io(API + '/notify', { auth: { token } })`. The token
 * is the same JWT the REST API uses; without a valid one the socket is
 * dropped. Customers join only their own room, admins also join the team
 * room, so no client can receive anything addressed to someone else.
 */
@WebSocketGateway({
  namespace: '/notify',
  cors: { origin: true, credentials: true },
})
export class NotifyGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(NotifyGateway.name);

  @WebSocketServer() server: Server;

  constructor(
    private jwt: JwtService,
    private notifications: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.notifications.attach(server);
  }

  async handleConnection(socket: Socket) {
    const token = String(socket.handshake.auth?.token ?? '').replace(
      /^Bearer\s+/i,
      '',
    );
    try {
      const claims = await this.jwt.verifyAsync<{ id: string; role: string }>(
        token,
      );
      const data = socket.data as { userId?: string; role?: string };
      data.userId = claims.id;
      data.role = claims.role;
      await socket.join(userRoom(claims.id));
      if (claims.role === 'admin') await socket.join(ADMIN_ROOM);
      socket.emit('ready', { role: claims.role });
    } catch {
      socket.emit('unauthorized', {
        message: 'Sign in again to receive notifications.',
      });
      socket.disconnect(true);
      this.logger.debug('Rejected unauthenticated notify socket');
    }
  }
}
