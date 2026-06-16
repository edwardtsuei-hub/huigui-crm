import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import {
  CreateDiscussionCommentDto,
  UpdateDiscussionCommentDto,
} from "../discussions/dto/discussion.dto";
import { DiscussionsService } from "../discussions/discussions.service";
import {
  CreateMonthlyGoalDraftDto,
  CreateWeeklyReportDraftDto,
  DeriveWeeklyReportTasksDto,
  GenerateMonthlyGoalAiSummaryDto,
  RemindWeeklyReportsDto,
  ReviewWeeklyReportDto,
  UpdateWeeklyPublicDigestDto,
  UpdateMonthlyGoalDto,
  UpdateWeeklyReportDto,
  WeeklyReportArchiveQueryDto,
  WeeklyReportTeamClosureQueryDto,
} from "./dto/work-management.dto";
import { WorkManagementService } from "./work-management.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("work-management")
export class WorkManagementController {
  constructor(
    private readonly workManagementService: WorkManagementService,
    private readonly discussionsService: DiscussionsService,
  ) {}

  @Get("overview")
  @Permissions("page.work_management.overview")
  async overview(@Req() req: RequestWithUser) {
    return this.workManagementService.getOverview(req.user);
  }

  @Get("weekly-reports")
  @Permissions("page.work_management.weekly_reports")
  async listWeeklyReports(@Req() req: RequestWithUser) {
    return this.workManagementService.listWeeklyReports(req.user);
  }

  @Get("weekly-reports/archive")
  @Permissions("page.work_management.weekly_reports")
  async listWeeklyReportArchive(
    @Query() query: WeeklyReportArchiveQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.listWeeklyReportArchive(query, req.user);
  }

  @Get("weekly-reports/team-closure")
  @Permissions("page.work_management.weekly_reports")
  async getWeeklyReportTeamClosure(
    @Query() query: WeeklyReportTeamClosureQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.getWeeklyReportTeamClosure(query, req.user);
  }

  @Post("weekly-reports/remind")
  @Permissions("action.work_management.review")
  async remindWeeklyReports(
    @Body() dto: RemindWeeklyReportsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.remindWeeklyReports(dto, req.user);
  }

  @Post("weekly-reports/draft")
  @Permissions("action.work_management.create")
  async createWeeklyDraft(
    @Body() dto: CreateWeeklyReportDraftDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.createOrGetWeeklyReportDraft(
      dto,
      req.user,
    );
  }

  @Get("weekly-reports/:id")
  @Permissions("page.work_management.weekly_reports")
  async getWeeklyReport(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.getWeeklyReport(id, req.user);
  }

  @Get("weekly-reports/:id/comments")
  @Permissions("page.work_management.weekly_reports")
  async listWeeklyReportComments(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.discussionsService.listWeeklyReportComments(id, req.user);
  }

  @Patch("weekly-reports/:id")
  @Permissions("action.work_management.update")
  async updateWeeklyReport(
    @Param("id") id: string,
    @Body() dto: UpdateWeeklyReportDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.updateWeeklyReport(id, dto, req.user);
  }

  @Post("weekly-reports/:id/comments")
  @Permissions("page.work_management.weekly_reports")
  async createWeeklyReportComment(
    @Param("id") id: string,
    @Body() dto: CreateDiscussionCommentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.discussionsService.createWeeklyReportComment(
      id,
      dto.content,
      req.user,
    );
  }

  @Post("weekly-reports/:id/submit")
  @Permissions("action.work_management.submit")
  async submitWeeklyReport(
    @Param("id") id: string,
    @Body() dto: UpdateWeeklyReportDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.submitWeeklyReport(id, dto, req.user);
  }

  @Post("weekly-reports/:id/review")
  @Permissions("action.work_management.review")
  async reviewWeeklyReport(
    @Param("id") id: string,
    @Body() dto: ReviewWeeklyReportDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.reviewWeeklyReport(id, dto, req.user);
  }

