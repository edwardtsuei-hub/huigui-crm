import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import {
  WecomCalendarEventDto,
  WecomCallbackQueryDto,
  WecomLoginDto,
  WecomSendMessageDto
} from "./dto/wecom.dto";
import { WecomAuthService } from "./wecom-auth.service";
import { WecomCalendarService } from "./wecom-calendar.service";
import { WecomMessageService } from "./wecom-message.service";
import { WecomService } from "./wecom.service";

type XmlRequest = Request & {
  body?: string | Record<string, unknown>;
};

@Controller("wecom")
export class WecomController {
  constructor(
    private readonly wecomService: WecomService,
    private readonly wecomAuthService: WecomAuthService,
    private readonly wecomMessageService: WecomMessageService,
    private readonly wecomCalendarService: WecomCalendarService
  ) {}

  @Public()
  @Get("config")
  getClientConfig() {
    return this.wecomAuthService.getClientConfig();
  }

  @Public()
  @Post("login")
  async login(@Body() dto: WecomLoginDto) {
    return this.wecomAuthService.loginWithCode(dto.code);
  }

  @Post("message/send")
  async sendMessage(@Body() dto: WecomSendMessageDto) {
    if (dto.msgType !== "text") {
      throw new BadRequestException("当前仅支持文本消息");
    }

    const content = this.wecomMessageService.formatTextMessage(dto.title, dto.content);
    await this.wecomMessageService.sendTextMessage(dto.toUser, content);

    return { success: true };
  }

  @Public()
  @Get("callback")
  verifyCallback(@Query() query: WecomCallbackQueryDto, @Res() res: Response) {
    const echo = this.wecomService.verifyCallback(query);
    res.type("text/plain").send(echo);
  }

  @Public()
  @Post("callback")
  handleCallback(
    @Query() query: WecomCallbackQueryDto,
    @Req() req: XmlRequest,
    @Res() res: Response
  ) {
    this.wecomService.handleCallback(query, typeof req.body === "string" ? req.body : "");
    res.type("text/plain").send("success");
  }

  @Post("calendar/create")
  async createCalendar(@Body() dto: WecomCalendarEventDto) {
    return this.wecomCalendarService.createCalendarEvent(dto);
  }

  @Post("calendar/update")
  async updateCalendar(@Body() dto: WecomCalendarEventDto) {
    return this.wecomCalendarService.updateCalendarEvent(dto);
  }

  @Post("calendar/delete")
  async deleteCalendar(@Body() dto: WecomCalendarEventDto) {
    return this.wecomCalendarService.deleteCalendarEvent(dto);
  }
}
