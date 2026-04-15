import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import {
  AgriculturePlansController,
  LegacyAgricultureController
} from "./agriculture-plans/agriculture-plans.controller";
import { AgriculturePlansService } from "./agriculture-plans/agriculture-plans.service";
import { AppHealthController } from "./health/health.controller";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import {
  CustomerFollowupsController,
  CustomersController
} from "./customers/customers.controller";
import { CustomersService } from "./customers/customers.service";
import { FilesModule } from "./files/files.module";
import { GeneralQuotesController } from "./general-quotes/general-quotes.controller";
import { GeneralQuotesService } from "./general-quotes/general-quotes.service";
import {
  DashboardController,
  IndustryGroupsController,
  IndustrySubgroupsController,
  MetaController
} from "./meta/meta.controller";
import { MetaService } from "./meta/meta.service";
import { NotificationsController } from "./notifications/notifications.controller";
import { NotificationService } from "./modules/notifications/notification.service";
import { ReminderService } from "./modules/reminders/reminder.service";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductParserModule } from "./product-parser/product-parser.module";
import { ProductsController } from "./products/products.controller";
import { ProductsService } from "./products/products.service";
import { QuotationsController } from "./quotations/quotations.controller";
import { QuotationsService } from "./quotations/quotations.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
    FilesModule,
    ProductParserModule,
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
  controllers: [
    AppHealthController,
    AuthController,
    MetaController,
    NotificationsController,
    DashboardController,
    IndustryGroupsController,
    IndustrySubgroupsController,
    CustomersController,
    CustomerFollowupsController,
    ProductsController,
    AgriculturePlansController,
    LegacyAgricultureController,
    GeneralQuotesController,
    QuotationsController
  ],
  providers: [
    AuthService,
    MetaService,
    CustomersService,
    ProductsService,
    AgriculturePlansService,
    GeneralQuotesService,
    QuotationsService,
    NotificationService,
    ReminderService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ]
})
export class AppModule {}
