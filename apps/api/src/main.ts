import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './common/uploads.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const corsRaw =
    process.env.CORS_ORIGIN ??
    'http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173';
  const corsOrigins = corsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length <= 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' });
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API on http://localhost:${port} | uploads at ${join(UPLOADS_DIR)}`);
}
bootstrap();
