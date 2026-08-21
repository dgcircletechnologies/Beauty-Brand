import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').map((origin) =>
      origin.trim(),
    ) ?? [
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ],
  });
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3001, process.env.HOST ?? '127.0.0.1');
}
void bootstrap();
