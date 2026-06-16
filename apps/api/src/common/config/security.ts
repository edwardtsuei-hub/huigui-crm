import { ConfigService } from "@nestjs/config";

const developmentJwtSecret = "dev-secret";

export function getJwtSecret(configService: ConfigService) {
  const secret = configService.get<string>("JWT_SECRET")?.trim();
  const isProduction = configService.get<string>("NODE_ENV") === "production";

  if (!secret) {
    if (isProduction) {
      throw new Error("JWT_SECRET must be configured in production");
    }

    return developmentJwtSecret;
  }

  if (isProduction && (secret === developmentJwtSecret || secret.length < 32)) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }

  return secret;
}
