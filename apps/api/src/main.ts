import "reflect-metadata";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import express from "express";
import { AppModule } from "./app.module";

function parseCorsOrigins() {
  const configuredOrigins = (
    process.env.CORS_ORIGINS ??
    process.env.APP_BASE_URL ??
    ""
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return process.env.NODE_ENV === "production" ? false : true;
}

function resolveBodyLimit() {
  return process.env.API_JSON_BODY_LIMIT?.trim() || "80mb";
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    cors: {
      origin: parseCorsOrigins(),
      credentials: true
    }
  });
  app.enableShutdownHooks();
  const bodyLimit = resolveBodyLimit();
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
  app.setGlobalPrefix("api");
  app.use(
    "/api/wecom/callback",
    express.text({
      type: ["text/*", "application/xml", "application/*+xml", "*/xml"]
    })
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`Huigui API running on http://localhost:${port}`);
}

bootstrap();
