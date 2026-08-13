import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed =
        origin.includes('localhost') ||
        origin.includes('meridianv1.com') ||
        (origin.includes('meridian-logistics') && origin.endsWith('.vercel.app')) ||
        (process.env.CLIENT_URL ?? '')
          .split(',')
          .map((s) => s.trim())
          .includes(origin);
      cb(null, allowed);
    },
    credentials: true,
  });

  const port = Number(process.env.PORT) || 5000;
  await app.listen(port);
  console.log(`meridian-core listening on :${port}`);
}
void bootstrap();
