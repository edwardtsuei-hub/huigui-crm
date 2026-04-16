import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { CustomersService } from "./customers.service";
import {
  CreateCustomerDto,
  CreateCustomerFollowupDto,
  CustomerQueryDto,
  UpdateCustomerDto,
  UpdateCustomerFollowupDto
} from "./dto/customer.dto";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Permissions("page.customers.list")
  @Get()
  async list(@Query() query: CustomerQueryDto, @Req() req: RequestWithUser) {
    return this.customersService.list(query, req.user);
  }

  @Permissions("action.customer.create")
  @Post()
  async create(@Body() dto: CreateCustomerDto, @Req() req: RequestWithUser) {
    return this.customersService.create(dto, req.user);
  }

  @Permissions("page.customers.detail")
  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.customersService.getById(id, req.user);
  }

  @Permissions("action.customer.update")
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateCustomerDto, @Req() req: RequestWithUser) {
    return this.customersService.update(id, dto, req.user);
  }

  @Permissions("action.customer.delete")
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.customersService.remove(id, req.user);
  }

  @Permissions("page.customers.detail")
  @Get(":id/followups")
  async listFollowups(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.customersService.listFollowups(id, req.user);
  }

  @Permissions("action.schedule.create")
  @Post(":id/followups")
  async createFollowup(
    @Param("id") id: string,
    @Body() dto: CreateCustomerFollowupDto,
    @Req() req: RequestWithUser
  ) {
    return this.customersService.createFollowup(id, dto, req.user);
  }
}

@Controller("customer-followups")
export class CustomerFollowupsController {
  constructor(private readonly customersService: CustomersService) {}

  @Permissions("action.schedule.update")
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateCustomerFollowupDto, @Req() req: RequestWithUser) {
    return this.customersService.updateFollowup(id, dto, req.user);
  }

  @Permissions("action.schedule.delete")
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.customersService.deleteFollowup(id, req.user);
  }
}
