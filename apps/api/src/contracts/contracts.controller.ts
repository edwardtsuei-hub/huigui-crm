import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { ContractsService } from "./contracts.service";
import { ContractQueryDto, CreateContractDto, UpdateContractDto } from "./dto/contract.dto";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("contracts")
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Permissions("page.customers.detail")
  @Get()
  async list(@Query() query: ContractQueryDto, @Req() req: RequestWithUser) {
    return this.contractsService.list(query, req.user);
  }

  @Permissions("page.customers.detail")
  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.contractsService.getById(id, req.user);
  }

  @Permissions("action.customer.update")
  @Post()
  async create(@Body() dto: CreateContractDto, @Req() req: RequestWithUser) {
    return this.contractsService.create(dto, req.user);
  }

  @Permissions("action.customer.update")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateContractDto,
    @Req() req: RequestWithUser,
  ) {
    return this.contractsService.update(id, dto, req.user);
  }
}
