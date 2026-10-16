import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/* Prisma 7 talks to Postgres through node-postgres (a driver adapter)
   instead of its own engine. The pool keeps Prisma 6's 5-second connect
   timeout: node-postgres's default is to wait forever, which would hang a
   request rather than fail it while Neon wakes up. */
const CONNECT_TIMEOUT_MS = 5_000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
