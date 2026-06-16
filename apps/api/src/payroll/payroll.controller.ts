import { Body, Controller, Get, Param, Post, Put, Req } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PayrollService } from "./payroll.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller()
export class SalarySlipsController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post("salary-slips/sync")
  syncSalarySlips(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.payrollService.syncSalarySlips(body, req.user);
  }

  @Get("me/salary-slips")
  getMySalarySlips(@Req() req: RequestWithUser) {
    return this.payrollService.getMySalarySlips(req.user);
  }
}

@Controller()
export class SalaryNotifyLogsController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post("salary-notify-logs")
  recordSalaryNotifyLog(
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.payrollService.recordSalaryNotifyLog(body, req.user);
  }
}

@Controller("payroll/draft-batches")
export class PayrollDraftBatchesController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get(":month")
  getPayrollDraftBatch(
    @Param("month") month: string,
    @Req() req: RequestWithUser,
  ) {
    return this.payrollService.getPayrollDraftBatch(month, req.user);
  }

  @Put(":month")
  savePayrollDraftBatch(
    @Param("month") month: string,
    @Body() body: Record<string, unknown>,
    @Req() req: RequestWithUser,
  ) {
    return this.payrollService.savePayrollDraftBatch(month, body, req.user);
  }
}
