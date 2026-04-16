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
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { AccessControlService } from "./common/services/access-control.service";
import { ApprovalService } from "./common/services/approval.service";
import { AuditService } from "./common/services/audit.service";
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
import { ManagementController } from "./management/management.controller";
import { ManagementService } from "./management/management.service";
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
    ,
    ManagementController
  ],
  providers: [
    AuthService,
    MetaService,
    ManagementService,
    CustomersService,
    ProductsService,
    AgriculturePlansService,
    GeneralQuotesService,
    QuotationsService,
    NotificationService,
    ReminderService,
    AccessControlService,
    ApprovalService,
    AuditService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard
    }
  ]
})
export class AppModule {}
