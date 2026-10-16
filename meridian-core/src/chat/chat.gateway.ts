import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ChatBotService, type BotContext } from './chat-bot.service';
import { SOCKET_SERVER_OPTIONS } from '../common/socket-options';

const MAX_TEXT_LENGTH = 4000;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_MIME =
  /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf)$/;

/** What the server remembers about an agent's socket after adminConnect. */
interface AgentData {
  isAgent?: boolean;
  agentName?: string;
}

/* Event contract is identical to the legacy socket server, so both the
   Meridian chat widget and the admin console connect unchanged. */
@WebSocketGateway(SOCKET_SERVER_OPTIONS)
export class ChatGateway {
  @WebSocketServer() server: Server;

  constructor(
    private prisma: PrismaService,
    private bot: ChatBotService,
    private jwt: JwtService,
  ) {}

  /* Agent actions — joining the agent room, taking over, replying as an
     agent, closing — require a socket that presented an admin token on
     adminConnect. Without this any visitor could read every conversation or
     impersonate the support desk. */
  private isAgent(socket: Socket) {
    if ((socket.data as AgentData).isAgent) return true;
    socket.emit('unauthorized', { message: 'Agent sign-in required.' });
    return false;
  }

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
        quickActions: quickActions,
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
    socket.emit('sessionHistory', {
      sessionId: body.sessionId,
      messages: history,
    });
  }

  @SubscribeMessage('adminConnect')
  async adminConnect(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body?: { agentName?: string; token?: string },
  ) {
    const token = String(
      body?.token ?? socket.handshake.auth?.token ?? '',
    ).replace(/^Bearer\s+/i, '');
    let adminId: string;
    try {
      const claims = await this.jwt.verifyAsync<{ id: string; role: string }>(
        token,
      );
      if (claims.role !== 'admin') throw new Error('not an admin');
      adminId = claims.id;
    } catch {
      socket.emit('unauthorized', { message: 'Agent sign-in required.' });
      return;
    }
    /* Visitors see the agent's real name: the one sent, else the account's. */
    const account = await this.prisma.user
      .findUnique({ where: { id: adminId }, select: { name: true } })
      .catch(() => null);
    const agent = socket.data as AgentData;
    agent.isAgent = true;
    agent.agentName = String(
      body?.agentName ?? account?.name ?? 'Bellmont Express agent',
    )
      .trim()
      .slice(0, 80);
    await socket.join('admin_room');
    socket.emit('agentReady');
  }

  @SubscribeMessage('userMessage')
  async userMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { sessionId: string; message: string },
  ) {
    const { sessionId, message } = body ?? {};
    if (typeof sessionId !== 'string' || !sessionId) return;
    const rejected = this.rejectReason(message);
    if (rejected) return this.refuse(socket, sessionId, rejected);
    const session = await this.prisma.chatSession.upsert({
      where: { sessionId },
      update: { updatedAt: new Date() },
      create: { sessionId },
    });

    const saved = await this.saveMessage(sessionId, 'user', message);
    const wire = {
      sessionId,
      sender: 'user',
      message,
      timestamp: saved.timestamp,
    };
    this.server.to(sessionId).emit('newMessage', wire);
    this.server.to('admin_room').emit('newMessage', wire);

    if (this.isAttachment(message)) {
      if (session.status === 'bot') {
        const quickActions = [
          { label: 'Talk to support', value: 'talk_to_support' },
        ];
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

    const context = (session.context as BotContext | null) ?? {};
    const reply = await this.bot.process(context, message);

    if (reply.newState === 'escalate_to_human') {
      await this.prisma.chatSession.update({
        where: { sessionId },
        data: { status: 'human', context: { state: 'escalated' } },
      });
      this.server
        .to('admin_room')
        .emit('sessionUpdate', { sessionId, status: 'human' });
    } else {
      await this.prisma.chatSession.update({
        where: { sessionId },
        data: { context: reply.newContext },
      });
    }

    const botMsg = await this.saveMessage(
      sessionId,
      'bot',
      reply.message,
      reply.quickActions,
    );
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
    @MessageBody() body: { sessionId: string; agentName?: string },
  ) {
    if (!this.isAgent(socket)) return;
    await socket.join(body.sessionId);
    const agentName = String(
      body.agentName ??
        (socket.data as AgentData).agentName ??
        'Bellmont Express agent',
    )
      .trim()
      .slice(0, 80);
    await this.prisma.chatSession.update({
      where: { sessionId: body.sessionId },
      data: { status: 'human', agentName },
    });
    const joined = await this.saveMessage(
      body.sessionId,
      'system',
      `${agentName} joined the conversation.`,
    );
    const systemWire = {
      sessionId: body.sessionId,
      sender: 'system',
      message: joined.message,
      timestamp: joined.timestamp,
    };
    this.server
      .to(body.sessionId)
      .emit('adminJoin', { sessionId: body.sessionId, agentName });
    this.server.to(body.sessionId).emit('newMessage', systemWire);
    this.server.to('admin_room').emit('newMessage', systemWire);
    this.server.to('admin_room').emit('sessionUpdate', {
      sessionId: body.sessionId,
      status: 'human',
      agentName,
    });
  }

  @SubscribeMessage('adminMessage')
  async adminMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    body: { sessionId: string; message: string; agentName?: string },
  ) {
    if (!this.isAgent(socket)) return;
    const rejected = this.rejectReason(body?.message);
    if (rejected) return this.refuse(socket, body.sessionId, rejected);
    /* Same name the agent signed in with and joined as, so their messages
       aren't labelled differently from "Maya joined the conversation". */
    const agentName = String(
      body.agentName ??
        (socket.data as AgentData).agentName ??
        'Bellmont Express agent',
    )
      .trim()
      .slice(0, 80);
    await this.prisma.chatSession.update({
      where: { sessionId: body.sessionId },
      data: { agentName },
    });
    const saved = await this.saveMessage(body.sessionId, 'admin', body.message);
    const wire = {
      sessionId: body.sessionId,
      sender: 'admin',
      agentName,
      message: body.message,
      timestamp: saved.timestamp,
    };
    this.server.to(body.sessionId).emit('newMessage', wire);
    this.server.to('admin_room').emit('newMessage', wire);
  }

  @SubscribeMessage('closeSession')
  async closeSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { sessionId: string; agentName?: string },
  ) {
    if (!this.isAgent(socket)) return;
    const agentName = String(
      body.agentName ??
        (socket.data as AgentData).agentName ??
        'Bellmont Express agent',
    )
      .trim()
      .slice(0, 80);
    await this.prisma.chatSession.update({
      where: { sessionId: body.sessionId },
      data: { status: 'closed' },
    });
    const closed = await this.saveMessage(
      body.sessionId,
      'system',
      `${agentName} closed this conversation.`,
    );
    const systemWire = {
      sessionId: body.sessionId,
      sender: 'system',
      message: closed.message,
      timestamp: closed.timestamp,
    };
    this.server
      .to(body.sessionId)
      .emit('sessionClosed', { sessionId: body.sessionId });
    this.server.to(body.sessionId).emit('newMessage', systemWire);
    this.server.to('admin_room').emit('newMessage', systemWire);
    this.server.to('admin_room').emit('sessionUpdate', {
      sessionId: body.sessionId,
      status: 'closed',
      agentName,
    });
  }

  /* Typing is relayed to everyone else in the conversation. Visitor typing
     also goes to the admin room, so agents see it in the session list before
     they have taken over; the sessionId tells them which conversation. */
  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    body: { sessionId: string; sender: string; agentName?: string },
  ) {
    const signal = this.typingSignal(socket, body);
    if (!signal) return;
    socket.to(signal.sessionId).emit('typing', signal);
    if (signal.sender === 'user')
      socket.to('admin_room').emit('typing', signal);
  }

  @SubscribeMessage('stopTyping')
  stopTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { sessionId: string; sender: string },
  ) {
    const signal = this.typingSignal(socket, body);
    if (!signal) return;
    socket.to(signal.sessionId).emit('stopTyping', signal);
    if (signal.sender === 'user')
      socket.to('admin_room').emit('stopTyping', signal);
  }

  /* Only the fields the other side needs, and "admin" only from a signed-in
     agent — otherwise a visitor could show "Agent is typing" in any chat. */
  private typingSignal(
    socket: Socket,
    body: { sessionId?: unknown; sender?: unknown } | undefined,
  ) {
    if (typeof body?.sessionId !== 'string' || !body.sessionId) return null;
    const agent = socket.data as AgentData;
    if (body.sender === 'admin') {
      if (!agent.isAgent) return null;
      return {
        sessionId: body.sessionId,
        sender: 'admin',
        agentName: agent.agentName,
      };
    }
    return { sessionId: body.sessionId, sender: 'user' };
  }

  private isAttachment(message: string) {
    return (
      message.startsWith('BELLMONT_ATTACHMENT:') ||
      message.startsWith('§ATT§') ||
      message.startsWith('Â§ATTÂ§')
    );
  }

  /**
   * Why a message can't be stored, or null if it can. Text is capped; an
   * attachment must be a real image or PDF, encoded as base64 of that same
   * type, no bigger than 5 MB. Without this a client could store an HTML or
   * SVG "attachment" that would run script when another person opened it, or
   * fill the database with megabytes of text.
   */
  private rejectReason(message: unknown): string | null {
    if (typeof message !== 'string' || !message.trim()) return 'Empty message.';
    if (!this.isAttachment(message)) {
      return message.length > MAX_TEXT_LENGTH
        ? `Messages are limited to ${MAX_TEXT_LENGTH} characters.`
        : null;
    }
    const prefix =
      ['BELLMONT_ATTACHMENT:', '§ATT§', 'Â§ATTÂ§'].find((p) =>
        message.startsWith(p),
      ) ?? '';
    let att: { name?: unknown; type?: unknown; data?: unknown; size?: unknown };
    try {
      att = JSON.parse(message.slice(prefix.length)) as typeof att;
    } catch {
      return 'That attachment could not be read.';
    }
    const type = typeof att.type === 'string' ? att.type.toLowerCase() : '';
    if (!ATTACHMENT_MIME.test(type))
      return 'Attach a PNG, JPG, GIF, WebP, HEIC or PDF file.';
    if (
      typeof att.name !== 'string' ||
      !att.name.trim() ||
      att.name.length > 200
    )
      return 'That attachment has no valid name.';
    if (typeof att.data !== 'string')
      return 'That attachment could not be read.';
    const head = `data:${type};base64,`;
    if (
      !att.data.toLowerCase().startsWith(head) ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(att.data.slice(head.length))
    ) {
      return 'That attachment could not be read.';
    }
    const bytes = Math.floor(((att.data.length - head.length) * 3) / 4);
    if (bytes > MAX_ATTACHMENT_BYTES)
      return 'Attachments must be 5 MB or smaller.';
    return null;
  }

  /** Tells only the sender why their message was not sent. */
  private refuse(socket: Socket, sessionId: string, reason: string) {
    socket.emit('messageRejected', { sessionId, reason });
  }
}
