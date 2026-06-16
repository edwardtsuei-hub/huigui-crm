import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WecomService } from "./wecom.service";

@Injectable()
export class WecomMessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wecomService: WecomService
  ) {}

  async sendTextMessage(toUser: string, content: string, origin?: string) {
    const agentId = Number(this.wecomService.getClientConfig(origin).agentId);
    if (!Number.isInteger(agentId) || agentId <= 0) {
      throw new ServiceUnavailableException("企业微信 AgentId 配置无效");
    }

    const trimmedToUser = toUser.trim();
    const trimmedContent = content.trim();

    if (!trimmedToUser || !trimmedContent) {
      throw new BadRequestException("消息接收人和内容不能为空");
    }

    await this.wecomService.post("/cgi-bin/message/send", {
      touser: trimmedToUser,
      msgtype: "text",
      agentid: agentId,
      text: {
        content: trimmedContent
      },
      safe: 0,
      enable_duplicate_check: 0
    }, undefined, origin);

    return { success: true };
  }

  async sendTextCardMessage(
    toUser: string,
    payload: {
      title: string;
      description: string;
      url: string;
      buttonText?: string;
    },
    origin?: string,
  ) {
    const messageOrigin = origin ?? this.resolveOriginFromUrl(payload.url);
    const agentId = Number(this.wecomService.getClientConfig(messageOrigin).agentId);
    if (!Number.isInteger(agentId) || agentId <= 0) {
      throw new ServiceUnavailableException("企业微信 AgentId 配置无效");
    }

    const trimmedToUser = toUser.trim();
    const title = payload.title.trim();
    const description = payload.description.trim();
    const url = payload.url.trim();

    if (!trimmedToUser || !title || !description || !url) {
      throw new BadRequestException("消息接收人、标题、描述和链接不能为空");
    }

    await this.wecomService.post("/cgi-bin/message/send", {
      touser: trimmedToUser,
      msgtype: "textcard",
      agentid: agentId,
      textcard: {
        title,
        description,
        url,
        btntxt: payload.buttonText?.trim() || "前往查看"
      },
      safe: 0,
      enable_duplicate_check: 0
    }, undefined, messageOrigin);

    return { success: true };
  }

  async sendReminderMessage(
    userId: string,
    title: string,
    content: string,
    options?: { url?: string | null; buttonText?: string; origin?: string }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException("提醒接收用户不存在");
    }

    if (!user.wecomUserId) {
      throw new BadRequestException("当前用户未绑定企业微信账号");
    }

    if (options?.url) {
      return this.sendTextCardMessage(user.wecomUserId, {
        title: title || "CRM 通知",
        description: this.formatTextCardDescription(content),
        url: options.url,
        buttonText: options.buttonText
      }, options.origin);
    }

    return this.sendTextMessage(
      user.wecomUserId,
      this.formatTextMessage(title, content),
      options?.origin,
    );
  }

  formatTextMessage(title: string | undefined, content: string) {
    const trimmedTitle = title?.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      return trimmedContent;
    }

    return trimmedContent.startsWith(`【${trimmedTitle}】`)
      ? trimmedContent
      : `【${trimmedTitle}】\n${trimmedContent}`;
  }

  private formatTextCardDescription(content: string) {
    return content
      .trim()
      .replace(/\n/g, "<br>");
  }

  private resolveOriginFromUrl(value: string) {
    try {
      const url = new URL(value);
      return `${url.protocol}//${url.host}`;
    } catch {
      return undefined;
    }
  }
}
