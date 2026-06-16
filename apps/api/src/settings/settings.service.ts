import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { UpdateSystemSettingsDto } from "./dto/settings.dto";
import { UpdateShiftRosterDto } from "./dto/shift-roster.dto";

const COMPANY_PROFILE_SETTING_KEY = "SYSTEM_COMPANY_PROFILE";
const NOTIFICATION_POLICY_SETTING_KEY = "SYSTEM_NOTIFICATION_POLICY";
const WORKSPACE_PREFERENCES_SETTING_KEY = "SYSTEM_WORKSPACE_PREFERENCES";
const SHIFT_ROSTER_SETTING_KEY = "SYSTEM_SHIFT_ROSTER";

const DEFAULT_COMPANY_PROFILE = {
  companyName: "山东洄归生态科技有限公司",
  shortName: "洄归生态",
  servicePhone: "",
  supportWechat: "",
  quotationValidityDays: 15,
  quotationFooter: "报价含税含运费，具体以双方最终确认单为准。"
} as const;

const DEFAULT_NOTIFICATION_POLICY = {
  enableSystemNotifications: true,
  enableDiscussionNotifications: true,
  enableApprovalNotifications: true,
  dailyDigestEnabled: false,
  dailyDigestHour: 18,
  dueSoonReminderHours: 24
} as const;

const DEFAULT_WORKSPACE_PREFERENCES = {
  defaultScheduleView: "week",
  dashboardDensity: "comfortable",
  showFirstRunGuides: true,
  enableTestDataTools: true
} as const;

const SHIFT_ROSTER_DEPARTMENTS = ["frontHouse", "kitchen", "daochong"] as const;
const SHIFT_ROSTER_SHIFT_CODES = ["early", "late", "off", "leave", "full"] as const;

type ShiftRosterDepartmentKey = (typeof SHIFT_ROSTER_DEPARTMENTS)[number];
type ShiftRosterShiftCode = (typeof SHIFT_ROSTER_SHIFT_CODES)[number];

type ShiftRosterConfig = {
  users: Array<{
    id: string;
    username: string;
    password: string;
    name: string;
    role: string;
  }>;
  staff: Record<
    ShiftRosterDepartmentKey,
    Array<{
      id: string;
      name: string;
      dept: ShiftRosterDepartmentKey;
      position: string;
      phone: string;
    }>
  >;
  shiftTimes: Record<
    ShiftRosterDepartmentKey,
    {
      early: { s: string; e: string };
      late: { s: string; e: string };
      full: { s: string; e: string };
    }
  >;
  schedules: {
    weekly: Record<
      ShiftRosterDepartmentKey,
      Record<string, Record<string, ShiftRosterShiftCode>>
    >;
  };
  dailyInfo: Record<
    ShiftRosterDepartmentKey,
    Record<
      string,
      {
        activity: string;
        note: string;
        reservation: string;
      }
    >
  >;
};

const DEFAULT_SHIFT_ROSTER_CONFIG: ShiftRosterConfig = {
  users: [
    {
      id: "u1",
      username: "admin",
      password: "1234",
      name: "总管理员",
      role: "superadmin",
    },
    {
      id: "u2",
      username: "manager",
      password: "1234",
      name: "店长",
      role: "manager",
    },
    {
      id: "u3",
      username: "chef",
      password: "1234",
      name: "主厨",
      role: "chef",
    },
    {
      id: "u4",
      username: "daochong",
      password: "1234",
      name: "道冲元气管理员",
      role: "daochong_admin",
    },
  ],
  staff: {
    frontHouse: [],
    kitchen: [],
    daochong: [],
  },
  shiftTimes: {
    frontHouse: {
      early: { s: "10:00", e: "20:00" },
      late: { s: "11:00", e: "21:00" },
      full: { s: "10:00", e: "20:30" },
    },
    kitchen: {
      early: { s: "10:00", e: "20:30" },
      late: { s: "10:30", e: "21:00" },
      full: { s: "10:00", e: "20:30" },
    },
    daochong: {
      early: { s: "10:00", e: "20:00" },
      late: { s: "11:00", e: "21:00" },
      full: { s: "10:00", e: "20:30" },
    },
  },
  schedules: {
    weekly: {
      frontHouse: {},
      kitchen: {},
      daochong: {},
    },
  },
  dailyInfo: {
    frontHouse: {},
    kitchen: {},
    daochong: {},
  },
};

