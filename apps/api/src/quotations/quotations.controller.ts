import { Body, Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { ReviewQuotationApprovalDto } from "./dto/quotation.dto";
import { QuotationsService } from "./quotations.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("quotations")
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Permissions("page.quotations.list")
  @Get()
  async list(@Req() req: RequestWithUser) {
    return this.quotationsService.list(req.user);
  }

  @Permissions("page.quotations.detail")
  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.quotationsService.getById(id, req.user);
  }

  @Permissions("action.quotation.export_pdf")
  @Get(":id/pdf")
  async pdf(@Param("id") id: string, @Req() req: RequestWithUser, @Res() res: Response) {
    return this.quotationsService.streamPdf(id, req.user, res);
  }

  @Permissions("action.quotation.export_pdf")
  @Post(":id/export-pdf")
  async exportPdf(@Param("id") id: string, @Req() req: RequestWithUser, @Res() res: Response) {
    return this.quotationsService.streamPdf(id, req.user, res);
  }

  @Permissions("action.quotation.approve", "action.quotation.reject")
  @Post(":id/review-approval")
  async reviewApproval(
    @Param("id") id: string,
    @Body() dto: ReviewQuotationApprovalDto,
    @Req() req: RequestWithUser
  ) {
    return this.quotationsService.reviewApproval(id, dto.type, dto.decision, req.user, dto.remark);
  }
}
