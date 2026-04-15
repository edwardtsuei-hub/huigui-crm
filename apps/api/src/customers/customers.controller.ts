import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
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

  @Get()
  async list(@Query() query: CustomerQueryDto, @Req() req: RequestWithUser) {
    return this.customersService.list(query, req.user);
  }

  @Post()
  async create(@Body() dto: CreateCustomerDto, @Req() req: RequestWithUser) {
    return this.customersService.create(dto, req.user);
  }

  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.customersService.getById(id, req.user);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateCustomerDto, @Req() req: RequestWithUser) {
    return this.customersService.update(id, dto, req.user);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.customersService.remove(id, req.user);
  }

  @Get(":id/followups")
  async listFollowups(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.customersService.listFollowups(id, req.user);
  }

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

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateCustomerFollowupDto, @Req() req: RequestWithUser) {
    return this.customersService.updateFollowup(id, dto, req.user);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.customersService.deleteFollowup(id, req.user);
  }
}
