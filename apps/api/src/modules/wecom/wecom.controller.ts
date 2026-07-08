import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import {
  WecomCalendarEventDto,
  WecomCallbackQueryDto,
  WecomLoginDto,
  WecomOAuthCallbackDto,
  WecomSendMessageDto,
} from "./dto/wecom.dto";
import { WecomAuthService } from "./wecom-auth.service";
import { WecomCalendarService } from "./wecom-calendar.service";
import { WecomMessageService } from "./wecom-message.service";
import { WecomService } from "./wecom.service";

type XmlRequest = Request & {
  body?: string | Record<string, unknown>;
};

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

type WecomAgentGetResponse = {
  errcode: number;
  errmsg: string;
  agentid?: number;
  name?: string;
  description?: string;
  allow_userinfos?: {
    user?: Array<{ userid?: string }>;
  };
  allow_partys?: {
    partyid?: number[];
  };
  allow_tags?: {
    tagid?: number[];
  };
};

type WecomDepartmentListResponse = {
  errcode: number;
  errmsg: string;
  department?: Array<{
    id: number;
    name: string;
    parentid: number;
    order?: number;
  }>;
};

type WecomSimpleUserListResponse = {
  errcode: number;
  errmsg: string;
  userlist?: Array<{
    userid: string;
    name?: string;
    department?: number[];
    open_userid?: string;
  }>;
};

@Controller("wecom")
export class WecomController {
  constructor(
    private readonly wecomService: WecomService,
    private readonly wecomAuthService: WecomAuthService,
    private readonly wecomMessageService: WecomMessageService,
    private readonly wecomCalendarService: WecomCalendarService,
  ) {}

  @Public()
  @Get("config")
  getClientConfig(@Req() req: Request) {
    return this.wecomAuthService.getClientConfig(this.resolvePublicOrigin(req));
  }

  @Public()
  @Get("oauth/login-url")
  getOAuthLoginUrl(
    @Req() req: Request,
    @Query("next") nextPath?: string,
    @Query("mode") mode?: string,
  ) {
    const origin = this.resolvePublicOrigin(req);
    const config = this.wecomAuthService.getClientConfig(origin);
    const targetPath = this.resolveSafeNextPath(nextPath);
    const callbackUri = this.appendNextPathToCallbackUri(
      config.redirectUri ||
        `${origin ?? "https://management.hui-health.com"}/login/wecom/callback`,
      targetPath,
    );
    const state = "wecom-login";
    const agentId = config.agentId || "1000025";
    const oauthParams = new URLSearchParams({
      appid: config.corpId,
      redirect_uri: callbackUri,
      response_type: "code",
      scope: "snsapi_base",
      state,
      agentid: agentId,
    });
    const qrParams = new URLSearchParams({
      appid: config.corpId,
      agentid: agentId,
      redirect_uri: callbackUri,
      state,
    });
    const oauthLoginUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?${oauthParams.toString()}#wechat_redirect`;
    const qrLoginUrl = `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?${qrParams.toString()}`;
    const loginUrl = mode === "qr" ? qrLoginUrl : oauthLoginUrl;

    return {
      ok: Boolean(config.corpId && agentId && callbackUri),
      loginUrl,
      oauthLoginUrl,
      qrLoginUrl,
      redirectUri: callbackUri,
      callbackDomain: this.resolveDomain(callbackUri),
      agentId,
      corpId: config.corpId,
      state,
    };
  }

  @Public()
  @Post("login")
  async login(@Body() dto: WecomLoginDto, @Req() req: Request) {
    return this.wecomAuthService.loginWithCode(
      dto.code,
      this.resolvePublicOrigin(req),
    );
  }

  @Public()
  @Post("oauth/callback")
  async handleOAuthCallback(
    @Body() dto: WecomOAuthCallbackDto,
    @Req() req: Request,
  ) {
    return this.wecomAuthService.loginWithOAuthCallback(
      dto.code,
      dto.state,
      this.resolvePublicOrigin(req),
    );
  }

  @Post("connection-test")
  async testConnection(@Req() req: Request) {
    const checkedAt = new Date().toISOString();
    const origin = this.resolvePublicOrigin(req);
    const config = this.wecomService.getClientConfig(origin);

    if (!config.enabled || this.isWecomDryRunForced()) {
      return {
        ok: false,
        mode: "dry_run",
        message: config.enabled
          ? "企业微信当前为 dry-run 模式，未发起真实连接测试。"
          : "企业微信基础配置未补齐，暂不能发起真实连接测试。",
        warnings: config.enabled
          ? ["WECOM_DRY_RUN 已开启。"]
          : ["请确认 CorpID、AgentId 和应用 Secret 已配置。"],
        checkedAt,
      };
    }

    try {
      const response = await this.wecomService.get<WecomAgentGetResponse>(
        "/cgi-bin/agent/get",
        { agentid: config.agentId },
        origin,
      );

      return {
        ok: true,
        mode: "live",
        message: "企业微信连接测试通过。",
        warnings: [],
        checkedAt,
        agent: {
          agentId: response.agentid ?? config.agentId,
          name: response.name ?? "企业微信自建应用",
          description: response.description,
          allowUsersCount: response.allow_userinfos?.user?.length ?? 0,
          allowPartiesCount: response.allow_partys?.partyid?.length ?? 0,
          allowTagsCount: response.allow_tags?.tagid?.length ?? 0,
        },
        response,
      };
    } catch (error) {
      return {
        ok: false,
        mode: "live",
        message:
          error instanceof Error ? error.message : "企业微信连接测试失败。",
        warnings: [
          "请检查企业微信应用 Secret、可信 IP、应用可见范围和 AgentId。",
        ],
        checkedAt,
      };
    }
  }

