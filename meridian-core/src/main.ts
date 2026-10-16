import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/* Sites allowed to call the API from a browser. Matched on the parsed host,
   never a substring: "localhost.example.com" must not pass as localhost. */
const SITE_HOSTS = ['bellmontexpress.com', 'www.bellmontexpress.com'];

function isAllowedOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const host = url.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (url.protocol !== 'https:') return false;
  if (SITE_HOSTS.includes(host)) return true;
  // The production alias. No wildcard for previews: anyone can create a
  // Vercel project whose URL starts "bellmont-express-". Add a preview to
  // CLIENT_URL when one needs the API.
  if (host === 'bellmont-express.vercel.app') return true;
  return (process.env.CLIENT_URL ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .includes(origin);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      // No Origin header: server-to-server calls, curl, the Android app.
      if (!origin) return cb(null, true);
      cb(null, isAllowedOrigin(origin));
    },
    credentials: true,
  });

  const port = Number(process.env.PORT) || 5000;
  await app.listen(port);
  console.log(`meridian-core listening on :${port}`);
}
void bootstrap();
