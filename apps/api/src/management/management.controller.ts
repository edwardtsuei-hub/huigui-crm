import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req
} from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { ManagementService } from "./management.service";
import {
  AuditLogQueryDto,
  CreateMemberDto,
  CreateRoleDto,
  MemberQueryDto,
  ResetPasswordDto,
  UpdateApprovalRuleDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
  UpdateRoleDto
} from "./dto/management.dto";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("management")
export class ManagementController {
  constructor(private readonly managementService: ManagementService) {}

  @Permissions("menu.management")
  @Get("overview")
  async overview(@Req() req: RequestWithUser) {
    return this.managementService.getOverview(req.user);
  }

  @Permissions("page.management.members")
  @Get("members")
  async members(@Query() query: MemberQueryDto, @Req() req: RequestWithUser) {
    return this.managementService.listMembers(query, req.user);
  }

  @Permissions("page.management.members")
  @Get("members/:id")
  async memberById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.managementService.getMemberById(id, req.user);
  }

  @Permissions("action.management.member.create")
  @Post("members")
  async createMember(@Body() dto: CreateMemberDto, @Req() req: RequestWithUser) {
    return this.managementService.createMember(dto, req.user);
  }

  @Permissions("action.management.member.update")
  @Patch("members/:id")
  async updateMember(
    @Param("id") id: string,
    @Body() dto: UpdateMemberDto,
    @Req() req: RequestWithUser
  ) {
    return this.managementService.updateMember(id, dto, req.user);
  }

  @Permissions("action.management.member.reset_password")
  @Post("members/:id/reset-password")
  async resetPassword(
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto,
    @Req() req: RequestWithUser
  ) {
    return this.managementService.resetMemberPassword(id, dto, req.user);
  }

  @Permissions("action.management.member.toggle_status")
  @Post("members/:id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateMemberStatusDto,
    @Req() req: RequestWithUser
  ) {
    return this.managementService.updateMemberStatus(id, dto, req.user);
  }

  @Permissions("page.management.roles")
  @Get("roles")
  async roles() {
    return this.managementService.listRoles();
  }

  @Permissions("action.management.role.update")
  @Post("roles")
  async createRole(@Body() dto: CreateRoleDto, @Req() req: RequestWithUser) {
    return this.managementService.createRole(dto, req.user);
  }

  @Permissions("action.management.role.update")
  @Patch("roles/:id")
  async updateRole(
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: RequestWithUser
  ) {
    return this.managementService.updateRole(id, dto, req.user);
  }

  @Permissions("page.management.approvals")
  @Get("approval-rules")
  async approvalRules() {
    return this.managementService.listApprovalRules();
  }

  @Permissions("action.management.rule.update")
  @Patch("approval-rules/:id")
  async updateApprovalRule(
    @Param("id") id: string,
    @Body() dto: UpdateApprovalRuleDto,
    @Req() req: RequestWithUser
  ) {
    return this.managementService.updateApprovalRule(id, dto, req.user);
  }

  @Permissions("action.management.log.view")
  @Get("audit-logs")
  async auditLogs(@Query() query: AuditLogQueryDto) {
    return this.managementService.listAuditLogs(query);
  }
}
