import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { ApiException } from './common/api-error.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Stripe webhook signature verification needs the raw request body.
    rawBody: true,
  });

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Field-level errors → error.details: [{field, message}]
      exceptionFactory: (errors) =>
        new ApiException(
          400,
          'VALIDATION_ERROR',
          'Validation failed',
          errors.flatMap((error) =>
            Object.values(error.constraints ?? {}).map((message) => ({
              field: error.property,
              message,
            })),
          ),
        ),
    }),
  );

  // All API routes live under /api/v1 — except the root landing page.
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  const allowedOrigins = (
    process.env.CLIENT_URL ??
    process.env.CLIENT_ORIGIN ??
    'http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: allowedOrigins,
  });

  await app.listen(Number(process.env.PORT) || 5000);
}
await bootstrap();
