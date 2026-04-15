import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { WecomController } from "./wecom.controller";
import { WecomAuthService } from "./wecom-auth.service";
import { WecomCalendarService } from "./wecom-calendar.service";
import { WecomMessageService } from "./wecom-message.service";
import { WecomService } from "./wecom.service";
import { WecomTokenService } from "./wecom-token.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") ?? "dev-secret",
        signOptions: {
          expiresIn: "7d"
        }
      })
    })
  ],
  controllers: [WecomController],
  providers: [
    PrismaService,
    WecomTokenService,
    WecomService,
    WecomAuthService,
    WecomMessageService,
    WecomCalendarService
  ],
  exports: [WecomAuthService, WecomCalendarService, WecomMessageService, WecomService]
})
export class WecomModule {}
