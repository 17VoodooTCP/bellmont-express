import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/* One client for the whole API. Each feature module used to list
   PrismaService in its own providers, which gave every module a separate
   client and connection pool — on a free-tier database every connection
   counts. Global, so modules inject it without importing anything. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
