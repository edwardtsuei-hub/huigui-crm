import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { AnyPermissions, Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { DAOCHONG_MOBILE_PERMISSIONS } from "./daochong-mobile.permissions";
import { DaochongMobileReadonlyService } from "./daochong-mobile.service";
import {
  CreateDaochongRechargeDto,
  CreateDaochongServiceNoteDto,
  DaochongCustomerCardBalancesReadonlyQueryDto,
  DaochongCustomerPreferencesReadonlyQueryDto,
  DaochongHighRiskReadonlyQueryDto,
  DaochongServiceNotesReadonlyQueryDto,
  DaochongWecomReminderDryRunsReadonlyQueryDto,
  ReturnDaochongRechargeByChengchengDto,
  ReturnDaochongRechargeByLimengDto,
  SendDaochongWecomReminderTestDto,
  UpdateDaochongServiceNoteDto,
} from "./dto/daochong-mobile.dto";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("daochong/mobile")
export class DaochongMobileReadonlyController {
  constructor(
    private readonly daochongReadonlyService: DaochongMobileReadonlyService,
  ) {}

  @Permissions("page.schedule.center")
  @Get("appointments/:appointmentId")
  async getAppointmentDetail(
    @Param("appointmentId") appointmentId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.getAppointmentDetail(appointmentId, req.user);
  }

  @Permissions("page.customers.detail")
  @Get("customer-card-balances")
  async listCustomerCardBalances(
    @Query() query: DaochongCustomerCardBalancesReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listCustomerCardBalances(query, req.user);
  }

  @Permissions("page.finance.payroll")
  @Get("compensation-rules")
  async listCompensationRules(
    @Query() query: DaochongHighRiskReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listHighRiskReadonlyResource("compensation_rules", query, req.user);
  }

  @Permissions("page.customers.detail")
  @Get("service-notes")
  async listServiceNotes(
    @Query() query: DaochongServiceNotesReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listServiceNotes(query, req.user);
  }

  @Permissions("page.customers.detail")
  @Post("service-notes")
  async createServiceNote(
    @Body() body: CreateDaochongServiceNoteDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.createServiceNote(body, req.user);
  }

  @Permissions("page.customers.detail")
  @Patch("service-notes/:serviceNoteId")
  async updateServiceNote(
    @Param("serviceNoteId") serviceNoteId: string,
    @Body() body: UpdateDaochongServiceNoteDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.updateServiceNote(serviceNoteId, body, req.user);
  }

  @Permissions("page.customers.detail")
  @Get("wecom-reminder-dry-runs")
  async listWecomReminderDryRuns(
    @Query() query: DaochongWecomReminderDryRunsReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listWecomReminderDryRuns(query, req.user);
  }

  @Permissions("page.customers.detail")
  @Post("wecom-reminders/send-test")
  async sendWecomReminderTest(
    @Body() body: SendDaochongWecomReminderTestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.sendWecomReminderTest(body, req.user);
  }

  @Permissions("page.customers.detail")
  @Get("customer-preferences")
  async listCustomerPreferences(
    @Query() query: DaochongCustomerPreferencesReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listCustomerPreferences(query, req.user);
  }

  @AnyPermissions("page.customers.detail", DAOCHONG_MOBILE_PERMISSIONS.rechargeReviewRead)
  @Get("recharges")
  async listRecharges(
    @Query() query: DaochongHighRiskReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listHighRiskReadonlyResource("recharges", query, req.user);
  }

  @Permissions("page.customers.detail")
  @Post("recharges")
  async createRecharge(
    @Body() body: CreateDaochongRechargeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.createRecharge(body, req.user);
  }

  @Permissions("page.customers.detail")
  @Patch("recharges/:rechargeId/chengcheng-approval")
  async approveRechargeByChengcheng(
    @Param("rechargeId") rechargeId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.approveRechargeByChengcheng(rechargeId, req.user);
  }

  @Permissions("page.customers.detail")
  @Patch("recharges/:rechargeId/chengcheng-return")
  async returnRechargeByChengcheng(
    @Param("rechargeId") rechargeId: string,
    @Body() body: ReturnDaochongRechargeByChengchengDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.returnRechargeByChengcheng(rechargeId, body, req.user);
  }

  @Permissions(DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReview)
  @Patch("recharges/:rechargeId/limeng-review")
  async reviewRechargeByLimeng(
    @Param("rechargeId") rechargeId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.reviewRechargeByLimeng(rechargeId, req.user);
  }

  @Permissions(DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReturn)
  @Patch("recharges/:rechargeId/limeng-return")
  async returnRechargeByLimeng(
    @Param("rechargeId") rechargeId: string,
    @Body() body: ReturnDaochongRechargeByLimengDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.returnRechargeByLimeng(rechargeId, body, req.user);
  }

  @Permissions("page.customers.detail")
  @Get("evidence-assets")
  async listEvidenceAssets(
    @Query() query: DaochongHighRiskReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listHighRiskReadonlyResource("evidence_assets", query, req.user);
  }

  @Permissions("page.customers.detail")
  @Get("settlement-drafts")
  async listSettlementDrafts(
    @Query() query: DaochongHighRiskReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listHighRiskReadonlyResource("settlement_drafts", query, req.user);
  }

  @Permissions("page.customers.detail")
  @Get("consumption-approvals")
  async listConsumptionApprovals(
    @Query() query: DaochongHighRiskReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listHighRiskReadonlyResource("consumption_approvals", query, req.user);
  }

  @Permissions("page.finance.payroll")
  @Get("finance-summary")
  async listFinanceSummary(
    @Query() query: DaochongHighRiskReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listHighRiskReadonlyResource("finance_summary", query, req.user);
  }

  @Permissions("page.finance.payroll")
  @Get("finance-evidence-exceptions")
  async listFinanceEvidenceExceptions(
    @Query() query: DaochongHighRiskReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listHighRiskReadonlyResource("finance_evidence_exceptions", query, req.user);
  }

  @Permissions("page.finance.payroll")
  @Get("bonus-expense-items")
  async listBonusExpenseItems(
    @Query() query: DaochongHighRiskReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listHighRiskReadonlyResource("bonus_expense_items", query, req.user);
  }

  @Permissions("page.work_management.overview")
  @Get("project-communications")
  async listProjectCommunications(
    @Query() query: DaochongHighRiskReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listHighRiskReadonlyResource("project_communications", query, req.user);
  }

  @Permissions("page.work_management.overview")
  @Get("meeting-notes")
  async listMeetingNotes(
    @Query() query: DaochongHighRiskReadonlyQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.daochongReadonlyService.listHighRiskReadonlyResource("meeting_notes", query, req.user);
  }
}
