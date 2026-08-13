import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatBotService } from './chat-bot.service';

/* Event contract is identical to the legacy socket server, so both the
   Meridian chat widget and the admin console connect unchanged. */
@WebSocketGateway({ cors: { origin: true, credentials: true }, maxHttpBufferSize: 8 * 1024 * 1024 })
export class ChatGateway {
  @WebSocketServer() server: Server;

  constructor(
    private prisma: PrismaService,
    private bot: ChatBotService,
  ) {}

  private async saveMessage(
    sessionId: string,
    sender: string,
    message: string,
    quickActions: object[] = [],
  ) {
    return this.prisma.message.create({
      data: {
        sessionId,
        sender,
        message,
        quickActions: quickActions as Prisma.InputJsonValue,
      },
    });
  }

  @SubscribeMessage('joinSession')
  async joinSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    await socket.join(body.sessionId);
    const history = await this.prisma.message.findMany({
      where: { sessionId: body.sessionId },
      orderBy: { timestamp: 'asc' },
      take: 100,
    });
    socket.emit('sessionHistory', { sessionId: body.sessionId, messages: history });
  }

  @SubscribeMessage('adminConnect')
  async adminConnect(@ConnectedSocket() socket: Socket) {
    await socket.join('admin_room');
  }

  @SubscribeMessage('userMessage')
  async userMessage(
    @MessageBody() body: { sessionId: string; message: string },
  ) {
    const { sessionId, message } = body;
    const session = await this.prisma.chatSession.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId },
    });

    const saved = await this.saveMessage(sessionId, 'user', message);
    const wire = { sessionId, sender: 'user', message, timestamp: saved.timestamp };
    this.server.to(sessionId).emit('newMessage', wire);
    this.server.to('admin_room').emit('newMessage', wire);

    if (this.isAttachment(message)) {
      if (session.status === 'bot') {
        const quickActions = [{ label: 'Talk to support', value: 'talk_to_support' }];
        const botMsg = await this.saveMessage(
          sessionId,
          'bot',
          'I received your attachment. A Bellmont Express support agent can review it when you connect to support.',
          quickActions,
        );
        this.server.to(sessionId).emit('botReply', {
          sessionId,
          sender: 'bot',
          message: botMsg.message,
          quickActions,
          timestamp: botMsg.timestamp,
        });
      }
      return;
    }

    if (session.status !== 'bot') return;

    const state = (session.context as { state?: string })?.state ?? 'greeting';
    const reply = await this.bot.process(state, message);

    if (reply.newState === 'escalate_to_human') {
      await this.prisma.chatSession.update({
        where: { sessionId },
        data: { status: 'human', context: { state: 'escalated' } },
      });
      this.server.to('admin_room').emit('sessionUpdate', { sessionId, status: 'human' });
    } else {
      await this.prisma.chatSession.update({
        where: { sessionId },
        data: { context: { state: reply.newState } },
      });
    }

    const botMsg = await this.saveMessage(sessionId, 'bot', reply.message, reply.quickActions);
    const botWire = {
      sessionId,
      sender: 'bot',
      message: reply.message,
      quickActions: reply.quickActions,
      timestamp: botMsg.timestamp,
      status: reply.newState === 'escalate_to_human' ? 'human' : session.status,
    };
    this.server.to(sessionId).emit('botReply', botWire);
    this.server.to('admin_room').emit('newMessage', botWire);
  }

  @SubscribeMessage('adminJoin')
  async adminJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    await socket.join(body.sessionId);
    await this.prisma.chatSession.update({
      where: { sessionId: body.sessionId },
      data: { status: 'human' },
    });
    this.server.to(body.sessionId).emit('adminJoin', { sessionId: body.sessionId });
    this.server.to('admin_room').emit('sessionUpdate', { sessionId: body.sessionId, status: 'human' });
  }

  @SubscribeMessage('adminMessage')
  async adminMessage(
    @MessageBody() body: { sessionId: string; message: string },
  ) {
    const saved = await this.saveMessage(body.sessionId, 'admin', body.message);
    const wire = {
      sessionId: body.sessionId,
      sender: 'admin',
      message: body.message,
      timestamp: saved.timestamp,
    };
    this.server.to(body.sessionId).emit('newMessage', wire);
    this.server.to('admin_room').emit('newMessage', wire);
  }

  @SubscribeMessage('closeSession')
  async closeSession(@MessageBody() body: { sessionId: string }) {
    await this.prisma.chatSession.update({
      where: { sessionId: body.sessionId },
      data: { status: 'closed' },
    });
    this.server.to(body.sessionId).emit('sessionClosed', { sessionId: body.sessionId });
    this.server.to('admin_room').emit('sessionUpdate', { sessionId: body.sessionId, status: 'closed' });
  }

  @SubscribeMessage('typing')
  typing(@ConnectedSocket() socket: Socket, @MessageBody() body: { sessionId: string; sender: string }) {
    socket.to(body.sessionId).emit('typing', body);
  }

  @SubscribeMessage('stopTyping')
  stopTyping(@ConnectedSocket() socket: Socket, @MessageBody() body: { sessionId: string; sender: string }) {
    socket.to(body.sessionId).emit('stopTyping', body);
  }

  private isAttachment(message: string) {
    return message.startsWith('BELLMONT_ATTACHMENT:') || message.startsWith('§ATT§') || message.startsWith('Â§ATTÂ§');
  }
}
