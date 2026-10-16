import { Controller, Get, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ChatModule } from './chat/chat.module';
import { LettersModule } from './letters/letters.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RequestsModule } from './requests/requests.module';
import { DocumentsModule } from './documents/documents.module';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'meridian-core',
      time: new Date().toISOString(),
    };
  }
}

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    AuthModule,
    ShipmentsModule,
    RequestsModule,
    DocumentsModule,
    ReviewsModule,
    ChatModule,
    LettersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
