import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CaratFlow API')
    .setDescription('Jewelry ERP System API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & authorization')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.warn(`CaratFlow API running on http://localhost:${port}`);
  console.warn(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
