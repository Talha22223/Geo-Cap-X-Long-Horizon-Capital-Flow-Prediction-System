/**
 * ============================================================================
 * GEOCAP-X ENTERPRISE API GATEWAY - APPLICATION BOOTSTRAP ENTRY POINT
 * ============================================================================
 * WHAT:
 *   Initializes and launches the NestJS HTTP API Gateway on port 3001 (configurable).
 *   Applies enterprise security middleware (Helmet, CookieParser, CORS whitelist),
 *   URI-based API versioning (/api/v1), global input validation and XSS pipes,
 *   and OpenAPI Swagger documentation (/api/docs).
 *
 * WHY:
 *   Acts as the central gateway connecting the Next.js frontend client to backend
 *   services, PostgreSQL database via Prisma, Redis queues, and the FastAPI AI engine.
 *
 * MODIFICATION GUIDE:
 *   - Change Port: Modify PORT environment variable or line 88 fallback.
 *   - Change CORS: Update CORS_ALLOWED_ORIGINS in .env or modify line 44 below.
 *   - Security Headers: Adjust Helmet CSP directives at line 20 below.
 *   - Global Prefix / Versioning: Configured at lines 60-64.
 * ============================================================================
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLogger } from './common/logger/winston.logger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { XssSanitizationPipe } from './common/pipes/xss-sanitization.pipe';

async function bootstrap() {
  const logger = new CustomLogger();
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  const configService = app.get(ConfigService);

  // Helmet Security Headers with Strict Policies
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'http:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // Cookie Parser Middleware
  app.use(cookieParser());

  // CORS Enablement with Environment-based Whitelist
  const rawCors = configService.get<string>('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001');
  const allowedOrigins = rawCors.split(',').map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
  });

  // Global prefixes and URL-based Versioning (e.g. /api/v1/auth)
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global payload validations & XSS Sanitization
  app.useGlobalPipes(
    new XssSanitizationPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // OpenAPI Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GeoCap-X Enterprise API Gateway')
    .setDescription('Boilerplate specifications for long-horizon prediction system services.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3001);

  await app.listen(port);
  logger.log(`Server bootstrap completed. Running on http://localhost:${port}/api/v1`, 'Bootstrap');
  logger.log(`Swagger OpenAPI docs exposed at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