  @Get("directory")
  async loadDirectory(@Req() req: Request) {
    const loadedAt = new Date().toISOString();
    const origin = this.resolvePublicOrigin(req);
    const config = this.wecomService.getClientConfig(origin);

    if (!config.enabled || this.isWecomDryRunForced()) {
      return {
        ok: false,
        mode: "dry_run",
        message: config.enabled
          ? "企业微信当前为 dry-run 模式，已回退本地成员档案。"
          : "企业微信通讯录配置未补齐，已回退本地成员档案。",
        warnings: config.enabled
          ? ["WECOM_DRY_RUN 已开启。"]
          : ["请确认 CorpID、AgentId 和应用 Secret 已配置。"],
        loadedAt,
        departments: [],
        members: [],
      };
    }

    try {
      const [departmentPayload, userPayload] = await Promise.all([
        this.wecomService.get<WecomDepartmentListResponse>(
          "/cgi-bin/department/list",
          undefined,
          origin,
        ),
        this.wecomService.get<WecomSimpleUserListResponse>(
          "/cgi-bin/user/simplelist",
          { department_id: 1, fetch_child: 1 },
          origin,
        ),
      ]);

      const departments = (departmentPayload.department ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        parentId: item.parentid,
        order: item.order,
      }));
      const members = (userPayload.userlist ?? [])
        .filter((item) => item.userid)
        .map((item) => ({
          userid: item.userid,
          name: item.name ?? item.userid,
          departmentIds: item.department ?? [],
          openUserid: item.open_userid,
        }));

      return {
        ok: true,
        mode: "live",
        message: "企业微信通讯录已读取。",
        warnings: [],
        loadedAt,
        departments,
        members,
      };
    } catch (error) {
      return {
        ok: false,
        mode: "live",
        message: "企业微信通讯录读取失败，已回退本地成员档案。",
        warnings: [
          error instanceof Error ? error.message : "企业微信通讯录读取失败。",
          "请确认应用可见范围、通讯录接口权限和可信 IP。",
        ],
        loadedAt,
        departments: [],
        members: [],
      };
    }
  }

  @Post("bind")
  async bind(@Body() dto: WecomLoginDto, @Req() req: RequestWithUser) {
    return this.wecomAuthService.bindCurrentUserWithCode(
      req.user.id,
      dto.code,
      this.resolvePublicOrigin(req),
    );
  }

  @Permissions("action.management.member.update")
  @Post("message/send")
  async sendMessage(
    @Body() dto: WecomSendMessageDto,
    @Req() req: RequestWithUser,
  ) {
    if (dto.msgType !== "text") {
      throw new BadRequestException("当前仅支持文本消息");
    }

    const content = this.wecomMessageService.formatTextMessage(
      dto.title,
      dto.content,
    );
    await this.wecomMessageService.sendTextMessage(
      dto.toUser,
      content,
      this.resolvePublicOrigin(req),
    );

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
  async handleCallback(
    @Query() query: WecomCallbackQueryDto,
    @Req() req: XmlRequest,
    @Res() res: Response,
  ) {
    await this.wecomService.handleCallback(
      query,
      typeof req.body === "string" ? req.body : "",
    );
    res.type("text/plain").send("success");
  }

  @Permissions("action.management.member.update")
  @Post("calendar/create")
  async createCalendar(@Body() dto: WecomCalendarEventDto) {
    return this.wecomCalendarService.createCalendarEvent(dto);
  }

  @Permissions("action.management.member.update")
  @Post("calendar/update")
  async updateCalendar(@Body() dto: WecomCalendarEventDto) {
    return this.wecomCalendarService.updateCalendarEvent(dto);
  }

  @Permissions("action.management.member.update")
  @Post("calendar/delete")
  async deleteCalendar(@Body() dto: WecomCalendarEventDto) {
    return this.wecomCalendarService.deleteCalendarEvent(dto);
  }

  private isWecomDryRunForced() {
    const value = process.env.WECOM_DRY_RUN?.trim().toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  }

  private resolvePublicOrigin(req: Request) {
    const proto = String(
      req.headers["x-forwarded-proto"] ?? req.protocol ?? "https",
    )
      .split(",")[0]
      .trim();
    const host = String(
      req.headers["x-forwarded-host"] ?? req.headers.host ?? "",
    )
      .split(",")[0]
      .trim();

    return host ? `${proto || "https"}://${host}` : undefined;
  }

  private resolveDomain(url: string) {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  }

  private resolveSafeNextPath(value?: string) {
    const trimmed = value?.trim();
    if (
      !trimmed ||
      !trimmed.startsWith("/") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/login")
    ) {
      return undefined;
    }

    return trimmed;
  }

  private appendNextPathToCallbackUri(callbackUri: string, nextPath?: string) {
    if (!nextPath) {
      return callbackUri;
    }

    const url = new URL(callbackUri);
    url.searchParams.set("next", nextPath);
    return url.toString();
  }
}
