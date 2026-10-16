import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/* Values that have shipped as defaults or placeholders. A token signed with
   any of them can be forged by anyone who has seen this code or a template. */
const KNOWN_PLACEHOLDERS = new Set([
  'dev-secret-change-me',
  'the-generated-value',
  'changeme',
  'change-me',
  'secret',
]);
const MIN_SECRET_LENGTH = 32;

/**
 * The key every sign-in token is signed with. In production a missing, short
 * or placeholder secret stops the server from starting: better a failed
 * deploy than an admin console anyone can forge their way into. Locally a
 * development default keeps things working.
 */
export function resolveJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = (env.JWT_SECRET ?? '').trim();
  if (env.NODE_ENV !== 'production') return secret || 'dev-secret-change-me';
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Set a long random value before starting in production.',
    );
  }
  if (KNOWN_PLACEHOLDERS.has(secret.toLowerCase())) {
    throw new Error(
      'JWT_SECRET is a placeholder value. Replace it with a long random value.',
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`,
    );
  }
  return secret;
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
