import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AgriculturePlansService } from "./agriculture-plans.service";
import { CalculateAgriculturePlanDto, CreateAgriculturePlanDto } from "./dto/agriculture-plan.dto";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("agriculture-plans")
export class AgriculturePlansController {
  constructor(private readonly agriculturePlansService: AgriculturePlansService) {}

  @Permissions("action.solution.create")
  @Post("calculate")
  async calculate(@Body() dto: CalculateAgriculturePlanDto) {
    return this.agriculturePlansService.calculate(dto);
  }

  @Permissions("action.solution.create")
  @Post()
  async create(@Body() dto: CreateAgriculturePlanDto, @Req() req: RequestWithUser) {
    return this.agriculturePlansService.create(dto, req.user);
  }

  @Permissions("page.quotations.detail")
  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.agriculturePlansService.getById(id, req.user);
  }
}

@Controller("agriculture")
export class LegacyAgricultureController {
  constructor(private readonly agriculturePlansService: AgriculturePlansService) {}

  @Permissions("action.solution.create")
  @Post("preview")
  async preview(@Body() dto: CalculateAgriculturePlanDto) {
    return this.agriculturePlansService.calculate(dto);
  }

  @Permissions("action.solution.create")
  @Post("quotations")
  async create(@Body() dto: CreateAgriculturePlanDto, @Req() req: RequestWithUser) {
    const result = await this.agriculturePlansService.create(dto, req.user);
    return { id: result.quotationId, ...result };
  }
}
