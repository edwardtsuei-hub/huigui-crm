import { Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { QuotationsService } from "./quotations.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("quotations")
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    return this.quotationsService.list(req.user);
  }

  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.quotationsService.getById(id, req.user);
  }

  @Get(":id/pdf")
  async pdf(@Param("id") id: string, @Req() req: RequestWithUser, @Res() res: Response) {
    return this.quotationsService.streamPdf(id, req.user, res);
  }

  @Post(":id/export-pdf")
  async exportPdf(@Param("id") id: string, @Req() req: RequestWithUser, @Res() res: Response) {
    return this.quotationsService.streamPdf(id, req.user, res);
  }
}
