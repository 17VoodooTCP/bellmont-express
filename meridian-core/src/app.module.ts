import { Controller, Get, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ChatModule } from './chat/chat.module';
import { LettersModule } from './letters/letters.module';

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
  imports: [AuthModule, ShipmentsModule, ReviewsModule, ChatModule, LettersModule],
  controllers: [HealthController],
})
export class AppModule {}
