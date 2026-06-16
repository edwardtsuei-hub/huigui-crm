import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { CreateTestBatchDto } from "./dto/test-batch.dto";
import { TestBatchesService } from "./test-batches.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Permissions("menu.management")
@Controller("test-batches")
export class TestBatchesController {
  constructor(private readonly testBatchesService: TestBatchesService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    return this.testBatchesService.list(req.user);
  }

  @Post()
  async create(@Body() dto: CreateTestBatchDto, @Req() req: RequestWithUser) {
    return this.testBatchesService.create(dto, req.user);
  }

  @Post(":id/close")
  async close(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.testBatchesService.close(id, req.user);
  }

  @Post(":id/clear")
  async clear(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.testBatchesService.clear(id, req.user);
  }
}
