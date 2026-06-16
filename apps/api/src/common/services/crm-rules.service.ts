import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CRM_RULES_SETTING_KEY,
  DEFAULT_CRM_RULES,
  normalizeCrmRulesConfig,
} from "../constants/crm-rules";

@Injectable()
export class CrmRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRules() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { settingKey: CRM_RULES_SETTING_KEY },
    });

    if (!setting) {
      return DEFAULT_CRM_RULES;
    }

    return normalizeCrmRulesConfig(
      (setting.configJson ?? null) as Record<string, unknown> | null,
    );
  }

  async updateRules(
    rawConfig: Record<string, unknown>,
    updatedByUserId?: string,
  ) {
    const normalizedConfig = normalizeCrmRulesConfig(rawConfig);

    return this.prisma.systemSetting.upsert({
      where: { settingKey: CRM_RULES_SETTING_KEY },
      create: {
        settingKey: CRM_RULES_SETTING_KEY,
        name: "CRM 归属规则",
        category: "CRM",
        configJson: normalizedConfig,
        updatedByUserId,
      },
      update: {
        configJson: normalizedConfig,
        updatedByUserId,
      },
      include: {
        updatedBy: {
          include: { role: true },
        },
      },
    });
  }
}