function normalizeText(value: unknown, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeShiftTimeValue(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : fallback;
}

function normalizeShiftRosterUsers(raw: unknown) {
  if (!Array.isArray(raw)) {
    return DEFAULT_SHIFT_ROSTER_CONFIG.users;
  }

  const users = raw
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      return {
        id: normalizeText(record.id, `user-${index + 1}`),
        username: normalizeText(record.username, `user${index + 1}`),
        password: normalizeText(record.password, "1234"),
        name: normalizeText(record.name, `成员 ${index + 1}`),
        role: normalizeText(record.role, "superadmin"),
      };
    })
    .filter(Boolean) as ShiftRosterConfig["users"];

  return users.length ? users : DEFAULT_SHIFT_ROSTER_CONFIG.users;
}

function normalizeShiftRosterStaff(
  raw: unknown,
  department: ShiftRosterDepartmentKey,
) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = normalizeText(record.name);
      const position = normalizeText(record.position);

      if (!name || !position) {
        return null;
      }

      return {
        id: normalizeText(record.id, `${department}-staff-${index + 1}`),
        name,
        dept: department,
        position,
        phone: normalizeText(record.phone),
      };
    })
    .filter(Boolean) as ShiftRosterConfig["staff"][ShiftRosterDepartmentKey];
}

function normalizeShiftRosterShiftTimes(raw: unknown) {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return SHIFT_ROSTER_DEPARTMENTS.reduce<ShiftRosterConfig["shiftTimes"]>(
    (accumulator, department) => {
      const departmentRecord =
        record[department] &&
        typeof record[department] === "object" &&
        !Array.isArray(record[department])
          ? (record[department] as Record<string, unknown>)
          : {};
      const defaults = DEFAULT_SHIFT_ROSTER_CONFIG.shiftTimes[department];

      accumulator[department] = {
        early: {
          s: normalizeShiftTimeValue(
            (departmentRecord.early as Record<string, unknown> | undefined)?.s,
            defaults.early.s,
          ),
          e: normalizeShiftTimeValue(
            (departmentRecord.early as Record<string, unknown> | undefined)?.e,
            defaults.early.e,
          ),
        },
        late: {
          s: normalizeShiftTimeValue(
            (departmentRecord.late as Record<string, unknown> | undefined)?.s,
            defaults.late.s,
          ),
          e: normalizeShiftTimeValue(
            (departmentRecord.late as Record<string, unknown> | undefined)?.e,
            defaults.late.e,
          ),
        },
        full: {
          s: normalizeShiftTimeValue(
            (departmentRecord.full as Record<string, unknown> | undefined)?.s,
            defaults.full.s,
          ),
          e: normalizeShiftTimeValue(
            (departmentRecord.full as Record<string, unknown> | undefined)?.e,
            defaults.full.e,
          ),
        },
      };

      return accumulator;
    },
    {
      frontHouse: DEFAULT_SHIFT_ROSTER_CONFIG.shiftTimes.frontHouse,
      kitchen: DEFAULT_SHIFT_ROSTER_CONFIG.shiftTimes.kitchen,
      daochong: DEFAULT_SHIFT_ROSTER_CONFIG.shiftTimes.daochong,
    },
  );
}

function normalizeShiftRosterSchedules(raw: unknown) {
  const root =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const weeklyRecord =
    root.weekly && typeof root.weekly === "object" && !Array.isArray(root.weekly)
      ? (root.weekly as Record<string, unknown>)
      : {};

  return {
    weekly: SHIFT_ROSTER_DEPARTMENTS.reduce<ShiftRosterConfig["schedules"]["weekly"]>(
      (accumulator, department) => {
        const departmentRecord =
          weeklyRecord[department] &&
          typeof weeklyRecord[department] === "object" &&
          !Array.isArray(weeklyRecord[department])
            ? (weeklyRecord[department] as Record<string, unknown>)
            : {};

        const nextDepartment: Record<string, Record<string, ShiftRosterShiftCode>> = {};

        Object.entries(departmentRecord).forEach(([staffId, dayRecord]) => {
          if (!staffId.trim() || !dayRecord || typeof dayRecord !== "object" || Array.isArray(dayRecord)) {
            return;
          }

          const normalizedDays: Record<string, ShiftRosterShiftCode> = {};

          Object.entries(dayRecord as Record<string, unknown>).forEach(([dateKey, shiftCode]) => {
            if (
              typeof shiftCode === "string" &&
              (SHIFT_ROSTER_SHIFT_CODES as readonly string[]).includes(shiftCode) &&
              dateKey.trim()
            ) {
              normalizedDays[dateKey.trim()] = shiftCode as ShiftRosterShiftCode;
            }
          });

          if (Object.keys(normalizedDays).length) {
            nextDepartment[staffId.trim()] = normalizedDays;
          }
        });

        accumulator[department] = nextDepartment;
        return accumulator;
      },
      {
        frontHouse: {},
        kitchen: {},
        daochong: {},
      },
    ),
  };
}

