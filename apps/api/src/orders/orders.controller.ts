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
import { OrdersService } from "./orders.service";
import {
  ChannelSettlementsQueryDto,
  ChannelPartnersQueryDto,
  CreateChannelSettlementDto,
  CreateChannelPartnerDto,
  CreateFinanceAccountDto,
  CreatePaymentRecordDto,
  CreateSalesOrderDto,
  CreateShipmentRecordDto,
  FinanceAccountsQueryDto,
  OrderPaymentsQueryDto,
  OrdersQueryDto,
  OrderShipmentsQueryDto,
  UpdateSalesOrderDto,
  UpdateFinanceAccountDto,
} from "./dto/order.dto";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Permissions("action.order.create")
  @Post()
  async create(@Body() dto: CreateSalesOrderDto, @Req() req: RequestWithUser) {
    return this.ordersService.create(dto, req.user);
  }

  @Permissions("page.orders.list")
  @Get()
  async list(@Query() query: OrdersQueryDto, @Req() req: RequestWithUser) {
    return this.ordersService.list(query, req.user);
  }

  @Permissions("page.orders.payments")
  @Get("payments")
  async listPayments(
    @Query() query: OrderPaymentsQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.listPayments(query, req.user);
  }

  @Permissions("page.orders.shipments")
  @Get("shipments")
  async listShipments(
    @Query() query: OrderShipmentsQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.listShipments(query, req.user);
  }

  @Permissions("page.orders.channel_settlements")
  @Get("channel-settlements")
  async listChannelSettlements(
    @Query() query: ChannelSettlementsQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.listChannelSettlements(query, req.user);
  }

  @Permissions("action.order.settle_channel")
  @Post("channel-settlements")
  async createChannelSettlement(
    @Body() dto: CreateChannelSettlementDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.createChannelSettlement(dto, req.user);
  }

  @Permissions("page.orders.detail")
  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ordersService.getById(id, req.user);
  }

  @Permissions("action.order.update")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateSalesOrderDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.update(id, dto, req.user);
  }

  @Permissions("action.order.confirm")
  @Post(":id/confirm")
  async confirm(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ordersService.confirm(id, req.user);
  }

  @Permissions("action.order.cancel")
  @Post(":id/cancel")
  async cancel(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.ordersService.cancel(id, req.user);
  }

  @Permissions("action.order.record_payment")
  @Post(":id/payments")
  async createPayment(
    @Param("id") id: string,
    @Body() dto: CreatePaymentRecordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.createPayment(id, dto, req.user);
  }

  @Permissions("action.order.create_shipment")
  @Post(":id/shipments")
  async createShipment(
    @Param("id") id: string,
    @Body() dto: CreateShipmentRecordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.createShipment(id, dto, req.user);
  }
}

@Controller("finance-accounts")
export class FinanceAccountsController {
  constructor(private readonly ordersService: OrdersService) {}

  @Permissions("page.settings.finance_accounts")
  @Get()
  async list(@Query() query: FinanceAccountsQueryDto) {
    return this.ordersService.listFinanceAccounts(query);
  }

  @Permissions("action.finance_account.update")
  @Post()
  async create(@Body() dto: CreateFinanceAccountDto) {
    return this.ordersService.createFinanceAccount(dto);
  }

  @Permissions("action.finance_account.update")
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateFinanceAccountDto) {
    return this.ordersService.updateFinanceAccount(id, dto);
  }
}

@Controller("channel-partners")
export class ChannelPartnersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Permissions("page.orders.channel_settlements")
  @Get()
  async list(
    @Query() query: ChannelPartnersQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.listChannelPartners(query, req.user);
  }

  @Permissions("action.order.settle_channel")
  @Post()
  async create(
    @Body() dto: CreateChannelPartnerDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.createChannelPartner(dto, req.user);
  }
}
