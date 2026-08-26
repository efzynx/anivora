import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('ANIVORA_API');
  const app = await NestFactory.create(AppModule);

  // Set global API prefix matching docs/API.md (/api/v1)
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix.replace(/^\/+/, ''));

  // Global validation and error transforms
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enforce standard response envelope and error schemas
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS for dev/web tooling
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 ANIVORA REST API is running on http://localhost:${port}/${apiPrefix.replace(/^\/+/, '')}`);
  logger.log(`🩺 Healthcheck available at: http://localhost:${port}/${apiPrefix.replace(/^\/+/, '')}/health`);
}

bootstrap();