function normalizeShiftRosterDailyInfo(raw: unknown) {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return SHIFT_ROSTER_DEPARTMENTS.reduce<ShiftRosterConfig["dailyInfo"]>(
    (accumulator, department) => {
      const departmentRecord =
        record[department] &&
        typeof record[department] === "object" &&
        !Array.isArray(record[department])
          ? (record[department] as Record<string, unknown>)
          : {};
      const normalizedDepartment: Record<
        string,
        {
          activity: string;
          note: string;
          reservation: string;
        }
      > = {};

      Object.entries(departmentRecord).forEach(([dateKey, infoRecord]) => {
        if (!dateKey.trim() || !infoRecord || typeof infoRecord !== "object" || Array.isArray(infoRecord)) {
          return;
        }

        const info = infoRecord as Record<string, unknown>;
        normalizedDepartment[dateKey.trim()] = {
          activity: normalizeText(info.activity),
          note: normalizeText(info.note),
          reservation: normalizeText(info.reservation),
        };
      });

      accumulator[department] = normalizedDepartment;
      return accumulator;
    },
    {
      frontHouse: {},
      kitchen: {},
      daochong: {},
    },
  );
}

function normalizeShiftRosterConfig(raw: Record<string, unknown> | null | undefined): ShiftRosterConfig {
  const staffRecord =
    raw?.staff && typeof raw.staff === "object" && !Array.isArray(raw.staff)
      ? (raw.staff as Record<string, unknown>)
      : {};

  return {
    users: normalizeShiftRosterUsers(raw?.users),
    staff: {
      frontHouse: normalizeShiftRosterStaff(staffRecord.frontHouse, "frontHouse"),
      kitchen: normalizeShiftRosterStaff(staffRecord.kitchen, "kitchen"),
      daochong: normalizeShiftRosterStaff(staffRecord.daochong, "daochong"),
    },
    shiftTimes: normalizeShiftRosterShiftTimes(raw?.shiftTimes),
    schedules: normalizeShiftRosterSchedules(raw?.schedules),
    dailyInfo: normalizeShiftRosterDailyInfo(raw?.dailyInfo),
  };
}

function normalizeCompanyProfile(raw: Record<string, unknown> | null | undefined) {
  return {
    companyName: normalizeText(raw?.companyName, DEFAULT_COMPANY_PROFILE.companyName),
    shortName: normalizeText(raw?.shortName, DEFAULT_COMPANY_PROFILE.shortName),
    servicePhone: normalizeText(raw?.servicePhone, DEFAULT_COMPANY_PROFILE.servicePhone),
    supportWechat: normalizeText(raw?.supportWechat, DEFAULT_COMPANY_PROFILE.supportWechat),
    quotationValidityDays: clampInteger(
      raw?.quotationValidityDays,
      DEFAULT_COMPANY_PROFILE.quotationValidityDays,
      1,
      365
    ),
    quotationFooter: normalizeText(raw?.quotationFooter, DEFAULT_COMPANY_PROFILE.quotationFooter)
  };
}

function normalizeNotificationPolicy(raw: Record<string, unknown> | null | undefined) {
  return {
    enableSystemNotifications: normalizeBoolean(
      raw?.enableSystemNotifications,
      DEFAULT_NOTIFICATION_POLICY.enableSystemNotifications
    ),
    enableDiscussionNotifications: normalizeBoolean(
      raw?.enableDiscussionNotifications,
      DEFAULT_NOTIFICATION_POLICY.enableDiscussionNotifications
    ),
    enableApprovalNotifications: normalizeBoolean(
      raw?.enableApprovalNotifications,
      DEFAULT_NOTIFICATION_POLICY.enableApprovalNotifications
    ),
    dailyDigestEnabled: normalizeBoolean(
      raw?.dailyDigestEnabled,
      DEFAULT_NOTIFICATION_POLICY.dailyDigestEnabled
    ),
    dailyDigestHour: clampInteger(
      raw?.dailyDigestHour,
      DEFAULT_NOTIFICATION_POLICY.dailyDigestHour,
      0,
      23
    ),
    dueSoonReminderHours: clampInteger(
      raw?.dueSoonReminderHours,
      DEFAULT_NOTIFICATION_POLICY.dueSoonReminderHours,
      1,
      168
    )
  };
}

