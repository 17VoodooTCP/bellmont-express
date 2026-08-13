import { Module } from '@nestjs/common';
import { LettersController } from './letters.controller';
import { LettersService } from './letters.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LettersController],
  providers: [LettersService, PrismaService],
})
export class LettersModule {}
