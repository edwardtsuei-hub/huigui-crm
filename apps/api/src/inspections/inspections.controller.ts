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
import { InspectionsService } from "./inspections.service";
import {
  CreateInspectionOrderDto,
  InspectionQueryDto,
  UpdateInspectionOrderDto,
} from "./dto/inspection.dto";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("inspections")
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Permissions("page.inspections.list")
  @Get()
  async list(@Query() query: InspectionQueryDto, @Req() req: RequestWithUser) {
    return this.inspectionsService.list(query, req.user);
  }

  @Permissions("page.inspections.detail")
  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.inspectionsService.getById(id, req.user);
  }

  @Permissions("action.inspection.create")
  @Post()
  async create(
    @Body() dto: CreateInspectionOrderDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inspectionsService.create(dto, req.user);
  }

  @Permissions("action.inspection.update")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateInspectionOrderDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inspectionsService.update(id, dto, req.user);
  }
}
