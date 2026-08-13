import { Module } from '@nestjs/common';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatBotService } from './chat-bot.service';
import { ChatGateway } from './chat.gateway';
import { AdminGuard } from '../auth/auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private prisma: PrismaService) {}

  @Post('sessions')
  async createSession(@Body() body: { sessionId: string; userName?: string }) {
    const session = await this.prisma.chatSession.upsert({
      where: { sessionId: body.sessionId },
      update: {},
      create: {
        sessionId: body.sessionId,
        userName: body.userName ?? 'Website Visitor',
      },
    });
    return { session };
  }

  @Get('sessions')
  @UseGuards(AdminGuard)
  async listSessions() {
    const sessions = await this.prisma.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return { sessions };
  }

  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const [session, messages] = await Promise.all([
      this.prisma.chatSession.findUnique({ where: { sessionId } }),
      this.prisma.message.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
        take: 200,
      }),
    ]);
    return { session, messages };
  }
}

@Module({
  controllers: [ChatController],
  providers: [ChatGateway, ChatBotService, PrismaService],
})
export class ChatModule {}