function normalizeWorkspacePreferences(raw: Record<string, unknown> | null | undefined) {
  const defaultScheduleView =
    raw?.defaultScheduleView === "month" ? "month" : DEFAULT_WORKSPACE_PREFERENCES.defaultScheduleView;
  const dashboardDensity =
    raw?.dashboardDensity === "compact"
      ? "compact"
      : DEFAULT_WORKSPACE_PREFERENCES.dashboardDensity;

  return {
    defaultScheduleView,
    dashboardDensity,
    showFirstRunGuides: normalizeBoolean(
      raw?.showFirstRunGuides,
      DEFAULT_WORKSPACE_PREFERENCES.showFirstRunGuides
    ),
    enableTestDataTools: normalizeBoolean(
      raw?.enableTestDataTools,
      DEFAULT_WORKSPACE_PREFERENCES.enableTestDataTools
    )
  };
}

type SettingRecord = {
  id: string;
  configJson: unknown;
  updatedAt: Date;
  updatedBy: {
    id: string;
    name: string;
    role: { name: string };
  } | null;
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService
  ) {}

  async getOverview() {
    const [companyProfileSetting, notificationPolicySetting, workspacePreferencesSetting] =
      await Promise.all([
        this.findSetting(COMPANY_PROFILE_SETTING_KEY),
        this.findSetting(NOTIFICATION_POLICY_SETTING_KEY),
        this.findSetting(WORKSPACE_PREFERENCES_SETTING_KEY)
      ]);

    return {
      companyProfile: {
        config: normalizeCompanyProfile(this.toRecord(companyProfileSetting?.configJson)),
        ...this.serializeSettingMeta(companyProfileSetting)
      },
      notificationPolicy: {
        config: normalizeNotificationPolicy(this.toRecord(notificationPolicySetting?.configJson)),
        ...this.serializeSettingMeta(notificationPolicySetting)
      },
      workspacePreferences: {
        config: normalizeWorkspacePreferences(this.toRecord(workspacePreferencesSetting?.configJson)),
        ...this.serializeSettingMeta(workspacePreferencesSetting)
      },
      integrations: {
        wecom: this.buildWecomStatus(),
        cos: this.buildCosStatus()
      },
      runtime: {
        nodeEnv: this.configService.get<string>("NODE_ENV") ?? "development"
      }
    };
  }

  async updateOverview(dto: UpdateSystemSettingsDto, currentUser: AuthenticatedUser) {
    const companyProfile = normalizeCompanyProfile(this.toRecord(dto.companyProfile));
    const notificationPolicy = normalizeNotificationPolicy(this.toRecord(dto.notificationPolicy));
    const workspacePreferences = normalizeWorkspacePreferences(
      this.toRecord(dto.workspacePreferences)
    );

    await this.prisma.$transaction([
      this.prisma.systemSetting.upsert({
        where: { settingKey: COMPANY_PROFILE_SETTING_KEY },
        create: {
          settingKey: COMPANY_PROFILE_SETTING_KEY,
          name: "公司信息",
          category: "SYSTEM",
          configJson: companyProfile,
          updatedByUserId: currentUser.id
        },
        update: {
          configJson: companyProfile,
          updatedByUserId: currentUser.id
        }
      }),
      this.prisma.systemSetting.upsert({
        where: { settingKey: NOTIFICATION_POLICY_SETTING_KEY },
        create: {
          settingKey: NOTIFICATION_POLICY_SETTING_KEY,
          name: "通知策略",
          category: "NOTIFICATION",
          configJson: notificationPolicy,
          updatedByUserId: currentUser.id
        },
        update: {
          configJson: notificationPolicy,
          updatedByUserId: currentUser.id
        }
      }),
      this.prisma.systemSetting.upsert({
        where: { settingKey: WORKSPACE_PREFERENCES_SETTING_KEY },
        create: {
          settingKey: WORKSPACE_PREFERENCES_SETTING_KEY,
          name: "工作区偏好",
          category: "WORKSPACE",
          configJson: workspacePreferences,
          updatedByUserId: currentUser.id
        },
        update: {
          configJson: workspacePreferences,
          updatedByUserId: currentUser.id
        }
      })
    ]);

    await this.auditService.log({
      userId: currentUser.id,
      action: "UPDATE",
      module: "设置",
      targetType: "SystemSetting",
      targetName: "系统设置总览",
      content: "更新系统设置",
      afterSummary: JSON.stringify({
        companyProfile,
        notificationPolicy,
        workspacePreferences
      })
    });

    return this.getOverview();
  }

  async getShiftRoster() {
    const setting = await this.findSetting(SHIFT_ROSTER_SETTING_KEY);

    return {
      config: normalizeShiftRosterConfig(this.toRecord(setting?.configJson)),
      ...this.serializeSettingMeta(setting),
    };
  }

  async updateShiftRoster(dto: UpdateShiftRosterDto, currentUser: AuthenticatedUser) {
    const normalizedConfig = normalizeShiftRosterConfig(this.toRecord(dto.config));
    const previousSetting = await this.findSetting(SHIFT_ROSTER_SETTING_KEY);

    await this.prisma.systemSetting.upsert({
      where: { settingKey: SHIFT_ROSTER_SETTING_KEY },
      create: {
        settingKey: SHIFT_ROSTER_SETTING_KEY,
        name: "班表共享配置",
        category: "SCHEDULE",
        configJson: normalizedConfig,
        updatedByUserId: currentUser.id,
      },
      update: {
        configJson: normalizedConfig,
        updatedByUserId: currentUser.id,
      },
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "UPDATE",
      module: "班表管理",
      targetType: "SystemSetting",
      targetName: "班表共享配置",
      content: "更新共享班表数据",
      beforeSummary: previousSetting
        ? JSON.stringify(normalizeShiftRosterConfig(this.toRecord(previousSetting.configJson)))
        : undefined,
      afterSummary: JSON.stringify(normalizedConfig),
    });

    return this.getShiftRoster();
  }

  private async findSetting(settingKey: string) {
    return this.prisma.systemSetting.findUnique({
      where: { settingKey },
      include: {
        updatedBy: {
          include: {
            role: true
          }
        }
      }
    });
  }

  private toRecord(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private serializeSettingMeta(setting: SettingRecord | null) {
    return {
      updatedAt: setting?.updatedAt ?? null,
      updatedBy: setting?.updatedBy
        ? {
            id: setting.updatedBy.id,
            name: setting.updatedBy.name,
            roleName: setting.updatedBy.role.name
          }
        : null
    };
  }

  private buildWecomStatus() {
    const fieldStates = {
      corpId: Boolean(this.configService.get<string>("WECOM_CORP_ID")?.trim()),
      agentId: Boolean(this.configService.get<string>("WECOM_AGENT_ID")?.trim()),
      secret: Boolean(this.configService.get<string>("WECOM_SECRET")?.trim()),
      token: Boolean(this.configService.get<string>("WECOM_TOKEN")?.trim()),
      aesKey: Boolean(this.configService.get<string>("WECOM_AES_KEY")?.trim()),
      calendarId: Boolean(this.configService.get<string>("WECOM_CALENDAR_ID")?.trim())
    };

    return this.buildIntegrationStatus(
      "企业微信",
      fieldStates,
      "回调密钥与日历 ID 仍保留在服务器环境变量，不进入数据库。"
    );
  }

  private buildCosStatus() {
    const fieldStates = {
      region: Boolean(this.configService.get<string>("COS_REGION")?.trim()),
      bucket: Boolean(this.configService.get<string>("COS_BUCKET")?.trim()),
      secretId: Boolean(this.configService.get<string>("COS_SECRET_ID")?.trim()),
      secretKey: Boolean(this.configService.get<string>("COS_SECRET_KEY")?.trim()),
      uploadPrefix: Boolean(this.configService.get<string>("COS_UPLOAD_PREFIX")?.trim())
    };

    return this.buildIntegrationStatus(
      "COS 文件存储",
      fieldStates,
      "密钥与桶配置继续由环境变量托管，这里只显示接通状态。"
    );
  }

  private buildIntegrationStatus(
    name: string,
    fieldStates: Record<string, boolean>,
    note: string
  ) {
    const configuredFields = Object.entries(fieldStates)
      .filter(([, enabled]) => enabled)
      .map(([field]) => field);
    const missingFields = Object.entries(fieldStates)
      .filter(([, enabled]) => !enabled)
      .map(([field]) => field);

    const status =
      configuredFields.length === 0
        ? "missing"
        : missingFields.length === 0
          ? "ready"
          : "partial";

    return {
      name,
      status,
      configuredFields,
      missingFields,
      note
    };
  }
}
