import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import {
  CalculateGeneralQuoteDto,
  CreateGeneralQuoteDto
} from "./dto/general-quote.dto";
import { GeneralQuotesService } from "./general-quotes.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("general-quotes")
export class GeneralQuotesController {
  constructor(private readonly generalQuotesService: GeneralQuotesService) {}

  @Post("calculate")
  async calculate(@Body() dto: CalculateGeneralQuoteDto) {
    return this.generalQuotesService.calculate(dto);
  }

  @Post()
  async create(@Body() dto: CreateGeneralQuoteDto, @Req() req: RequestWithUser) {
    return this.generalQuotesService.create(dto, req.user);
  }

  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.generalQuotesService.getById(id, req.user);
  }
}
