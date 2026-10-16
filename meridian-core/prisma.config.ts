/* Prisma CLI configuration (generate, migrate deploy, studio).
 *
 * Prisma 7 no longer reads .env by itself, so it is loaded here; on Render
 * the variables are already in the environment and nothing is overridden.
 *
 * Migrations must use the DIRECT (non-pooled) Neon connection: a pooler
 * can't hold the session-level lock migrate takes. The running app uses the
 * pooled DATABASE_URL instead. Locally, with only DATABASE_URL set, that one
 * is used for both. */
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
