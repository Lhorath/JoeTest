import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import helmet from "helmet";
import { createLogger } from "@platform/logger";
import { APP_PORTS } from "@platform/config";
import { validateApiEnv } from "@platform/validation";

async function bootstrap() {
  const logger = createLogger("api");

  // Validate environment variables on startup. Fail early if invalid.
  try {
    validateApiEnv(process.env);
    logger.info("✅ Environment configuration successfully validated");
  } catch (error: any) {
    logger.error(
      "❌ Failed to start API: Environment validation failed",
      error,
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: {
      log: (msg) => logger.info(msg),
      error: (msg, stack) => logger.error(msg, new Error(stack || "")),
      warn: (msg) => logger.warn(msg),
      debug: (msg) => logger.debug(msg),
      verbose: (msg) => logger.trace(msg),
    },
  });

  // 1. Security Headers & CORS (Using an explicit environment-defined allowlist)
  app.use(helmet());

  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",")
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
      ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Accept, Authorization, x-request-id",
  });

  // 2. Global Request Context / Request ID Middleware
  app.use((req: any, res: any, next: () => void) => {
    const requestId =
      req.headers["x-request-id"] ||
      req.headers["x-correlation-id"] ||
      Math.random().toString(36).substring(2, 15);
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  // 3. API URI Versioning (e.g. /api/v1/...)
  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  // 4. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 5. Swagger / OpenAPI Documentation (Disabled outside of non-production or unless explicitly configured)
  const enableSwagger =
    process.env.ENABLE_SWAGGER === "true" ||
    process.env.NODE_ENV !== "production";
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle("TheQueue API")
      .setDescription(
        "Production-grade Backend API documentation for TheQueue platform",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
    logger.info(
      `Swagger documentation initialized at http://localhost:${APP_PORTS.api}/docs`,
    );
  }

  // 6. Graceful Shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || APP_PORTS.api;
  await app.listen(port);
  logger.info(`🚀 TheQueue API backend successfully listening on port ${port}`);
}

bootstrap();
