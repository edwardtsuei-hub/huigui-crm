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
import { getJwtSecret } from "./common/config/security";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { AccessControlService } from "./common/services/access-control.service";
import { ApprovalService } from "./common/services/approval.service";
import { AuditService } from "./common/services/audit.service";
import { CrmRulesService } from "./common/services/crm-rules.service";
import { RecordPartitionService } from "./common/services/record-partition.service";
import { ContractsController } from "./contracts/contracts.controller";
import { ContractsService } from "./contracts/contracts.service";
import {
  CustomerFollowupsController,
  CustomersController
} from "./customers/customers.controller";
import { CustomersService } from "./customers/customers.service";
import { DiscussionsService } from "./discussions/discussions.service";
import { EmployeeLaunchController } from "./employee-launch/employee-launch.controller";
import { EmployeeLaunchService } from "./employee-launch/employee-launch.service";
import {
  PayrollDraftBatchesController,
  SalaryNotifyLogsController,
  SalarySlipsController,
} from "./payroll/payroll.controller";
import { PayrollService } from "./payroll/payroll.service";
import {
  EcotechChannelPartnersController,
  EcotechContractsController,
  EcotechCustomersController,
  EcotechFinanceAccountsController,
  EcotechInspectionsController,
  EcotechOrdersController,
  EcotechProductsController,
  EcotechQuotationsController,
  EcotechWorkspaceController,
} from "./ecotech/ecotech.controller";
import { EcotechService } from "./ecotech/ecotech.service";
import { FilesModule } from "./files/files.module";
import { GeneralQuotesController } from "./general-quotes/general-quotes.controller";
import { GeneralQuotesService } from "./general-quotes/general-quotes.service";
import { InspectionsController } from "./inspections/inspections.controller";
import { InspectionsService } from "./inspections/inspections.service";
import {
  DashboardController,
  IndustryGroupsController,
  IndustrySubgroupsController,
  MetaController
} from "./meta/meta.controller";
import { MetaService } from "./meta/meta.service";
import { ManagementController } from "./management/management.controller";
import { ManagementService } from "./management/management.service";
import { MeetingMinutesController } from "./meeting-minutes/meeting-minutes.controller";
import { MeetingMinutesService } from "./meeting-minutes/meeting-minutes.service";
import { NotificationsController } from "./notifications/notifications.controller";
import { NotificationService } from "./modules/notifications/notification.service";
import { ReminderService } from "./modules/reminders/reminder.service";
import { WecomMessageService } from "./modules/wecom/wecom-message.service";
import { WecomService } from "./modules/wecom/wecom.service";
import { WecomModule } from "./modules/wecom/wecom.module";
import { WecomTokenService } from "./modules/wecom/wecom-token.service";
import {
    ChannelPartnersController,
    FinanceAccountsController,
    OrdersController
} from "./orders/orders.controller";
import { OrdersService } from "./orders/orders.service";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductParserModule } from "./product-parser/product-parser.module";
import { ProductsController } from "./products/products.controller";
import { ProductsService } from "./products/products.service";
import { QuotationsController } from "./quotations/quotations.controller";
import { QuotationsService } from "./quotations/quotations.service";
import { TestBatchesController } from "./test-batches/test-batches.controller";
import { TestBatchesService } from "./test-batches/test-batches.service";
import { TasksController } from "./tasks/tasks.controller";
import { TasksService } from "./tasks/tasks.service";
import { WorkManagementController } from "./work-management/work-management.controller";
import { WorkManagementService } from "./work-management/work-management.service";
import { SettingsController } from "./settings/settings.controller";
import { SettingsService } from "./settings/settings.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
    FilesModule,
    ProductParserModule,
    WecomModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecret(configService),
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
    OrdersController,
    FinanceAccountsController,
    ChannelPartnersController,
    CustomersController,
    CustomerFollowupsController,
    ContractsController,
    ProductsController,
    InspectionsController,
    AgriculturePlansController,
    LegacyAgricultureController,
    GeneralQuotesController,
    QuotationsController,
    TestBatchesController,
    TasksController,
    ManagementController,
    WorkManagementController,
    EmployeeLaunchController,
    SalarySlipsController,
    SalaryNotifyLogsController,
    PayrollDraftBatchesController,
    EcotechWorkspaceController,
    EcotechCustomersController,
    EcotechQuotationsController,
    EcotechProductsController,
    EcotechOrdersController,
    EcotechFinanceAccountsController,
    EcotechChannelPartnersController,
    EcotechContractsController,
    EcotechInspectionsController,
    MeetingMinutesController,
    SettingsController
  ],
  providers: [
    AuthService,
    MetaService,
    ManagementService,
    OrdersService,
    CustomersService,
    ContractsService,
    ProductsService,
    InspectionsService,
    AgriculturePlansService,
    GeneralQuotesService,
    QuotationsService,
    TasksService,
    WorkManagementService,
    EmployeeLaunchService,
    PayrollService,
    EcotechService,
    MeetingMinutesService,
    SettingsService,
    NotificationService,
    DiscussionsService,
    ReminderService,
    WecomTokenService,
    WecomService,
    WecomMessageService,
    RecordPartitionService,
    TestBatchesService,
    AccessControlService,
    ApprovalService,
    AuditService,
    CrmRulesService,
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