  @Get("weekly-reports/:id/public-digest")
  @Permissions("page.work_management.weekly_reports")
  async getWeeklyPublicDigest(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.getWeeklyPublicDigest(id, req.user);
  }

  @Post("weekly-reports/:id/public-digest/regenerate")
  @Permissions("action.work_management.review")
  async regenerateWeeklyPublicDigest(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.regenerateWeeklyPublicDigest(id, req.user);
  }

  @Post("weekly-reports/:id/derive-tasks")
  @Permissions("action.work_management.review")
  async deriveWeeklyReportTasks(
    @Param("id") id: string,
    @Body() dto: DeriveWeeklyReportTasksDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.deriveWeeklyReportTasks(id, dto, req.user);
  }

  @Patch("weekly-reports/:id/public-digest")
  @Permissions("action.work_management.review")
  async updateWeeklyPublicDigest(
    @Param("id") id: string,
    @Body() dto: UpdateWeeklyPublicDigestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.updateWeeklyPublicDigest(
      id,
      dto,
      req.user,
    );
  }

  @Patch("weekly-reports/:id/comments/:commentId")
  @Permissions("page.work_management.weekly_reports")
  async updateWeeklyReportComment(
    @Param("id") id: string,
    @Param("commentId") commentId: string,
    @Body() dto: UpdateDiscussionCommentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.discussionsService.updateWeeklyReportComment(
      id,
      commentId,
      dto.content,
      req.user,
    );
  }

  @Get("monthly-goals")
  @Permissions("page.work_management.monthly_goals")
  async listMonthlyGoals(@Req() req: RequestWithUser) {
    return this.workManagementService.listMonthlyGoals(req.user);
  }

  @Post("monthly-goals/draft")
  @Permissions("action.work_management.create")
  async createMonthlyGoalDraft(
    @Body() dto: CreateMonthlyGoalDraftDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.createOrGetMonthlyGoalDraft(
      dto,
      req.user,
    );
  }

  @Get("monthly-goals/:id")
  @Permissions("page.work_management.monthly_goals")
  async getMonthlyGoal(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.getMonthlyGoal(id, req.user);
  }

  @Post("monthly-goals/:id/ai-summary")
  @Permissions("page.work_management.monthly_goals")
  async generateMonthlyGoalAiSummary(
    @Param("id") id: string,
    @Body() dto: GenerateMonthlyGoalAiSummaryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.generateMonthlyGoalAiSummary(
      id,
      dto,
      req.user,
    );
  }

  @Get("monthly-goals/:id/comments")
  @Permissions("page.work_management.monthly_goals")
  async listMonthlyGoalComments(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.discussionsService.listMonthlyGoalComments(id, req.user);
  }

  @Patch("monthly-goals/:id")
  @Permissions("action.work_management.update")
  async updateMonthlyGoal(
    @Param("id") id: string,
    @Body() dto: UpdateMonthlyGoalDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.updateMonthlyGoal(id, dto, req.user);
  }

  @Post("monthly-goals/:id/comments")
  @Permissions("page.work_management.monthly_goals")
  async createMonthlyGoalComment(
    @Param("id") id: string,
    @Body() dto: CreateDiscussionCommentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.discussionsService.createMonthlyGoalComment(
      id,
      dto.content,
      req.user,
    );
  }

  @Post("monthly-goals/:id/submit")
  @Permissions("action.work_management.submit")
  async submitMonthlyGoal(
    @Param("id") id: string,
    @Body() dto: UpdateMonthlyGoalDto,
    @Req() req: RequestWithUser,
  ) {
    return this.workManagementService.submitMonthlyGoal(id, dto, req.user);
  }

  @Patch("monthly-goals/:id/comments/:commentId")
  @Permissions("page.work_management.monthly_goals")
  async updateMonthlyGoalComment(
    @Param("id") id: string,
    @Param("commentId") commentId: string,
    @Body() dto: UpdateDiscussionCommentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.discussionsService.updateMonthlyGoalComment(
      id,
      commentId,
      dto.content,
      req.user,
    );
  }
}
