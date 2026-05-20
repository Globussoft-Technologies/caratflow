import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { LoggingInterceptor } from './common/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Hide framework fingerprint (D-045)
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance?.() as
    | { disable?: (k: string) => void; use?: (fn: unknown) => void }
    | undefined;
  if (instance?.disable) instance.disable('x-powered-by');

  // Security headers (D-038)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Swagger UI inlines scripts; CSP is enforced on the storefront origin
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Customer-Id', 'X-Session-Id'],
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

  // Global exception filter — formats unhandled errors as ApiResponse (D-039)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Request/response logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // API prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // Swagger — gated in production unless SWAGGER_ENABLED=true (D-026).
  // When enabled in production, require basic auth via SWAGGER_USER/SWAGGER_PASSWORD.
  const isProd = process.env.NODE_ENV === 'production';
  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true' || !isProd;
  if (swaggerEnabled) {
    if (isProd) {
      const swaggerUser = process.env.SWAGGER_USER;
      const swaggerPassword = process.env.SWAGGER_PASSWORD;
      if (!swaggerUser || !swaggerPassword) {
        console.warn(
          '[CARATFLOW] SWAGGER_ENABLED=true in production but SWAGGER_USER/SWAGGER_PASSWORD are not set — refusing to expose docs',
        );
      } else {
        app.use(['/api/docs', '/api/docs-json'], (req: Request, res: Response, next: NextFunction) => {
          const header = req.headers.authorization;
          if (!header || !header.startsWith('Basic ')) {
            res.set('WWW-Authenticate', 'Basic realm="CaratFlow API Docs"');
            res.status(401).send('Authentication required');
            return;
          }
          const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
          const sepIdx = decoded.indexOf(':');
          const name = sepIdx >= 0 ? decoded.slice(0, sepIdx) : '';
          const pass = sepIdx >= 0 ? decoded.slice(sepIdx + 1) : '';
          if (name !== swaggerUser || pass !== swaggerPassword) {
            res.set('WWW-Authenticate', 'Basic realm="CaratFlow API Docs"');
            res.status(401).send('Authentication required');
            return;
          }
          next();
        });
        mountSwagger(app);
      }
    } else {
      mountSwagger(app);
    }
  }

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.warn(`CaratFlow API running on http://localhost:${port}`);
  if (swaggerEnabled) {
    console.warn(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}

function mountSwagger(app: INestApplication): void {
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
}

bootstrap();
