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

  async sendTextMessage(toUser: string, content: string) {
    const agentId = Number(this.wecomService.getClientConfig().agentId);
    if (!Number.isFinite(agentId)) {
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
    });

    return { success: true };
  }

  async sendReminderMessage(userId: string, title: string, content: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException("提醒接收用户不存在");
    }

    if (!user.wecomUserId) {
      throw new BadRequestException("当前用户未绑定企业微信账号");
    }

    return this.sendTextMessage(user.wecomUserId, this.formatTextMessage(title, content));
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
}
