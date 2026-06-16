import { Body, Controller, Delete, Get, Param, Post, Put, Req } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { EcotechBulkRecordsDto, EcotechQuotationReviewDto, EcotechRecordDto } from "./dto/ecotech.dto";
import { EcotechService } from "./ecotech.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("ecotech")
export class EcotechWorkspaceController {
  constructor(private readonly ecotechService: EcotechService) {}

  @Get("workspace")
  workspace(@Req() req: RequestWithUser) {
    return this.ecotechService.workspace(req.user);
  }

  @Post("workspace/reset")
  reset(@Req() req: RequestWithUser) {
    return this.ecotechService.reset(req.user);
  }
}

@Controller("ecotech/customers")
export class EcotechCustomersController {
  constructor(private readonly ecotechService: EcotechService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.ecotechService.list("customers", req.user);
  }

  @Post()
  create(@Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.create("customers", dto.record, req.user);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.update("customers", id, dto.record, req.user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ecotechService.remove("customers", id, req.user);
  }
}

@Controller("ecotech/quotations")
export class EcotechQuotationsController {
  constructor(private readonly ecotechService: EcotechService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.ecotechService.list("quotations", req.user);
  }

  @Post()
  create(@Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.create("quotations", dto.record, req.user);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.update("quotations", id, dto.record, req.user);
  }

  @Post(":id/review")
  review(@Param("id") id: string, @Body() dto: EcotechQuotationReviewDto, @Req() req: RequestWithUser) {
    return this.ecotechService.reviewQuotation(id, dto.decision, dto.reviewer, dto.note, req.user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ecotechService.remove("quotations", id, req.user);
  }
}

@Controller("ecotech/products")
export class EcotechProductsController {
  constructor(private readonly ecotechService: EcotechService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.ecotechService.list("products", req.user);
  }

  @Post()
  create(@Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.create("products", dto.record, req.user);
  }

  @Post("bulk")
  bulk(@Body() dto: EcotechBulkRecordsDto, @Req() req: RequestWithUser) {
    return this.ecotechService.bulkProducts(dto.records, req.user);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.update("products", id, dto.record, req.user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ecotechService.remove("products", id, req.user);
  }
}

@Controller("ecotech/orders")
export class EcotechOrdersController {
  constructor(private readonly ecotechService: EcotechService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.ecotechService.list("orders", req.user);
  }

  @Post()
  create(@Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.create("orders", dto.record, req.user);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.update("orders", id, dto.record, req.user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ecotechService.remove("orders", id, req.user);
  }
}

@Controller("ecotech/finance-accounts")
export class EcotechFinanceAccountsController {
  constructor(private readonly ecotechService: EcotechService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.ecotechService.list("financeAccounts", req.user);
  }

  @Post()
  create(@Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.create("financeAccounts", dto.record, req.user);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.update("financeAccounts", id, dto.record, req.user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ecotechService.remove("financeAccounts", id, req.user);
  }
}

@Controller("ecotech/channel-partners")
export class EcotechChannelPartnersController {
  constructor(private readonly ecotechService: EcotechService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.ecotechService.list("channelPartners", req.user);
  }

  @Post()
  create(@Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.create("channelPartners", dto.record, req.user);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.update("channelPartners", id, dto.record, req.user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ecotechService.remove("channelPartners", id, req.user);
  }
}

@Controller("ecotech/contracts")
export class EcotechContractsController {
  constructor(private readonly ecotechService: EcotechService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.ecotechService.list("contracts", req.user);
  }

  @Post()
  create(@Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.create("contracts", dto.record, req.user);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.update("contracts", id, dto.record, req.user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ecotechService.remove("contracts", id, req.user);
  }
}

@Controller("ecotech/inspections")
export class EcotechInspectionsController {
  constructor(private readonly ecotechService: EcotechService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.ecotechService.list("inspections", req.user);
  }

  @Post()
  create(@Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.create("inspections", dto.record, req.user);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: EcotechRecordDto, @Req() req: RequestWithUser) {
    return this.ecotechService.update("inspections", id, dto.record, req.user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ecotechService.remove("inspections", id, req.user);
  }
}
