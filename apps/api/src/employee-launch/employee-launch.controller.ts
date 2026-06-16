import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { CosStorageService } from "../files/cos-storage.service";
import { WorkManagementService } from "../work-management/work-management.service";
import { EmployeeLaunchService } from "./employee-launch.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller()
export class EmployeeLaunchController {
  constructor(
    private readonly employeeLaunchService: EmployeeLaunchService,
    private readonly workManagementService: WorkManagementService,
    private readonly cosStorageService: CosStorageService,
  ) {}

  @Get("platform/workspace")
  getPlatformWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.buildPlatformWorkspace(req.user);
  }

  @Post("platform/workspace/reset")
  resetPlatformWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.resetPlatformWorkspace(req.user);
  }

  @Patch("platform/workspace")
  updatePlatformWorkspace(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.updatePlatformWorkspace(body, req.user);
  }

  @Get("schedule/workspace")
  getScheduleWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.buildScheduleWorkspace(req.user);
  }

  @Post("schedule/workspace/reset")
  resetScheduleWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.resetScheduleWorkspace(req.user);
  }

  @Get("roster/workspace")
  async getRosterWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.buildRosterWorkspace(req.user);
  }

  @Post("roster/workspace/reset")
  resetRosterWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.resetRosterWorkspace(req.user);
  }

  @Patch("roster/workspace")
  async updateRosterWorkspace(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.updateRosterWorkspace(body, req.user);
  }

  @Post("leave-requests/current/:action")
  mutateCurrentLeaveRequest(
    @Param("action") action: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.mutateCurrentLeaveRequest(action, req.user);
  }

  @Post("attendance-makeup-requests/current/confirm")
  confirmCurrentAttendanceMakeup(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.confirmCurrentAttendanceMakeup(req.user);
  }

  @Post("attendance-periods/current/lock")
  lockCurrentAttendancePeriod(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.lockCurrentAttendancePeriod(req.user);
  }

  @Get("finance/workspace")
  getFinanceWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.buildFinanceWorkspace(req.user);
  }

  @Post(["attachments/cos/presign", "v1/attachments/cos/presign"])
  createAttachmentCosPresign(@Body() body: Record<string, unknown>) {
    const fileName = this.normalizeOptionalText(body.fileName);
    if (!fileName) {
      throw new ServiceUnavailableException("COS 预签名缺少 fileName。");
    }

    return this.cosStorageService.createPhase2AttachmentPresign({
      fileName,
      mimeType: this.normalizeOptionalText(body.mimeType),
      sizeBytes: this.normalizeNumber(body.sizeBytes),
      module: this.normalizeOptionalText(body.module),
      folder: this.normalizeOptionalText(body.folder),
      sha256: this.normalizeOptionalText(body.sha256),
    });
  }

  @Post(["attachments/cos/refresh-read-url", "v1/attachments/cos/refresh-read-url"])
  refreshAttachmentCosReadUrl(@Body() body: Record<string, unknown>) {
    const storageKey = this.normalizeOptionalText(body.storageKey);
    if (!storageKey) {
      throw new ServiceUnavailableException("刷新 COS 读链缺少 storageKey。");
    }

    return this.cosStorageService.refreshPhase2AttachmentReadUrl(storageKey);
  }

  @Post("wecom/finance-approval-sync")
  syncWecomFinanceApprovals(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.syncWecomFinanceApprovals(body, req.user, this.resolvePublicOrigin(req));
  }

  private normalizeOptionalText(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private normalizeNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
  }

  @Post("finance/workspace/reset")
  resetFinanceWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.resetFinanceWorkspace(req.user);
  }

  @Post("financial-import-batches/:id/:action")
  mutateFinancialImportBatch(
    @Param("id") id: string,
    @Param("action") action: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.mutateFinancialImportBatch(id, action, req.user);
  }

  @Post("expense-claims")
  createExpenseClaim(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.createExpenseClaim(body, req.user);
  }

  @Post("expense-claims/:id/attachments")
  linkExpenseClaimAttachment(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.linkExpenseClaimAttachment(id, body, req.user);
  }

  @Post("expense-claims/:id/attachments/:attachmentId/unlink")
  unlinkExpenseClaimAttachment(
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.unlinkExpenseClaimAttachment(id, attachmentId, req.user);
  }

  @Post("expense-claims/:id/:action")
  mutateExpenseClaim(
    @Param("id") id: string,
    @Param("action") action: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.mutateExpenseClaim(id, action, req.user);
  }

  @Post("bank-transactions/:id/:action")
  mutateBankTransaction(
    @Param("id") id: string,
    @Param("action") action: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.mutateBankTransaction(id, action, body, req.user);
  }

  @Post("salary-return-files")
  createSalaryReturnFile(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.createSalaryReturnFile(body, req.user);
  }

  @Post("internal-reports")
  createInternalReport(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.createInternalReport(body, req.user);
  }

  @Post("internal-reports/:id/:action")
  mutateInternalReport(
    @Param("id") id: string,
    @Param("action") action: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.mutateInternalReport(id, action, req.user);
  }

  @Post("statutory-report-jobs")
  createStatutoryReportJob(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.createStatutoryReportJob(body, req.user);
  }

  @Patch("statutory-report-jobs/:id")
  updateStatutoryReportJob(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.updateStatutoryReportJob(id, body, req.user);
  }

  @Post("statutory-report-jobs/:id/:action")
  mutateStatutoryReportJob(
    @Param("id") id: string,
    @Param("action") action: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.mutateStatutoryReportJob(id, action, req.user);
  }

  @Get("daochong/workspace")
  getDaochongWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.buildDaochongWorkspaceWithPayroll(req.user);
  }

  @Post("daochong/workspace/reset")
  resetDaochongWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.resetDaochongWorkspace(req.user);
  }

  @Post("customers/appointments/:id/:action")
  mutateCustomerAppointment(
    @Param("id") id: string,
    @Param("action") action: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.mutateCustomerAppointment(id, action, req.user);
  }

  @Post("customers/payments")
  createCustomerPayment(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.createCustomerPayment(body, req.user);
  }

  @Post("customers/payments/:id/:action")
  mutateCustomerPayment(
    @Param("id") id: string,
    @Param("action") action: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.mutateCustomerPayment(id, action, req.user);
  }

  @Post("customers/recharges")
  createCustomerRecharge(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.createCustomerRecharge(body, req.user);
  }

  @Post("customers/recharges/:id/:action")
  mutateCustomerRecharge(
    @Param("id") id: string,
    @Param("action") action: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.mutateCustomerRecharge(id, action, req.user);
  }

  @Get("courses/workspace")
  getCoursesWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.buildCoursesWorkspace(req.user);
  }

  @Post("courses/workspace/reset")
  resetCoursesWorkspace(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.resetCoursesWorkspace(req.user);
  }

  @Post("courses/readiness/confirm")
  confirmCourseReadiness(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.confirmCourseReadiness(req.user);
  }

  @Post("courses/archive/confirm")
  confirmCourseArchive(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.confirmCourseArchive(req.user);
  }

  @Post("courses/notices/send")
  sendCourseNotices(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.sendCourseNotices(req.user);
  }

  @Post("courses/enrollments/:id/:action")
  mutateCourseEnrollment(
    @Param("id") id: string,
    @Param("action") action: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.mutateCourseEnrollment(id, action, req.user);
  }

  @Post("courses/sessions/:id/bulk-check-in")
  bulkCheckInCourseSession(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.bulkCheckInCourseSession(id, req.user);
  }

  @Post("courses/attendance-export-records")
  createCourseAttendanceExport(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.createCourseAttendanceExport(body, req.user);
  }

  @Post("courses/notice-receipts/:id/confirm")
  confirmCourseNoticeReceipt(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.confirmCourseNoticeReceipt(id, req.user);
  }

  @Post("ocr/tasks")
  createOcrTask(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.createOcrTask(body, req.user);
  }

  @Get("ocr/tasks")
  listOcrTasks(
    @Query() query: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.listOcrTasks(query, req.user);
  }

  @Get("ocr/tasks/:id")
  getOcrTask(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.employeeLaunchService.getOcrTask(id, req.user);
  }

  @Post("ocr/tasks/:id/confirm")
  confirmOcrTask(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.confirmOcrTask(id, body, req.user);
  }

  @Post("wecom/expense-approvals")
  createWecomExpenseApproval(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.createWecomExpenseApproval(body, req.user);
  }

  @Get("wecom/status")
  getWecomStatus(@Req() req: RequestWithUser) {
    return this.employeeLaunchService.getWecomStatus(req.user);
  }

  @Post("wecom/messages")
  sendWecomMessage(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.sendWecomMessage(body, req.user, this.resolvePublicOrigin(req));
  }

  @Post("wecom/reminders")
  sendWecomReminder(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.sendWecomReminder(body, req.user, this.resolvePublicOrigin(req));
  }

  @Post("weekly/workspace/:userKey/reset")
  async resetWeeklyWorkspace(
    @Param("userKey") userKey: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.resetWeeklyWorkspaceDbBridge(userKey, req.user);
  }

  @Get("weekly/workspace/:userKey")
  async getWeeklyWorkspace(
    @Param("userKey") userKey: string,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.getWeeklyWorkspaceDbFirst(userKey, req.user);
  }

  @Patch("weekly/workspace/:userKey")
  async updateWeeklyWorkspace(
    @Param("userKey") userKey: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.updateWeeklyWorkspaceDbBridge(userKey, body, req.user);
  }

  @Post("work-reports/weekly/current/draft")
  saveWeeklyDraft(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.saveWeeklyDraft(body, req.user);
  }

  @Post("work-reports/weekly/current/submit")
  submitWeeklyReport(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.submitWeeklyReport(body, req.user);
  }

  @Post("work-reports/weekly/team/remind")
  remindWeeklyMember(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.remindWeeklyMember(body, req.user);
  }

  @Post("work-reports/weekly/team/batch-review")
  batchReviewWeeklyReports(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeLaunchService.batchReviewWeeklyReports(body, req.user);
  }

  @Public()
  @Post("work-reports/weekly/reminders/run")
  runWeeklyReminderSchedule(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    this.assertWeeklyReminderToken(req);
    return this.employeeLaunchService.runWeeklyReminderSchedule(
      body,
      this.resolvePublicOrigin(req),
    );
  }

  @Public()
  @Post("work-reports/weekly/summaries/run")
  runWeeklySummarySchedule(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    this.assertWeeklySummaryToken(req);
    return this.employeeLaunchService.runWeeklySummarySchedule(
      body,
      this.resolvePublicOrigin(req),
    );
  }

  @Public()
  @Post("work-reports/weekly/personal-summaries/run")
  runWeeklyPersonalSummarySchedule(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    this.assertWeeklySummaryToken(req);
    return this.employeeLaunchService.runWeeklyPersonalSummarySchedule(body);
  }

  private assertWeeklyReminderToken(req: Request) {
    const expected = process.env.WEEKLY_REMINDER_TOKEN?.trim();
    if (!expected) {
      throw new ServiceUnavailableException("周报提醒内部令牌未配置，已停止发送。");
    }

    const headerValue = req.headers["x-weekly-reminder-token"];
    const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const bearer = typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
      : "";
    const token = (provided ?? bearer).trim();
    if (token !== expected) {
      throw new UnauthorizedException("周报提醒内部令牌无效。");
    }
  }

  private assertWeeklySummaryToken(req: Request) {
    const expected = process.env.WEEKLY_SUMMARY_TOKEN?.trim() || process.env.WEEKLY_REMINDER_TOKEN?.trim();
    if (!expected) {
      throw new ServiceUnavailableException("周报汇总内部令牌未配置，已停止发送。");
    }

    const headerValue = req.headers["x-weekly-summary-token"];
    const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const bearer = typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
      : "";
    const token = (provided ?? bearer).trim();
    if (token !== expected) {
      throw new UnauthorizedException("周报汇总内部令牌无效。");
    }
  }

  private resolvePublicOrigin(req: Request) {
    const proto = String(req.headers["x-forwarded-proto"] ?? req.protocol ?? "https")
      .split(",")[0]
      .trim();
    const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "")
      .split(",")[0]
      .trim();

    return host ? `${proto || "https"}://${host}` : undefined;
  }
}
