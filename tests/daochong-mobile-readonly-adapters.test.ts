import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  adaptReadonlyAppointmentDetailToFields,
  adaptReadonlyAppointmentDetailToStatuses,
  adaptReadonlyCompensationRulesToFields,
  adaptReadonlyCompensationRulesToRows,
  adaptReadonlyCompensationRulesToStatuses,
  adaptReadonlyCustomerCardBalancesToRows,
  adaptReadonlyCustomerDetailToPreferenceRows,
  adaptReadonlyCustomerDetailToProfileFields,
  adaptReadonlyCustomerDetailToServiceNoteContextFields,
  adaptReadonlyCustomerDetailToServiceNotePendingRows,
  adaptReadonlyCustomerDetailToServiceNoteReminderFields,
  adaptReadonlyCustomerDetailToServiceNoteReminderTimeline,
  adaptReadonlyCustomerDetailToServiceNoteStatuses,
  adaptReadonlyCustomerDetailToServiceHistory,
  adaptReadonlyCustomersToCustomers,
  adaptReadonlyConsumptionApprovalsToFields,
  adaptReadonlyConsumptionApprovalsToRows,
  adaptReadonlyConsumptionApprovalsToStatuses,
  adaptReadonlyConsumptionApprovalsToTimeline,
  adaptReadonlyEvidenceAssetsToFields,
  adaptReadonlyEvidenceAssetsToRows,
  adaptReadonlyEvidenceAssetsToStatuses,
  adaptReadonlyEvidenceAssetsToTimeline,
  adaptReadonlyBonusExpenseItemsToRows,
  adaptReadonlyFinanceExceptionsToRows,
  adaptReadonlyFinanceSummariesToDraftFields,
  adaptReadonlyFinanceSummariesToRows,
  adaptReadonlyFinanceToStatuses,
  adaptReadonlyFinanceToTimeline,
  adaptReadonlyMeetingNotesToFields,
  adaptReadonlyMeetingNotesToStatuses,
  adaptReadonlyMeetingNotesToTodoRows,
  adaptReadonlyProductsToProjectRows,
  adaptReadonlyProjectCommunicationsToFields,
  adaptReadonlyProjectCommunicationsToRows,
  adaptReadonlyProjectCommunicationsToStatuses,
  adaptReadonlyProjectCommunicationsToTimeline,
  adaptReadonlyRechargesToApprovalActionItems,
  adaptReadonlyRechargesToFields,
  adaptReadonlyRechargesToRows,
  adaptReadonlyRechargesToStatuses,
  adaptReadonlyRosterToTodayStatuses,
  adaptReadonlySettlementDraftsToFields,
  adaptReadonlySettlementDraftsToRows,
  adaptReadonlySettlementDraftsToStatuses,
  adaptReadonlyTasksToAppointments,
  buildReadonlyApiSnapshot,
  buildReadonlyDiagnostics,
} from "../apps/web/components/daochong/mobile/daochongMobile.readonly-adapters";
import {
  fetchDaochongReadonlyAdapterInputWithClient,
  fetchDaochongReadonlyAppointmentDetailWithClient,
  fetchDaochongReadonlyCustomerDetailWithClient,
  fetchDaochongReadonlyHighRiskWithClient,
  getDaochongReadonlyAppointmentsPath,
  getDaochongReadonlyAppointmentDetailPath,
  getDaochongReadonlyBonusExpenseItemsPath,
  getDaochongReadonlyConsumptionApprovalsPath,
  getDaochongReadonlyCompensationRulesPath,
  getDaochongReadonlyCustomerCardBalancesPath,
  getDaochongReadonlyCustomerPreferencesPath,
  getDaochongReadonlyCustomerDetailPath,
  getDaochongReadonlyEvidenceAssetsPath,
  getDaochongReadonlyFetchGate,
  getDaochongReadonlyFinanceEvidenceExceptionsPath,
  getDaochongReadonlyFinanceSummaryPath,
  getDaochongReadonlyMeetingNotesPath,
  getDaochongReadonlyProjectCommunicationsPath,
  getDaochongReadonlyRechargesPath,
  getDaochongReadonlyServiceNotesPath,
  getDaochongReadonlySettlementDraftsPath,
  getDaochongReadonlyWecomReminderDryRunsPath,
} from "../apps/web/components/daochong/mobile/daochongMobile.readonly-fetch";
import {
  apiPlanBlockerRows,
  apiPlanEndpointRows,
  apiPlanPrecheckRows,
  apiPlanRiskRows,
  apiPlanSourceRows,
  apiPlanTimeline,
} from "../apps/web/components/daochong/mobile/daochongMobile.mock";
import { daochongReadonlyEndpointSpecs } from "../apps/web/components/daochong/mobile/daochongMobile.api";
import type { DaochongMobileDataSource, DaochongMobileSnapshot } from "../apps/web/components/daochong/mobile/daochongMobile.types";

function installReadonlyFetchWindowStorage(values: Record<string, string>) {
  const globalWithWindow = globalThis as typeof globalThis & { window?: unknown };
  const previousWindow = globalWithWindow.window;
  const store = new Map(Object.entries(values));

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        removeItem: (key: string) => {
          store.delete(key);
        },
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    },
  });

  return () => {
    if (previousWindow === undefined) {
      delete globalWithWindow.window;
      return;
    }

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: previousWindow,
    });
  };
}

const fallbackAppointments = [
  { time: "16:20", title: "许女士 · 香疗肩颈", note: "mock 预约", action: "处理", tone: "amber" as const, page: "appointment" as const },
];
const fallbackAppointmentDetailFields = [{ label: "预约客户", value: "mock 客户", helper: "mock 详情" }];
const fallbackAppointmentDetailStatuses = [{ title: "预约详情", note: "mock 状态", status: "回退", tone: "amber" as const }];
const fallbackProjectRows = [{ label: "香疗肩颈", note: "mock 项目", value: "398" }];
const fallbackRosterStatuses = [{ title: "慧心", note: "mock 班表", status: "在岗", tone: "green" as const }];
const fallbackCustomers = [{ avatar: "许", name: "许女士", note: "mock 客户", status: "新客", tone: "blue" as const }];
const fallbackCustomerProfileFields = [{ label: "客户姓名", value: "许女士", helper: "mock 资料" }];
const fallbackCustomerHistory = [{ title: "香疗肩颈", note: "mock 服务", meta: "今天", tone: "amber" as const }];
const fallbackCustomerPreferenceRows = [{ label: "环境偏好", note: "mock 偏好", value: "已记录" }];
const fallbackServiceNoteContextFields = [{ label: "关联服务", value: "许女士 · 香疗肩颈", helper: "mock 上下文" }];
const fallbackServiceNotePendingRows = [{ label: "许女士香疗肩颈", note: "mock 待补", value: "待补" }];
const fallbackServiceNoteReminderFields = [{ label: "dry-run 编号", value: "WECOM-DRY", helper: "mock dry-run" }];
const fallbackServiceNoteStatuses = [{ title: "服务后弹出", note: "mock 规则", status: "当场", tone: "green" as const }];
const fallbackServiceNoteTimeline = [{ title: "确认服务完成", note: "mock 链路", meta: "完成", tone: "green" as const }];
const fallbackEvidenceFields = [{ label: "凭证编号", value: "EV-MOCK", helper: "mock 凭证" }];
const fallbackEvidenceRows = [{ label: "充值截图", note: "mock 凭证", value: "必传" }];
const fallbackEvidenceStatuses = [{ title: "原图浏览", note: "mock 权限", status: "可查", tone: "green" as const }];
const fallbackEvidenceTimeline = [{ title: "提交人上传", note: "mock 流转", meta: "上传", tone: "blue" as const }];
const fallbackMeetingNoteFields = [{ label: "会议纪要标题", value: "mock 会议", helper: "mock 字段" }];
const fallbackMeetingTodoRows = [{ label: "燕子补服务纪要", note: "mock 待办", value: "今天" }];
const fallbackMeetingNoteStatuses = [{ title: "待办分发", note: "mock 规则", status: "待办", tone: "blue" as const }];
const fallbackCommunicationFields = [{ label: "沟通主题", value: "mock 沟通", helper: "mock 字段" }];
const fallbackCommunicationRows = [{ label: "新客体验活动", note: "mock 沟通", value: "协作中" }];
const fallbackCommunicationStatuses = [{ title: "跨项目参与", note: "mock 规则", status: "协作", tone: "blue" as const }];
const fallbackCommunicationTimeline = [{ title: "发起沟通", note: "mock 链路", meta: "发起", tone: "blue" as const }];
const fallbackFinanceRows = [{ label: "已确认充值", note: "mock 财务", value: "36.8k" }];
const fallbackFinanceDraftFields = [{ label: "汇总月份", value: "2026-06", helper: "mock 财务草稿" }];
const fallbackFinanceExceptionRows = [{ label: "扣款截图金额不清", note: "mock 异常", value: "退回" }];
const fallbackFinanceBonusRows = [{ label: "团队奖金", note: "mock 奖金报销", value: "1,200" }];
const fallbackFinanceStatuses = [{ title: "草稿汇总", note: "mock 状态", status: "草稿", tone: "amber" as const }];
const fallbackFinanceTimeline = [{ title: "草稿归集", note: "mock 链路", meta: "草稿", tone: "amber" as const }];
const fallbackRechargeFields = [{ label: "客户", value: "林女士", helper: "mock 充值字段" }];
const fallbackRechargeRows = [{ label: "林女士现金充值", note: "mock 充值", value: "待审批" }];
const fallbackRechargeStatuses = [{ title: "程程审批", note: "mock 充值规则", status: "一审", tone: "blue" as const }];
const fallbackSettlementDraftFields = [{ label: "草稿编号", value: "SET-MOCK", helper: "mock 草稿字段" }];
const fallbackSettlementDraftRows = [{ label: "许女士香疗肩颈", note: "mock 草稿", value: "可提交" }];
const fallbackSettlementStatuses = [{ title: "提交审批", note: "mock 结算规则", status: "提交", tone: "green" as const }];
const fallbackApprovalFields = [{ label: "审批编号", value: "APP-MOCK", helper: "mock 审批字段" }];
const fallbackApprovalRows = [{ label: "许女士耗卡审批", note: "mock 审批", value: "待审批" }];
const fallbackApprovalStatuses = [{ title: "待审批", note: "mock 审批状态", status: "680 元", tone: "amber" as const }];
const fallbackApprovalTimeline = [{ title: "老师提交", note: "mock 审批链路", meta: "提交", tone: "blue" as const }];

test("Daochong readonly product adapter maps existing Product fields", () => {
  const rows = adaptReadonlyProductsToProjectRows(
    [
      {
        displayName: "道冲头疗",
        salePrice: "980.00",
        spec: "90 分钟",
        unit: "次",
        status: "ENABLED",
        quoteEnabled: true,
        employeeVisible: true,
      },
      {
        displayName: "停用项目",
        salePrice: 100,
        employeeVisible: false,
      },
    ],
    fallbackProjectRows,
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, "道冲头疗");
  assert.equal(rows[0].value, "980");
  assert.match(rows[0].note, /90 分钟/);
});

test("Daochong readonly product adapter falls back when records are empty", () => {
  const rows = adaptReadonlyProductsToProjectRows([], fallbackProjectRows);
  assert.deepEqual(rows, fallbackProjectRows);
});

test("Daochong readonly roster adapter maps shift roster staff", () => {
  const rows = adaptReadonlyRosterToTodayStatuses(
    {
      config: {
        staff: {
          daochong: [
            {
              name: "燕子",
              position: "老师",
              phone: "13800000000",
            },
          ],
        },
      },
    },
    fallbackRosterStatuses,
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "燕子");
  assert.equal(rows[0].status, "可排");
  assert.match(rows[0].note, /老师/);
});

test("Daochong readonly tasks adapter maps schedule tasks as appointment candidates", () => {
  const rows = adaptReadonlyTasksToAppointments(
    {
      items: [
        {
          id: "task-1",
          title: "头疗复调",
          type: "FOLLOW_UP",
          status: "TODO",
          startAt: "2026-06-23T13:30:00+08:00",
          content: "确认睡眠改善情况",
          customer: { id: "customer-1", name: "林女士" },
          assignee: { displayName: "慧心" },
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    },
    fallbackAppointments,
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "task-1");
  assert.equal(rows[0].time, "13:30");
  assert.equal(rows[0].title, "林女士 · 头疗复调");
  assert.match(rows[0].note, /客户跟进/);
  assert.match(rows[0].note, /慧心负责/);
  assert.equal(rows[0].action, "处理");
  assert.equal(rows[0].tone, "amber");
  assert.equal(rows[0].page, "appointment");
});

test("Daochong readonly tasks adapter falls back when records are empty", () => {
  const rows = adaptReadonlyTasksToAppointments({ items: [] }, fallbackAppointments);
  assert.deepEqual(rows, fallbackAppointments);
});

test("Daochong readonly appointment detail maps GET-only Task detail", () => {
  const detail = {
    id: "task-1",
    taskId: "task-1",
    sourceType: "Task",
    customerId: "customer-1",
    customerName: "林女士",
    customerMobile: "13900000000",
    projectId: "project-1",
    projectName: "头疗深度调理",
    teacherId: "teacher-1",
    teacherName: "慧心",
    roomId: "2",
    startsAt: "2026-06-23T10:30:00+08:00",
    endsAt: "2026-06-23T12:00:00+08:00",
    reminderAt: "2026-06-23T10:00:00+08:00",
    arrivalStatus: "TODO",
    serviceStatus: "PENDING",
    settlementDraftId: "settlement-1",
    settlementDraftStatus: "DRAFT",
    serviceNoteId: "note-1",
    serviceNoteStatus: "PENDING",
    readonlyWarnings: ["来源仍是 Task 候选", "当前接口只读展示；不改约、不签到、不确认服务、不提交结算、不发送企业微信。"],
  };

  const fields = adaptReadonlyAppointmentDetailToFields(detail, fallbackAppointmentDetailFields);
  const statuses = adaptReadonlyAppointmentDetailToStatuses(detail, fallbackAppointmentDetailStatuses);

  assert.equal(fields[0].value, "林女士 · 13900000000");
  assert.equal(fields[1].value, "头疗深度调理");
  assert.equal(fields[2].value, "慧心 · 2 号房");
  assert.match(fields[4].helper ?? "", /结算 settlement-1/);
  assert.equal(statuses[0].status, "已读");
  assert.equal(statuses[1].status, "关联");
  assert.match(statuses[2].note, /不改约/);
});

test("Daochong readonly appointment detail falls back when empty", () => {
  assert.deepEqual(
    adaptReadonlyAppointmentDetailToFields({ items: [] }, fallbackAppointmentDetailFields),
    fallbackAppointmentDetailFields,
  );
  assert.deepEqual(
    adaptReadonlyAppointmentDetailToStatuses({ items: [] }, fallbackAppointmentDetailStatuses),
    fallbackAppointmentDetailStatuses,
  );
});

test("Daochong readonly customer adapter maps paginated Customer records", () => {
  const rows = adaptReadonlyCustomersToCustomers(
    {
      items: [
        {
          id: "customer-1",
          customerName: "王女士",
          mobile: "13900000000",
          owner: { displayName: "程程" },
          status: "COOPERATING",
          _count: { followups: 3 },
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    },
    fallbackCustomers,
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "customer-1");
  assert.equal(rows[0].avatar, "王");
  assert.equal(rows[0].name, "王女士");
  assert.equal(rows[0].status, "合作中");
  assert.equal(rows[0].tone, "green");
  assert.match(rows[0].note, /负责人 程程/);
});

test("Daochong readonly customer adapter falls back when records are empty", () => {
  const rows = adaptReadonlyCustomersToCustomers({ items: [] }, fallbackCustomers);
  assert.deepEqual(rows, fallbackCustomers);
});

test("Daochong readonly customer detail adapter maps CRM detail without pretending card data exists", () => {
  const detail = {
    id: "customer-1",
    name: "王女士",
    mobile: "13900000000",
    owner: { displayName: "程程" },
    province: "广东省",
    city: "深圳市",
    source: "老客推荐",
    status: "COOPERATING",
    remark: "偏好安静沟通",
    followups: [
      {
        content: "睡眠反馈改善，建议一周后回访",
        createdAt: "2026-06-22T08:00:00.000Z",
        creator: { displayName: "燕子" },
        followupType: "WECHAT",
        nextAction: "预约复调",
      },
    ],
    quotations: [
      {
        createdAt: "2026-06-21T08:00:00.000Z",
        quotationNo: "Q-001",
        status: "GENERATED",
        totalAmount: "398.00",
        type: "SERVICE",
      },
    ],
    tasks: [
      {
        assignee: { displayName: "慧心" },
        content: "确认下次到店时间",
        startAt: "2026-06-23T08:00:00.000Z",
        status: "PENDING",
        title: "回访任务",
      },
    ],
  };

  const profileFields = adaptReadonlyCustomerDetailToProfileFields(detail, fallbackCustomerProfileFields);
  const history = adaptReadonlyCustomerDetailToServiceHistory(detail, fallbackCustomerHistory);
  const preferenceRows = adaptReadonlyCustomerDetailToPreferenceRows(detail, fallbackCustomerPreferenceRows);

  assert.equal(profileFields[0].value, "王女士");
  assert.match(profileFields[1].value, /13900000000/);
  assert.match(profileFields[4].value, /深圳市/);
  assert.equal(history[0].title, "回访任务");
  assert.ok(history.some((item) => item.title === "微信跟进"));
  assert.ok(history.some((item) => item.title === "报价 Q-001"));
  assert.equal(preferenceRows.find((row) => row.label === "CRM 跟进")?.value, "1 条");
  assert.equal(preferenceRows.find((row) => row.label === "卡项余额")?.value, "待接");
  assert.match(preferenceRows.find((row) => row.label === "个人爱好")?.note ?? "", /不能从 CRM 跟进直接等同/);
});

test("Daochong readonly customer card balance adapter maps GET-only preview rows", () => {
  const rows = adaptReadonlyCustomerCardBalancesToRows(
    {
      items: [
        {
          customerId: "customer-1",
          customerName: "王女士",
          cardId: "stored-value-balance",
          cardName: "客户储值余额预览",
          remainingAmount: "2641.80",
          remainingTimes: null,
          lastRechargeId: "recharge-1",
          lastConsumptionApprovalId: "approval-1",
          balanceStatus: "derived_readonly_preview",
          computedAt: "2026-06-23T10:00:00.000Z",
          readonlyWarnings: ["余额来自已确认且已入账充值减已通过耗卡审批的只读预览，不是最终卡台账。"],
          summary: {
            confirmedRechargeAmount: "3000.00",
            approvedConsumeAmount: "358.20",
            rechargeCount: 1,
            consumptionApprovalCount: 1,
          },
        },
      ],
    },
    [
      { label: "卡项余额", note: "mock 待接", value: "待接" },
      { label: "环境偏好", note: "mock 偏好", value: "已记录" },
    ],
  );

  assert.equal(rows[0].label, "卡项余额");
  assert.equal(rows[0].value, "2,641.8");
  assert.match(rows[0].note, /客户储值余额预览/);
  assert.match(rows[0].note, /已入账 3,000/);
  assert.match(rows[0].note, /已耗卡 358.2/);
  assert.match(rows[0].note, /最近充值 recharge-1/);
  assert.match(rows[0].note, /最近耗卡 approval-1/);
  assert.match(rows[0].note, /不是最终卡台账/);
  assert.equal(rows.find((row) => row.label === "环境偏好")?.value, "已记录");
});

test("Daochong readonly compensation rules adapter maps GET-only source rows", () => {
  const response = {
    items: [
      {
        id: "rule-1",
        teacherId: "teacher-1",
        teacher: { id: "teacher-1", name: "慧心" },
        effectiveMonth: "2026-06",
        baseSalary: "5000.00",
        manualCommissionRate: "8",
        fixedCommissionAmount: "80",
        bonusRules: ["推荐奖金"],
        welfareRules: ["节日福利"],
        ruleStatus: "ACTIVE",
        version: "v1",
        readonlyWarnings: ["薪酬配置只读展示，不确认工资。"],
        updatedAt: "2026-06-23T10:00:00.000Z",
      },
    ],
  };

  const rows = adaptReadonlyCompensationRulesToRows(response, fallbackFinanceRows);
  const fields = adaptReadonlyCompensationRulesToFields(response, fallbackFinanceDraftFields);
  const statuses = adaptReadonlyCompensationRulesToStatuses(response, fallbackFinanceStatuses);

  assert.equal(rows[0].label, "慧心薪酬规则");
  assert.equal(rows[0].value, "5,000");
  assert.match(rows[0].note, /生效 2026-06/);
  assert.match(rows[0].note, /提点 8%/);
  assert.equal(fields.find((field) => field.label === "底薪")?.value, "5,000");
  assert.match(fields.find((field) => field.label === "提点规则")?.value ?? "", /8%/);
  assert.equal(statuses[0].title, "compensation-rules GET");
  assert.equal(statuses[1].status, "已配置");
  assert.equal(statuses[3].status, "关闭");
});

test("Daochong readonly customer detail adapter keeps explicit fallback and empty state", () => {
  assert.deepEqual(
    adaptReadonlyCustomerDetailToProfileFields(null, fallbackCustomerProfileFields),
    fallbackCustomerProfileFields,
  );
  assert.deepEqual(
    adaptReadonlyCustomerDetailToServiceHistory(null, fallbackCustomerHistory),
    fallbackCustomerHistory,
  );
  assert.deepEqual(
    adaptReadonlyCustomerDetailToPreferenceRows(null, fallbackCustomerPreferenceRows),
    fallbackCustomerPreferenceRows,
  );

  const history = adaptReadonlyCustomerDetailToServiceHistory({ id: "customer-1" }, fallbackCustomerHistory);
  assert.equal(history[0].title, "暂无 CRM 跟进、报价或任务");
});

test("Daochong readonly customer detail maps followups to service note candidates", () => {
  const detail = {
    id: "customer-1",
    name: "王女士",
    remark: "偏好安静房间",
    followups: [
      {
        content: "服务后反馈睡眠改善",
        createdAt: "2026-06-22T08:00:00.000Z",
        creator: { displayName: "燕子" },
        followupDate: "2026-06-22T08:00:00.000Z",
        followupType: "WECHAT",
        keyPoints: "睡眠改善",
        nextAction: "7 天后复调",
        nextFollowupAt: "2026-06-29T09:30:00.000Z",
        needReminder: true,
      },
    ],
  };

  const contextFields = adaptReadonlyCustomerDetailToServiceNoteContextFields(detail, fallbackServiceNoteContextFields);
  const pendingRows = adaptReadonlyCustomerDetailToServiceNotePendingRows(detail, fallbackServiceNotePendingRows);
  const reminderFields = adaptReadonlyCustomerDetailToServiceNoteReminderFields(detail, fallbackServiceNoteReminderFields);
  const statuses = adaptReadonlyCustomerDetailToServiceNoteStatuses(detail, fallbackServiceNoteStatuses);
  const timeline = adaptReadonlyCustomerDetailToServiceNoteReminderTimeline(detail, fallbackServiceNoteTimeline);

  assert.equal(contextFields[0].value, "王女士");
  assert.match(contextFields.find((field) => field.label === "最近候选记录")?.value ?? "", /微信跟进/);
  assert.equal(pendingRows[0].value, "有回访");
  assert.match(pendingRows[0].note, /睡眠改善/);
  assert.equal(reminderFields.find((field) => field.label === "发送状态")?.value, "dry-run 未发送");
  assert.equal(statuses.find((item) => item.title === "serviceNotes 接口")?.status, "待建");
  assert.equal(statuses.find((item) => item.title === "CRM 跟进候选")?.status, "1 条");
  assert.equal(timeline[0].title, "候选提醒");
});

test("Daochong readonly customer detail prefers formal service notes and preferences when available", () => {
  const detail = { id: "customer-1", name: "王女士", followups: [] };
  const serviceNotes = {
    items: [
      {
        completedAt: "2026-06-23T18:00:00+08:00",
        customerFeedback: "力度刚好",
        customerId: "customer-1",
        dueAt: "2026-06-23T22:00:00+08:00",
        id: "note-1",
        nextSuggestion: "下次加头疗",
        noteStatus: "COMPLETED",
        preferenceSyncStatus: "SYNCED",
        serviceSummary: "肩颈放松后睡眠改善",
        sourceType: "APPOINTMENT_COMPLETED",
        teacherId: "teacher-1",
      },
    ],
  };
  const preferences = {
    items: [
      {
        customerId: "customer-1",
        id: "pref-1",
        preferenceLabel: "肩颈力度",
        preferenceType: "PRESSURE",
        preferenceValue: "中等偏轻",
        sourceServiceNoteId: "note-1",
        visibility: "SERVICE_TEAM",
      },
    ],
  };

  const preferenceRows = adaptReadonlyCustomerDetailToPreferenceRows(detail, fallbackCustomerPreferenceRows, preferences);
  const contextFields = adaptReadonlyCustomerDetailToServiceNoteContextFields(detail, fallbackServiceNoteContextFields, serviceNotes);
  const pendingRows = adaptReadonlyCustomerDetailToServiceNotePendingRows(detail, fallbackServiceNotePendingRows, serviceNotes);
  const statuses = adaptReadonlyCustomerDetailToServiceNoteStatuses(detail, fallbackServiceNoteStatuses, serviceNotes, preferences);
  const timeline = adaptReadonlyCustomerDetailToServiceNoteReminderTimeline(detail, fallbackServiceNoteTimeline, serviceNotes);

  assert.equal(preferenceRows[0].label, "肩颈力度");
  assert.match(contextFields.find((field) => field.label === "本次摘要")?.value ?? "", /睡眠改善/);
  assert.equal(pendingRows[0].value, "已完成");
  assert.equal(statuses.find((item) => item.title === "serviceNotes 接口")?.status, "1 条");
  assert.equal(statuses.find((item) => item.title === "个人爱好同步")?.status, "1 条");
  assert.equal(timeline[0].title, "正式纪要完成");
});

test("Daochong readonly wecom reminder dry-run preview overrides service note reminder mock", () => {
  const dryRuns = {
    items: [
      {
        id: "dry-run-note-1",
        serviceNoteId: "note-1",
        teacherId: "teacher-1",
        teacher: { id: "teacher-1", name: "慧心", wecomUserId: "huixin" },
        cardTitle: "王女士服务纪要待补填",
        cardSummary: "服务完成后 12 小时仍需补充纪要。",
        jumpPage: "/daochong-mobile?serviceNoteId=note-1&page=serviceNote",
        scheduledAt: "2026-06-23T22:00:00+08:00",
        dryRunStatus: "ready_to_preview",
        readonlyWarnings: ["本接口只生成企业微信提醒预览，不创建通知记录。"],
      },
    ],
  };

  const fields = adaptReadonlyCustomerDetailToServiceNoteReminderFields(null, fallbackServiceNoteReminderFields, null, dryRuns);
  const statuses = adaptReadonlyCustomerDetailToServiceNoteStatuses(null, fallbackServiceNoteStatuses, null, null, dryRuns);
  const timeline = adaptReadonlyCustomerDetailToServiceNoteReminderTimeline(null, fallbackServiceNoteTimeline, null, dryRuns);

  assert.equal(fields.find((field) => field.label === "dry-run 来源")?.value, "wecom-reminder-dry-runs GET");
  assert.equal(fields.find((field) => field.label === "提醒对象")?.value, "慧心");
  assert.equal(fields.find((field) => field.label === "发送状态")?.value, "dry-run 未发送");
  assert.equal(statuses.find((item) => item.title === "wecom-reminder-dry-runs GET")?.status, "1 条预览");
  assert.equal(timeline[0].title, "dry-run 待发送预览");
  assert.match(timeline[0].note, /不创建通知/);
});

test("Daochong readonly service note candidates keep fallback and empty states", () => {
  assert.deepEqual(
    adaptReadonlyCustomerDetailToServiceNoteContextFields(null, fallbackServiceNoteContextFields),
    fallbackServiceNoteContextFields,
  );
  assert.deepEqual(
    adaptReadonlyCustomerDetailToServiceNotePendingRows(null, fallbackServiceNotePendingRows),
    fallbackServiceNotePendingRows,
  );
  assert.deepEqual(
    adaptReadonlyCustomerDetailToServiceNoteReminderFields(null, fallbackServiceNoteReminderFields),
    fallbackServiceNoteReminderFields,
  );
  assert.deepEqual(
    adaptReadonlyCustomerDetailToServiceNoteStatuses(null, fallbackServiceNoteStatuses),
    fallbackServiceNoteStatuses,
  );
  assert.deepEqual(
    adaptReadonlyCustomerDetailToServiceNoteReminderTimeline(null, fallbackServiceNoteTimeline),
    fallbackServiceNoteTimeline,
  );

  const rows = adaptReadonlyCustomerDetailToServiceNotePendingRows({ id: "customer-1", name: "王女士" }, fallbackServiceNotePendingRows);
  const timeline = adaptReadonlyCustomerDetailToServiceNoteReminderTimeline({ id: "customer-1", name: "王女士" }, fallbackServiceNoteTimeline);

  assert.equal(rows[0].value, "待接");
  assert.equal(timeline[0].title, "等待正式服务纪要");
});

test("Daochong readonly evidence asset adapters prefer formal FileRecord mappings", () => {
  const response = {
    items: [
      {
        assetType: "现金照片",
        businessId: "recharge-1",
        businessType: "daochong-recharge",
        fileName: "cash-proof.jpg",
        fileSizeBytes: 2048,
        id: "ev-1",
        originalUrl: "/files/cash-proof.jpg",
        permissionScope: "chengcheng,finance",
        reviewStatus: "PENDING_REVIEW",
        returnReason: "金额清晰",
        uploadedAt: "2026-06-23T17:10:00+08:00",
        uploadedBy: { name: "燕子" },
        updatedAt: "2026-06-23T17:12:00+08:00",
        visibleRoles: ["chengcheng", "finance"],
      },
    ],
  };

  const fields = adaptReadonlyEvidenceAssetsToFields(response, fallbackEvidenceFields);
  const rows = adaptReadonlyEvidenceAssetsToRows(response, fallbackEvidenceRows);
  const timeline = adaptReadonlyEvidenceAssetsToTimeline(response, fallbackEvidenceTimeline);
  const statuses = adaptReadonlyEvidenceAssetsToStatuses(response, fallbackEvidenceStatuses);

  assert.equal(fields[0].value, "ev-1");
  assert.match(fields.find((field) => field.label === "关联业务")?.value ?? "", /daochong-recharge/);
  assert.equal(rows[0].label, "cash-proof.jpg");
  assert.equal(rows[0].value, "待复核");
  assert.match(timeline[0].note, /有原图链接/);
  assert.equal(statuses.find((item) => item.title === "evidence-assets GET")?.status, "1 条");
  assert.equal(statuses.find((item) => item.title === "复核状态")?.status, "1 条待复核");
});

test("Daochong readonly evidence asset adapters keep fallback when empty", () => {
  assert.deepEqual(adaptReadonlyEvidenceAssetsToFields({ items: [] }, fallbackEvidenceFields), fallbackEvidenceFields);
  assert.deepEqual(adaptReadonlyEvidenceAssetsToRows({ items: [] }, fallbackEvidenceRows), fallbackEvidenceRows);
  assert.deepEqual(adaptReadonlyEvidenceAssetsToTimeline({ items: [] }, fallbackEvidenceTimeline), fallbackEvidenceTimeline);
  assert.deepEqual(adaptReadonlyEvidenceAssetsToStatuses({ items: [] }, fallbackEvidenceStatuses), fallbackEvidenceStatuses);
});

test("Daochong readonly meeting note adapters prefer formal MeetingMinutesRecord mappings", () => {
  const response = {
    items: [
      {
        archiveStatus: "readonly",
        attachmentIds: ["file-1", "file-2"],
        conclusion: "头疗体验转化好，继续跟进睡眠反馈",
        createdBy: "程程",
        folderId: "daochong-weekly",
        id: "meeting-1",
        meetingAt: "2026-06-23T19:30:00+08:00",
        relatedCustomerIds: ["customer-1"],
        title: "六月新客体验活动复盘",
        todoItems: ["燕子补服务纪要", "光的家园回访"],
        ownerUserIds: ["teacher-1", "owner-1"],
        updatedAt: "2026-06-23T20:00:00+08:00",
      },
    ],
  };

  const fields = adaptReadonlyMeetingNotesToFields(response, fallbackMeetingNoteFields);
  const rows = adaptReadonlyMeetingNotesToTodoRows(response, fallbackMeetingTodoRows);
  const statuses = adaptReadonlyMeetingNotesToStatuses(response, fallbackMeetingNoteStatuses);

  assert.equal(fields[0].value, "六月新客体验活动复盘");
  assert.match(fields.find((field) => field.label === "讨论结论")?.value ?? "", /头疗体验/);
  assert.equal(rows[0].label, "燕子补服务纪要");
  assert.match(rows[0].note, /负责人 teacher-1/);
  assert.equal(statuses.find((item) => item.title === "meeting-notes GET")?.status, "1 条");
  assert.equal(statuses.find((item) => item.title === "待办分发")?.status, "2 项");
});

test("Daochong readonly meeting note adapters keep fallback when empty", () => {
  assert.deepEqual(adaptReadonlyMeetingNotesToFields({ items: [] }, fallbackMeetingNoteFields), fallbackMeetingNoteFields);
  assert.deepEqual(adaptReadonlyMeetingNotesToTodoRows({ items: [] }, fallbackMeetingTodoRows), fallbackMeetingTodoRows);
  assert.deepEqual(adaptReadonlyMeetingNotesToStatuses({ items: [] }, fallbackMeetingNoteStatuses), fallbackMeetingNoteStatuses);
});

test("Daochong readonly project communication adapters prefer formal MeetingMinutesRecord mappings", () => {
  const response = {
    items: [
      {
        attachmentIds: ["file-1"],
        createdBy: "程程",
        discussionSummary: "光的家园提供活动客户，道冲负责体验后跟进",
        folderId: "daochong-weekly",
        id: "communication-1",
        meetingNoteId: "meeting-1",
        participants: ["程程", "燕子", "光的家园小组"],
        privacyLevel: "internal_readonly",
        projectScopes: ["光的家园", "道冲元气"],
        relatedCustomerIds: ["customer-1", "customer-2"],
        status: "in_progress",
        topic: "新客体验活动协作",
        updatedAt: "2026-06-23T20:00:00+08:00",
      },
    ],
  };

  const fields = adaptReadonlyProjectCommunicationsToFields(response, fallbackCommunicationFields);
  const rows = adaptReadonlyProjectCommunicationsToRows(response, fallbackCommunicationRows);
  const statuses = adaptReadonlyProjectCommunicationsToStatuses(response, fallbackCommunicationStatuses);
  const timeline = adaptReadonlyProjectCommunicationsToTimeline(response, fallbackCommunicationTimeline);

  assert.equal(fields[0].value, "新客体验活动协作");
  assert.match(fields.find((field) => field.label === "参与项目")?.value ?? "", /光的家园/);
  assert.equal(rows[0].value, "协作中");
  assert.match(rows[0].note, /客户 customer-1、customer-2/);
  assert.equal(statuses.find((item) => item.title === "project-communications GET")?.status, "1 条");
  assert.equal(statuses.find((item) => item.title === "跨项目参与")?.status, "3 人次");
  assert.equal(timeline[0].title, "新客体验活动协作");
  assert.match(timeline[0].note, /附件 1/);
});

test("Daochong readonly project communication adapters keep fallback when empty", () => {
  assert.deepEqual(adaptReadonlyProjectCommunicationsToFields({ items: [] }, fallbackCommunicationFields), fallbackCommunicationFields);
  assert.deepEqual(adaptReadonlyProjectCommunicationsToRows({ items: [] }, fallbackCommunicationRows), fallbackCommunicationRows);
  assert.deepEqual(adaptReadonlyProjectCommunicationsToStatuses({ items: [] }, fallbackCommunicationStatuses), fallbackCommunicationStatuses);
  assert.deepEqual(adaptReadonlyProjectCommunicationsToTimeline({ items: [] }, fallbackCommunicationTimeline), fallbackCommunicationTimeline);
});

test("Daochong readonly money adapters prefer formal money source records", () => {
  const recharges = {
    items: [
      {
        amount: "3000.00",
        cashAmount: "3000.00",
        cashCustodian: { name: "程程" },
        cashPhotoAssetIds: ["cash-1"],
        customer: { name: "林女士" },
        evidenceAssetIds: ["ev-1"],
        financeSummaryMonth: "2026-06",
        id: "recharge-1",
        paymentMethod: "CASH",
        rechargeStatus: "PENDING_LIMENG_REVIEW",
        submittedBy: { name: "燕子" },
        updatedAt: "2026-06-23T20:00:00+08:00",
      },
    ],
  };
  const settlementDrafts = {
    items: [
      {
        appointmentId: "appointment-1",
        canSubmitApproval: true,
        cardMode: "NO_CARD",
        customer: { name: "许女士" },
        discountAmount: "39.80",
        discountReason: "活动体验名额",
        draftStatus: "READY_FOR_APPROVAL",
        evidenceAssetIds: ["ev-2"],
        finalAmount: "358.20",
        id: "settlement-1",
        originalAmount: "398.00",
        project: { name: "香疗肩颈" },
        referralBonusAmount: "80.00",
        referrerName: "林女士",
        teacher: { name: "燕子" },
        updatedAt: "2026-06-23T20:10:00+08:00",
      },
    ],
  };
  const approvals = {
    items: [
      {
        approvalStatus: "RETURNED",
        consumeAmount: "358.20",
        customer: { name: "许女士" },
        discountReason: "活动体验名额",
        evidenceAssetIds: ["ev-2"],
        id: "approval-1",
        referrerName: "林女士",
        returnReason: "截图金额不清",
        returnedAt: "2026-06-23T20:20:00+08:00",
        settlementDraftId: "settlement-1",
        supplementRequirements: "补传扣款原图",
        teacher: { name: "燕子" },
        updatedAt: "2026-06-23T20:20:00+08:00",
      },
    ],
  };

  const rechargeFields = adaptReadonlyRechargesToFields(recharges, fallbackRechargeFields);
  const rechargeRows = adaptReadonlyRechargesToRows(recharges, fallbackRechargeRows);
  const rechargeStatuses = adaptReadonlyRechargesToStatuses(recharges, fallbackRechargeStatuses);
  const rechargeApprovalItems = adaptReadonlyRechargesToApprovalActionItems(recharges);
  const settlementFields = adaptReadonlySettlementDraftsToFields(settlementDrafts, fallbackSettlementDraftFields);
  const settlementRows = adaptReadonlySettlementDraftsToRows(settlementDrafts, fallbackSettlementDraftRows);
  const settlementStatuses = adaptReadonlySettlementDraftsToStatuses(settlementDrafts, fallbackSettlementStatuses);
  const approvalFields = adaptReadonlyConsumptionApprovalsToFields(approvals, fallbackApprovalFields);
  const approvalRows = adaptReadonlyConsumptionApprovalsToRows(approvals, fallbackApprovalRows);
  const approvalStatuses = adaptReadonlyConsumptionApprovalsToStatuses(approvals, fallbackApprovalStatuses);
  const approvalTimeline = adaptReadonlyConsumptionApprovalsToTimeline(approvals, fallbackApprovalTimeline);

  assert.equal(rechargeFields[0].value, "林女士");
  assert.equal(rechargeRows[0].value, "立猛待复核");
  assert.equal(rechargeStatuses.find((item) => item.title === "recharges GET")?.status, "1 条");
  assert.equal(rechargeStatuses.find((item) => item.title === "现金交接")?.status, "1 条");
  assert.equal(rechargeApprovalItems[0].canLimengReview, true);
  assert.equal(rechargeApprovalItems[0].canChengchengApprove, false);
  assert.equal(settlementFields.find((field) => field.label === "草稿编号")?.value, "settlement-1");
  assert.equal(settlementRows[0].value, "可提交");
  assert.equal(settlementStatuses.find((item) => item.title === "settlement-drafts GET")?.status, "1 条");
  assert.equal(settlementStatuses.find((item) => item.title === "提交审批")?.status, "1 条可提交");
  assert.equal(approvalFields.find((field) => field.label === "审批编号")?.value, "approval-1");
  assert.equal(approvalRows[0].value, "已退回");
  assert.equal(approvalStatuses.find((item) => item.title === "consumption-approvals GET")?.status, "1 条");
  assert.equal(approvalStatuses.find((item) => item.title === "退回补充")?.status, "1 条");
  assert.equal(approvalTimeline[0].title, "审批只读退回");
  assert.match(approvalTimeline[0].note, /补传扣款原图/);
});

test("Daochong readonly money adapters keep fallback when empty", () => {
  assert.deepEqual(adaptReadonlyRechargesToFields({ items: [] }, fallbackRechargeFields), fallbackRechargeFields);
  assert.deepEqual(adaptReadonlyRechargesToRows({ items: [] }, fallbackRechargeRows), fallbackRechargeRows);
  assert.deepEqual(adaptReadonlyRechargesToStatuses({ items: [] }, fallbackRechargeStatuses), fallbackRechargeStatuses);
  assert.deepEqual(adaptReadonlySettlementDraftsToFields({ items: [] }, fallbackSettlementDraftFields), fallbackSettlementDraftFields);
  assert.deepEqual(adaptReadonlySettlementDraftsToRows({ items: [] }, fallbackSettlementDraftRows), fallbackSettlementDraftRows);
  assert.deepEqual(adaptReadonlySettlementDraftsToStatuses({ items: [] }, fallbackSettlementStatuses), fallbackSettlementStatuses);
  assert.deepEqual(adaptReadonlyConsumptionApprovalsToFields({ items: [] }, fallbackApprovalFields), fallbackApprovalFields);
  assert.deepEqual(adaptReadonlyConsumptionApprovalsToRows({ items: [] }, fallbackApprovalRows), fallbackApprovalRows);
  assert.deepEqual(adaptReadonlyConsumptionApprovalsToStatuses({ items: [] }, fallbackApprovalStatuses), fallbackApprovalStatuses);
  assert.deepEqual(adaptReadonlyConsumptionApprovalsToTimeline({ items: [] }, fallbackApprovalTimeline), fallbackApprovalTimeline);
});

test("Daochong readonly finance adapters prefer formal finance source records", () => {
  const financeSummary = {
    items: [
      {
        approvedConsumeAmount: "58600.00",
        canConfirmFinance: false,
        commissionAmount: "7800.00",
        confirmedRechargeAmount: "36800.00",
        evidenceAssetIds: ["ev-1", "ev-2"],
        exceptionCount: 1,
        expenseAmount: "2100.00",
        financeStatus: "READY_FOR_REVIEW",
        id: "finance-2026-06",
        payrollPreviewStatus: "DRAFT",
        pendingCashCustodyAmount: "3000.00",
        referralBonusAmount: "320.00",
        sourceCutoffAt: "2026-06-23T18:00:00+08:00",
        summaryMonth: "2026-06",
        teamBonusAmount: "1200.00",
        updatedAt: "2026-06-23T20:00:00+08:00",
      },
    ],
  };
  const financeExceptions = {
    items: [
      {
        businessId: "approval-1",
        businessType: "CONSUMPTION_APPROVAL",
        currentOwner: { name: "燕子" },
        exceptionReason: "扣款截图金额不清",
        exceptionStatus: "PENDING_SUPPLEMENT",
        id: "exception-1",
        supplementRequirements: "补传原图",
        summaryMonth: "2026-06",
        updatedAt: "2026-06-23T20:10:00+08:00",
      },
    ],
  };
  const bonusExpenseItems = {
    items: [
      {
        amount: "1200.00",
        evidenceAssetIds: ["ev-3"],
        financeStatus: "PENDING_FINANCE_REVIEW",
        id: "bonus-1",
        itemType: "TEAM_BONUS",
        reason: "六月新客体验活动达成",
        submittedBy: { name: "程程" },
        summaryMonth: "2026-06",
        targetUser: { name: "燕子" },
        updatedAt: "2026-06-23T20:20:00+08:00",
      },
    ],
  };

  const rows = adaptReadonlyFinanceSummariesToRows(financeSummary, fallbackFinanceRows);
  const fields = adaptReadonlyFinanceSummariesToDraftFields(financeSummary, fallbackFinanceDraftFields);
  const exceptionRows = adaptReadonlyFinanceExceptionsToRows(financeExceptions, fallbackFinanceExceptionRows);
  const bonusRows = adaptReadonlyBonusExpenseItemsToRows(bonusExpenseItems, fallbackFinanceBonusRows);
  const statuses = adaptReadonlyFinanceToStatuses(financeSummary, financeExceptions, bonusExpenseItems, fallbackFinanceStatuses);
  const timeline = adaptReadonlyFinanceToTimeline(financeSummary, financeExceptions, bonusExpenseItems, fallbackFinanceTimeline);

  assert.match(rows[0].label, /2026-06/);
  assert.equal(fields.find((field) => field.label === "草稿编号")?.value, "finance-2026-06");
  assert.equal(exceptionRows[0].value, "待补");
  assert.match(exceptionRows[0].note, /补传原图/);
  assert.equal(bonusRows[0].value, "待财务");
  assert.equal(statuses.find((item) => item.title === "finance-summary GET")?.status, "1 条");
  assert.equal(statuses.find((item) => item.title === "凭证异常")?.status, "1 条待补");
  assert.ok(timeline.some((item) => item.title === "团队奖金"));
});

test("Daochong readonly finance adapters keep fallback when empty", () => {
  assert.deepEqual(adaptReadonlyFinanceSummariesToRows({ items: [] }, fallbackFinanceRows), fallbackFinanceRows);
  assert.deepEqual(adaptReadonlyFinanceSummariesToDraftFields({ items: [] }, fallbackFinanceDraftFields), fallbackFinanceDraftFields);
  assert.deepEqual(adaptReadonlyFinanceExceptionsToRows({ items: [] }, fallbackFinanceExceptionRows), fallbackFinanceExceptionRows);
  assert.deepEqual(adaptReadonlyBonusExpenseItemsToRows({ items: [] }, fallbackFinanceBonusRows), fallbackFinanceBonusRows);
  assert.deepEqual(adaptReadonlyFinanceToStatuses({ items: [] }, { items: [] }, { items: [] }, fallbackFinanceStatuses), fallbackFinanceStatuses);
  assert.deepEqual(adaptReadonlyFinanceToTimeline({ items: [] }, { items: [] }, { items: [] }, fallbackFinanceTimeline), fallbackFinanceTimeline);
});

test("Daochong readonly api plan keeps formal service note and preference gaps explicit", () => {
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "正式服务记录 serviceNotes")?.value,
    "方案",
  );
  assert.match(
    apiPlanSourceRows.find((row) => row.label === "个人爱好模型方案")?.note ?? "",
    /服务纪要同步/,
  );
  assert.match(
    apiPlanBlockerRows.find((row) => row.label === "服务完成事件")?.note ?? "",
    /预约完成、结算草稿.*服务确认/,
  );
});

test("Daochong readonly api plan defines service note and preference model specs without writes", () => {
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "serviceNotes / customerPreferences")?.value,
    "方案",
  );
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-72"));

  const serviceNotes = daochongReadonlyEndpointSpecs.find((endpoint) => endpoint.key === "serviceNotes");
  const customerPreferences = daochongReadonlyEndpointSpecs.find((endpoint) => endpoint.key === "customerPreferences");

  assert.ok(serviceNotes);
  assert.ok(customerPreferences);
  assert.equal(customerPreferences.path, "/api/daochong/mobile/customer-preferences");
  assert.ok(serviceNotes.fields.includes("settlementDraftId"));
  assert.ok(serviceNotes.fields.includes("preferenceSyncStatus"));
  assert.ok(customerPreferences.fields.includes("sourceServiceNoteId"));
  assert.ok(customerPreferences.fields.includes("tabooNotes"));
});

test("Daochong readonly api plan keeps migration precheck as review-only", () => {
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-76"));
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "命名和枚举")?.value,
    "评审",
  );
  assert.match(
    apiPlanRiskRows.find((row) => row.label === "建表回滚")?.note ?? "",
    /只新增表和索引/,
  );
  assert.match(
    apiPlanBlockerRows.find((row) => row.label === "回滚条件")?.note ?? "",
    /未写入前/,
  );
});

test("Daochong readonly api plan keeps migration and controller drafts non executable", () => {
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-80"));
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "readonly controller draft")?.value,
    "草案",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "Prisma 草案")?.value,
    "草案",
  );
  assert.match(
    apiPlanRiskRows.find((row) => row.label === "草案误执行")?.note ?? "",
    /不改 schema/,
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "迁移执行确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-81 to DCM-84 draft files stay review-only", () => {
  const draftRoot = "docs/daochong-mobile-drafts/dcm81-dcm84";
  const draftFiles = [
    `${draftRoot}/schema-extension.draft.prisma`,
    `${draftRoot}/migration.draft.sql`,
    `${draftRoot}/readonly-controller.draft.ts`,
    `${draftRoot}/readonly-service.draft.ts`,
    `${draftRoot}/go-no-go.md`,
  ];

  const combinedDrafts = draftFiles
    .map((draftFile) => {
      assert.ok(existsSync(draftFile), `${draftFile} should exist`);
      assert.ok(!draftFile.startsWith("prisma/migrations/"));
      assert.ok(!draftFile.startsWith("apps/api/src/"));
      return readFileSync(draftFile, "utf8");
    })
    .join("\n");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-84"));
  assert.match(combinedDrafts, /DRAFT ONLY|draft_files_ready_for_review/);
  assert.doesNotMatch(
    combinedDrafts,
    /@Post|@Patch|@Delete|\.create\s*\(|\.update\s*\(|\.delete\s*\(|prisma\s+migrate|sendWecom|wecom.*send/i,
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "草案审阅确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-85 to DCM-88 formal readonly source stays GET-only", () => {
  const sourceFiles = [
    "prisma/schema.prisma",
    "prisma/migrations/20260623103000_daochong_service_notes/migration.sql",
    "apps/api/src/daochong-mobile/daochong-mobile.controller.ts",
    "apps/api/src/daochong-mobile/daochong-mobile.service.ts",
    "apps/api/src/daochong-mobile/dto/daochong-mobile.dto.ts",
  ];
  const combinedSource = sourceFiles
    .map((sourceFile) => {
      assert.ok(existsSync(sourceFile), `${sourceFile} should exist`);
      return readFileSync(sourceFile, "utf8");
    })
    .join("\n");
  const controllerSource = readFileSync(
    "apps/api/src/daochong-mobile/daochong-mobile.controller.ts",
    "utf8",
  );
  const serviceSource = readFileSync(
    "apps/api/src/daochong-mobile/daochong-mobile.service.ts",
    "utf8",
  );

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-88"));
  assert.match(combinedSource, /model DaochongServiceNote/);
  assert.match(combinedSource, /model DaochongCustomerPreference/);
  assert.match(controllerSource, /@Get\("service-notes"\)/);
  assert.match(controllerSource, /@Get\("customer-preferences"\)/);
  assert.doesNotMatch(controllerSource, /@Post|@Patch|@Delete|@Put/);
  assert.doesNotMatch(serviceSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.match(serviceSource, /DAOCHONG_MOBILE_SHADOW_READONLY/);
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "迁移运行确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-89 to DCM-92 frontend readonly fetch stays fallback-first", () => {
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-92"));
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "customer detail readonly fetch")?.value,
    "已接",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "前端正式只读")?.value,
    "已接",
  );
  assert.match(
    apiPlanRiskRows.find((row) => row.label === "前端回退护栏")?.note ?? "",
    /mock\/followups/,
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "真实数据验收")?.value,
    "待确认",
  );
});

test("Daochong DCM-93 to DCM-96 readiness check stays non executing", () => {
  const readinessPath = "scripts/local/daochong-shadow-readonly-readiness.mjs";
  assert.ok(existsSync(readinessPath));
  const readinessSource = readFileSync(readinessPath, "utf8");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-96"));
  assert.match(readinessSource, /DCM-93-DCM-96/);
  assert.match(readinessSource, /DAOCHONG_MOBILE_SHADOW_READONLY/);
  assert.match(readinessSource, /DATABASE_URL host=/);
  assert.doesNotMatch(readinessSource, /child_process|spawn\(|exec\(|writeFile|prisma\s+migrate|docker\s+/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "shadow readiness check")?.value,
    "已备",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "dry-run 执行确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-97 to DCM-100 migration dry-run plan stays non executing", () => {
  const planPath = "scripts/local/daochong-shadow-migration-dryrun-plan.mjs";
  assert.ok(existsSync(planPath));
  const planSource = readFileSync(planPath, "utf8");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-100"));
  assert.match(planSource, /DCM-97-DCM-100/);
  assert.match(planSource, /executesCommands:\s*false/);
  assert.match(planSource, /touchesDatabase:\s*false/);
  assert.match(planSource, /EXPECTED_TABLES/);
  assert.doesNotMatch(planSource, /child_process|spawn\(|exec\(|writeFile|prisma\s+migrate/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "shadow dry-run plan")?.value,
    "计划",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "dry-run 计划护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "本地 dry-run 写库许可")?.value,
    "待确认",
  );
});

test("Daochong DCM-101 to DCM-104 high-risk readonly endpoints stay GET-only", () => {
  const controllerSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.controller.ts", "utf8");
  const serviceSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.service.ts", "utf8");
  const highRiskPaths = [
    "recharges",
    "evidence-assets",
    "settlement-drafts",
    "consumption-approvals",
    "finance-summary",
    "finance-evidence-exceptions",
    "bonus-expense-items",
    "project-communications",
    "meeting-notes",
  ];
  const highRiskSpecKeys = [
    "recharges",
    "evidenceAssets",
    "settlementDrafts",
    "consumptionApprovals",
    "financeSummary",
    "financeEvidenceExceptions",
    "bonusExpenseItems",
    "projectCommunications",
    "meetingNotes",
  ];

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-104"));
  assert.match(serviceSource, /DAOCHONG_MOBILE_HIGH_RISK_READONLY/);
  assert.match(serviceSource, /source_mapping_pending/);
  assert.doesNotMatch(controllerSource, /@(Post|Put|Patch|Delete)\b/);
  assert.doesNotMatch(serviceSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(/);

  for (const path of highRiskPaths) {
    assert.match(controllerSource, new RegExp(`@Get\\("${path}"\\)`));
  }

  for (const key of highRiskSpecKeys) {
    assert.ok(daochongReadonlyEndpointSpecs.some((spec) => spec.key === key));
  }

  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "recharges / evidenceAssets")?.value,
    "已接",
  );
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "projectCommunications / meetingNotes")?.value,
    "已接",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "高风险只读护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "高风险真实来源映射")?.value,
    "待确认",
  );
});

test("Daochong DCM-105 to DCM-108 high-risk source map stays read-only", () => {
  const sourceMapPath = "scripts/local/daochong-high-risk-source-map.mjs";
  assert.ok(existsSync(sourceMapPath));
  const sourceMap = readFileSync(sourceMapPath, "utf8");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-108"));
  assert.match(sourceMap, /DCM-105-DCM-108/);
  assert.match(sourceMap, /DaochongCustomerRecharge/);
  assert.match(sourceMap, /DaochongFinanceSummary/);
  assert.match(sourceMap, /MeetingMinutesRecord/);
  assert.match(sourceMap, /touchesDatabase:\s*false/);
  assert.doesNotMatch(sourceMap, /child_process|spawn\(|exec\(|writeFile|prisma\s+migrate|docker\s+/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "high-risk source map")?.value,
    "已扫",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "来源映射护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "凭证来源")?.value,
    "已接",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "资金迁移运行确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-109 to DCM-112 evidence and meeting readonly mappings stay read-only", () => {
  const serviceSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.service.ts", "utf8");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-112"));
  assert.match(serviceSource, /listEvidenceAssets/);
  assert.match(serviceSource, /fileRecord\.findMany/);
  assert.match(serviceSource, /mapEvidenceAsset/);
  assert.match(serviceSource, /listMeetingNotes/);
  assert.match(serviceSource, /meetingMinutesRecord\.findMany/);
  assert.match(serviceSource, /mapMeetingNote/);
  assert.doesNotMatch(serviceSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "凭证会议映射护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "会议来源")?.value,
    "已接",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "凭证会议剩余缺口")?.value,
    "缺口",
  );
});

test("Daochong DCM-113 to DCM-116 frontend evidence and meeting fetch stays read-only", () => {
  const fetchSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts", "utf8");
  const adapterSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts", "utf8");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-116"));
  assert.match(fetchSource, /getDaochongReadonlyEvidenceAssetsPath/);
  assert.match(fetchSource, /getDaochongReadonlyMeetingNotesPath/);
  assert.match(fetchSource, /fetchDaochongReadonlyHighRiskWithClient/);
  assert.match(adapterSource, /adaptReadonlyEvidenceAssetsToFields/);
  assert.match(adapterSource, /adaptReadonlyMeetingNotesToFields/);
  assert.match(appSource, /fetchDaochongReadonlyHighRisk/);
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.doesNotMatch(fetchSource, /method:\s*"(POST|PUT|PATCH|DELETE)"|\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.doesNotMatch(adapterSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "evidence / meeting frontend fetch")?.value,
    "已接",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "高风险前端回退")?.value,
    "回退",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "凭证会议前端只读")?.value,
    "已接",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "凭证会议真实验收")?.value,
    "待确认",
  );
});

test("Daochong DCM-117 to DCM-120 project communication readonly mapping stays read-only", () => {
  const serviceSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.service.ts", "utf8");
  const fetchSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts", "utf8");
  const adapterSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts", "utf8");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-120"));
  assert.match(serviceSource, /listProjectCommunications/);
  assert.match(serviceSource, /mapProjectCommunication/);
  assert.match(serviceSource, /project_communications_meeting_record_readonly_mapped/);
  assert.match(fetchSource, /getDaochongReadonlyProjectCommunicationsPath/);
  assert.match(adapterSource, /adaptReadonlyProjectCommunicationsToFields/);
  assert.match(appSource, /runtimeData\.communicationFields/);
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.doesNotMatch(serviceSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.doesNotMatch(fetchSource, /method:\s*"(POST|PUT|PATCH|DELETE)"|\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "projectCommunications / meetingNotes")?.value,
    "已接",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "项目沟通映射护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "项目沟通来源")?.value,
    "已接",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "项目沟通真实验收")?.value,
    "待确认",
  );
});

test("Daochong DCM-121 to DCM-124 money model drafts stay review-only", () => {
  const draftRoot = "docs/daochong-mobile-drafts/dcm121-dcm124";
  const draftFiles = [
    `${draftRoot}/schema-extension.draft.prisma`,
    `${draftRoot}/migration.draft.sql`,
    `${draftRoot}/readonly-controller.draft.ts`,
    `${draftRoot}/readonly-service.draft.ts`,
    `${draftRoot}/go-no-go.md`,
  ];
  const combinedDrafts = draftFiles
    .map((draftFile) => {
      assert.ok(existsSync(draftFile), `${draftFile} should exist`);
      assert.ok(!draftFile.startsWith("prisma/migrations/"));
      assert.ok(!draftFile.startsWith("apps/api/src/"));
      return readFileSync(draftFile, "utf8");
    })
    .join("\n");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-124"));
  assert.match(combinedDrafts, /DRAFT ONLY|money_model_draft_files_ready_for_review/);
  assert.match(combinedDrafts, /DaochongCustomerRecharge/);
  assert.match(combinedDrafts, /DaochongServiceSettlementDraft/);
  assert.match(combinedDrafts, /DaochongCardConsumptionApproval/);
  assert.match(combinedDrafts, /PENDING_CHENGCHENG_APPROVAL/);
  assert.match(combinedDrafts, /READY_FOR_APPROVAL/);
  assert.match(combinedDrafts, /supplementRequirements/);
  assert.doesNotMatch(
    combinedDrafts,
    /@Post|@Patch|@Delete|@Put|\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send|prisma\s+migrate/i,
  );
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "money model draft files")?.value,
    "待审",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "资金草案路径隔离")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "资金三件套模型草案")?.value,
    "草案",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "资金草案审阅确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-125 to DCM-128 finance model drafts stay review-only", () => {
  const draftRoot = "docs/daochong-mobile-drafts/dcm125-dcm128";
  const draftFiles = [
    `${draftRoot}/schema-extension.draft.prisma`,
    `${draftRoot}/migration.draft.sql`,
    `${draftRoot}/readonly-controller.draft.ts`,
    `${draftRoot}/readonly-service.draft.ts`,
    `${draftRoot}/go-no-go.md`,
  ];
  const combinedDrafts = draftFiles
    .map((draftFile) => {
      assert.ok(existsSync(draftFile), `${draftFile} should exist`);
      assert.ok(!draftFile.startsWith("prisma/migrations/"));
      assert.ok(!draftFile.startsWith("apps/api/src/"));
      return readFileSync(draftFile, "utf8");
    })
    .join("\n");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-128"));
  assert.match(combinedDrafts, /DRAFT ONLY|finance_model_draft_files_ready_for_review/);
  assert.match(combinedDrafts, /DaochongFinanceSummary/);
  assert.match(combinedDrafts, /DaochongFinanceEvidenceException/);
  assert.match(combinedDrafts, /DaochongBonusExpenseItem/);
  assert.match(combinedDrafts, /PENDING_SUPPLEMENT/);
  assert.match(combinedDrafts, /payrollPreviewStatus/);
  assert.match(combinedDrafts, /supplementRequirements/);
  assert.doesNotMatch(
    combinedDrafts,
    /@Post|@Patch|@Delete|@Put|\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send|prisma\s+migrate/i,
  );
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "finance model draft files")?.value,
    "待审",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "财务草案路径隔离")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "财务三件套模型草案")?.value,
    "草案",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "财务草案审阅确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-129 to DCM-132 finance review package stays review-only", () => {
  const draftRoot = "docs/daochong-mobile-drafts/dcm129-dcm132";
  const draftFiles = [
    `${draftRoot}/review-matrix.md`,
    `${draftRoot}/readonly-contract.draft.json`,
    `${draftRoot}/page-acceptance.md`,
    `${draftRoot}/go-no-go.md`,
  ];
  const combinedDrafts = draftFiles
    .map((draftFile) => {
      assert.ok(existsSync(draftFile), `${draftFile} should exist`);
      assert.ok(!draftFile.startsWith("prisma/migrations/"));
      assert.ok(!draftFile.startsWith("apps/api/src/"));
      return readFileSync(draftFile, "utf8");
    })
    .join("\n");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-132"));
  assert.match(combinedDrafts, /finance_review_package_ready_for_review|finance_readonly_contract_ready_for_review/);
  assert.match(combinedDrafts, /summaryMonth/);
  assert.match(combinedDrafts, /sourceCutoffAt/);
  assert.match(combinedDrafts, /finance-summary/);
  assert.match(combinedDrafts, /finance-evidence-exceptions/);
  assert.match(combinedDrafts, /bonus-expense-items/);
  assert.match(combinedDrafts, /payrollPreviewStatus/);
  assert.doesNotMatch(
    combinedDrafts,
    /@Post|@Patch|@Delete|@Put|\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send|prisma\s+migrate/i,
  );
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "finance review package")?.value,
    "待审",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "财务审阅路径隔离")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "财务审阅确认矩阵")?.value,
    "待审",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "财务审阅包确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-133 to DCM-136 finance readonly source plan stays non executing", () => {
  const draftRoot = "docs/daochong-mobile-drafts/dcm133-dcm136";
  const reviewFiles = [
    `${draftRoot}/readonly-source-plan.md`,
    `${draftRoot}/target-files.draft.json`,
    `${draftRoot}/verification-plan.md`,
    `${draftRoot}/go-no-go.md`,
    "scripts/local/daochong-finance-readonly-source-plan.mjs",
  ];
  const combinedDrafts = reviewFiles
    .map((reviewFile) => {
      assert.ok(existsSync(reviewFile), `${reviewFile} should exist`);
      assert.ok(!reviewFile.startsWith("prisma/migrations/"));
      assert.ok(!reviewFile.startsWith("apps/api/src/"));
      return readFileSync(reviewFile, "utf8");
    })
    .join("\n");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");

  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-136"));
  assert.match(combinedDrafts, /finance_readonly_source_plan_ready_for_review|finance_readonly_source_plan_ready/);
  assert.match(combinedDrafts, /futureSourceTargets|target-files/);
  assert.match(combinedDrafts, /verification-plan|验证计划/);
  assert.match(combinedDrafts, /stopConditions|停止条件/);
  assert.match(combinedDrafts, /readsFilesOnly/);
  assert.match(combinedDrafts, /writesFiles: false|不写文件/);
  assert.doesNotMatch(
    combinedDrafts,
    /@Post|@Patch|@Delete|@Put|\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send|prisma\s+migrate|child_process|spawn\(|exec\(|writeFile/i,
  );
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "finance source plan")?.value,
    "计划",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "财务源码计划护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "财务只读源码计划器")?.value,
    "计划",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "财务只读源码计划确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-137 to DCM-140 finance readonly source stays GET-only", () => {
  const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
  const migrationPath = "prisma/migrations/20260623200000_daochong_finance_readonly_models/migration.sql";
  const migrationSource = readFileSync(migrationPath, "utf8");
  const controllerSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.controller.ts", "utf8");
  const serviceSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.service.ts", "utf8");
  const fetchSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts", "utf8");
  const adapterSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts", "utf8");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");

  assert.ok(existsSync(migrationPath));
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-140"));
  assert.match(schemaSource, /model DaochongFinanceSummary/);
  assert.match(schemaSource, /model DaochongFinanceEvidenceException/);
  assert.match(schemaSource, /model DaochongBonusExpenseItem/);
  assert.match(migrationSource, /CREATE TABLE `DaochongFinanceSummary`/);
  assert.match(migrationSource, /CREATE TABLE `DaochongFinanceEvidenceException`/);
  assert.match(migrationSource, /CREATE TABLE `DaochongBonusExpenseItem`/);
  assert.doesNotMatch(migrationSource, /DROP\s+TABLE|TRUNCATE\s+TABLE|INSERT\s+INTO|UPDATE\s+`|DELETE\s+FROM/i);
  assert.match(controllerSource, /@Get\("finance-summary"\)/);
  assert.match(controllerSource, /@Get\("finance-evidence-exceptions"\)/);
  assert.match(controllerSource, /@Get\("bonus-expense-items"\)/);
  assert.match(serviceSource, /listFinanceSummaries/);
  assert.match(serviceSource, /daochongFinanceSummary\.findMany/);
  assert.match(serviceSource, /listFinanceEvidenceExceptions/);
  assert.match(serviceSource, /daochongFinanceEvidenceException\.findMany/);
  assert.match(serviceSource, /listBonusExpenseItems/);
  assert.match(serviceSource, /daochongBonusExpenseItem\.findMany/);
  assert.match(fetchSource, /getDaochongReadonlyFinanceSummaryPath/);
  assert.match(fetchSource, /getDaochongReadonlyFinanceEvidenceExceptionsPath/);
  assert.match(fetchSource, /getDaochongReadonlyBonusExpenseItemsPath/);
  assert.match(adapterSource, /adaptReadonlyFinanceSummariesToRows/);
  assert.match(adapterSource, /adaptReadonlyFinanceExceptionsToRows/);
  assert.match(adapterSource, /adaptReadonlyBonusExpenseItemsToRows/);
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.match(appSource, /runtimeData\.financeRows/);
  assert.doesNotMatch(controllerSource, /@(Post|Put|Patch|Delete)\b/);
  assert.doesNotMatch(serviceSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.doesNotMatch(fetchSource, /method:\s*"(POST|PUT|PATCH|DELETE)"|\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "finance readonly GET source")?.value,
    "已接",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "财务源码只读护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "财务只读源码层")?.value,
    "已接",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "财务只读源码")?.value,
    "已接",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "财务迁移运行确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-141 to DCM-144 money readonly source stays GET-only", () => {
  const schemaSource = readFileSync("prisma/schema.prisma", "utf8");
  const migrationPath = "prisma/migrations/20260623210000_daochong_money_readonly_models/migration.sql";
  const migrationSource = readFileSync(migrationPath, "utf8");
  const controllerSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.controller.ts", "utf8");
  const serviceSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.service.ts", "utf8");
  const fetchSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts", "utf8");
  const adapterSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts", "utf8");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");

  assert.ok(existsSync(migrationPath));
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-144"));
  assert.match(schemaSource, /model DaochongCustomerRecharge/);
  assert.match(schemaSource, /model DaochongServiceSettlementDraft/);
  assert.match(schemaSource, /model DaochongCardConsumptionApproval/);
  assert.match(migrationSource, /CREATE TABLE `DaochongCustomerRecharge`/);
  assert.match(migrationSource, /CREATE TABLE `DaochongServiceSettlementDraft`/);
  assert.match(migrationSource, /CREATE TABLE `DaochongCardConsumptionApproval`/);
  assert.doesNotMatch(migrationSource, /DROP\s+TABLE|TRUNCATE\s+TABLE|INSERT\s+INTO|UPDATE\s+`|DELETE\s+FROM/i);
  assert.match(controllerSource, /@Get\("recharges"\)/);
  assert.match(controllerSource, /@Get\("settlement-drafts"\)/);
  assert.match(controllerSource, /@Get\("consumption-approvals"\)/);
  assert.match(serviceSource, /listRecharges/);
  assert.match(serviceSource, /daochongCustomerRecharge\.findMany/);
  assert.match(serviceSource, /listSettlementDrafts/);
  assert.match(serviceSource, /daochongServiceSettlementDraft\.findMany/);
  assert.match(serviceSource, /listConsumptionApprovals/);
  assert.match(serviceSource, /daochongCardConsumptionApproval\.findMany/);
  assert.match(fetchSource, /getDaochongReadonlyRechargesPath/);
  assert.match(fetchSource, /getDaochongReadonlySettlementDraftsPath/);
  assert.match(fetchSource, /getDaochongReadonlyConsumptionApprovalsPath/);
  assert.match(adapterSource, /adaptReadonlyRechargesToFields/);
  assert.match(adapterSource, /adaptReadonlySettlementDraftsToRows/);
  assert.match(adapterSource, /adaptReadonlyConsumptionApprovalsToTimeline/);
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.match(appSource, /runtimeData\.rechargeFields/);
  assert.match(appSource, /runtimeData\.settlementDraftFields/);
  assert.match(appSource, /runtimeData\.approvalStatuses/);
  assert.doesNotMatch(controllerSource, /@(Post|Put|Patch|Delete)\b/);
  assert.doesNotMatch(serviceSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.doesNotMatch(fetchSource, /method:\s*"(POST|PUT|PATCH|DELETE)"|\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "money readonly GET source")?.value,
    "已接",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "资金源码只读护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "资金只读源码层")?.value,
    "已接",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "资金只读源码")?.value,
    "已接",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "资金迁移运行确认")?.value,
    "待确认",
  );
});

test("Daochong DCM-145 to DCM-148 readonly acceptance verifier stays non executing", () => {
  const verifierPath = "scripts/local/daochong-mobile-readonly-acceptance.mjs";
  const resultPath = "docs/daochong-mobile-phase1-dcm145-dcm148-readonly-acceptance-result-2026-06-23.md";
  const verifierSource = readFileSync(verifierPath, "utf8");
  const packageSource = readFileSync("package.json", "utf8");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");
  const taskBreakdown = readFileSync("docs/daochong-mobile-development-task-breakdown-2026-06-22.md", "utf8");
  const fieldMap = readFileSync("docs/daochong-mobile-development-field-map-2026-06-22.md", "utf8");
  const resultDoc = readFileSync(resultPath, "utf8");

  assert.ok(existsSync(verifierPath));
  assert.ok(existsSync(resultPath));
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-148"));
  assert.match(verifierSource, /phase: "DCM-145-DCM-168"/);
  assert.match(verifierSource, /executesCommands: false/);
  assert.match(verifierSource, /touchesDatabase: false/);
  assert.match(verifierSource, /writesFiles: false/);
  assert.match(verifierSource, /fetch\(url/);
  assert.match(verifierSource, /method: "GET"/);
  assert.match(verifierSource, /DCM-00 到 DCM-168/);
  assert.doesNotMatch(
    verifierSource,
    /child_process|spawn\(|exec\(|writeFile|prisma\s+migrate|docker\s+|\.create\([^/]|\.update\([^/]|\.delete\([^/]|sendWecom\(|wecom\.[A-Za-z0-9_]*send/i,
  );
  assert.match(
    packageSource,
    /"verify:daochong-mobile-readonly"\s*:\s*"node scripts\/local\/daochong-mobile-readonly-acceptance\.mjs"/,
  );
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.match(taskBreakdown, /DCM-19C-12 只读验收收口/);
  assert.match(fieldMap, /只读验收收口（DCM-145 到 DCM-148）/);
  assert.match(resultDoc, /未运行 migration/);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "readonly acceptance verifier")?.value,
    "已接",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "只读验收护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "只读验收器")?.value,
    "已接",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "验收器来源")?.value,
    "已接",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "灰页实机复核")?.value,
    "待确认",
  );
});

test("Daochong DCM-149 to DCM-152 remaining gap contract plan stays review-only", () => {
  const contractPath = "docs/daochong-mobile-drafts/dcm149-dcm152/readonly-contract.draft.json";
  const gapMatrixPath = "docs/daochong-mobile-drafts/dcm149-dcm152/gap-matrix.md";
  const goNoGoPath = "docs/daochong-mobile-drafts/dcm149-dcm152/go-no-go.md";
  const plannerPath = "scripts/local/daochong-remaining-gap-contract-plan.mjs";
  const resultPath = "docs/daochong-mobile-phase1-dcm149-dcm152-gap-contract-result-2026-06-23.md";
  const contract = readFileSync(contractPath, "utf8");
  const gapMatrix = readFileSync(gapMatrixPath, "utf8");
  const goNoGo = readFileSync(goNoGoPath, "utf8");
  const planner = readFileSync(plannerPath, "utf8");
  const resultDoc = readFileSync(resultPath, "utf8");
  const packageSource = readFileSync("package.json", "utf8");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");
  const taskBreakdown = readFileSync("docs/daochong-mobile-development-task-breakdown-2026-06-22.md", "utf8");
  const fieldMap = readFileSync("docs/daochong-mobile-development-field-map-2026-06-22.md", "utf8");

  assert.ok(existsSync(contractPath));
  assert.ok(existsSync(gapMatrixPath));
  assert.ok(existsSync(goNoGoPath));
  assert.ok(existsSync(plannerPath));
  assert.ok(existsSync(resultPath));
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-152"));
  assert.match(contract, /"phase": "DCM-149-DCM-152"/);
  assert.match(contract, /"writesAllowed": false/);
  assert.match(contract, /"appointmentDetail"/);
  assert.match(contract, /"customerCardBalance"/);
  assert.match(contract, /"compensationRules"/);
  assert.match(contract, /"wecomReminderDryRun"/);
  assert.match(gapMatrix, /SalarySlip.*不能反推底薪和提点配置/);
  assert.match(goNoGo, /试图调用企业微信真实发送/);
  assert.match(planner, /phase: "DCM-149-DCM-152"/);
  assert.match(planner, /executesCommands: false/);
  assert.match(planner, /touchesDatabase: false/);
  assert.match(planner, /writesFiles: false/);
  assert.match(planner, /sendsWecom: false/);
  assert.doesNotMatch(planner, /from\s+["']node:child_process["']/);
  assert.doesNotMatch(planner, /\bspawn(?:Sync)?\s*\([^/]/);
  assert.doesNotMatch(planner, /\bexec(?:File|Sync)?\s*\([^/]/);
  assert.doesNotMatch(planner, /\bwriteFile(?:Sync)?\s*\([^/]/);
  assert.doesNotMatch(planner, /\bsendWecom\s*\([^/]/);
  assert.doesNotMatch(planner, /\bwecom\.[A-Za-z0-9_]*send\s*\([^/]/i);
  assert.match(packageSource, /"plan:daochong-gap-contract"\s*:\s*"node scripts\/local\/daochong-remaining-gap-contract-plan\.mjs"/);
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.match(taskBreakdown, /DCM-19C-13 剩余真实口径缺口契约/);
  assert.match(fieldMap, /剩余真实口径缺口契约（DCM-149 到 DCM-152）/);
  assert.match(resultDoc, /未新增源码层/);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "remaining gap contract plan")?.value,
    "契约",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "剩余缺口契约护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "剩余缺口契约包")?.value,
    "契约",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "剩余缺口契约来源")?.value,
    "契约",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "剩余缺口源码确认")?.value,
    "只读已接",
  );
});

test("Daochong DCM-153 to DCM-156 appointment detail readonly source stays GET-only", () => {
  const resultPath = "docs/daochong-mobile-phase1-dcm153-dcm156-appointment-detail-readonly-result-2026-06-23.md";
  const controllerSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.controller.ts", "utf8");
  const serviceSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.service.ts", "utf8");
  const fetchSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts", "utf8");
  const adapterSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts", "utf8");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");
  const apiSpec = readFileSync("apps/web/components/daochong/mobile/daochongMobile.api.ts", "utf8");
  const taskBreakdown = readFileSync("docs/daochong-mobile-development-task-breakdown-2026-06-22.md", "utf8");
  const fieldMap = readFileSync("docs/daochong-mobile-development-field-map-2026-06-22.md", "utf8");
  const resultDoc = readFileSync(resultPath, "utf8");

  assert.ok(existsSync(resultPath));
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-156"));
  assert.match(controllerSource, /@Get\("appointments\/:appointmentId"\)/);
  assert.match(serviceSource, /async getAppointmentDetail/);
  assert.match(serviceSource, /task\.findFirst/);
  assert.match(serviceSource, /accessControl\.buildTaskWhere/);
  assert.match(serviceSource, /daochongServiceNote\.findMany/);
  assert.match(fetchSource, /fetchDaochongReadonlyAppointmentDetailWithClient/);
  assert.match(fetchSource, /method: "GET"/);
  assert.match(adapterSource, /adaptReadonlyAppointmentDetailToFields/);
  assert.match(adapterSource, /adaptReadonlyAppointmentDetailToStatuses/);
  assert.match(appSource, /openAppointment/);
  assert.match(appSource, /runtimeData\.appointmentDetailFields/);
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.match(apiSpec, /key: "appointmentDetail"/);
  assert.match(taskBreakdown, /DCM-19C-14 预约详情真实只读源码层/);
  assert.match(fieldMap, /预约详情真实只读源码层（DCM-153 到 DCM-156）/);
  assert.match(resultDoc, /未改约/);
  assert.doesNotMatch(controllerSource, /@(Post|Put|Patch|Delete)\b/);
  assert.doesNotMatch(serviceSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.doesNotMatch(fetchSource, /method:\s*["'](POST|PUT|PATCH|DELETE)["']|sendWecom|wecom.*send/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "appointment detail readonly GET")?.value,
    "已接",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "预约详情只读护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "预约详情源码层")?.value,
    "已接",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "预约详情真实来源")?.value,
    "已接",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "完整预约字段")?.value,
    "部分",
  );
});

test("Daochong DCM-157 to DCM-160 customer card balance readonly preview stays GET-only", () => {
  const resultPath = "docs/daochong-mobile-phase1-dcm157-dcm160-customer-card-balance-readonly-result-2026-06-23.md";
  const controllerSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.controller.ts", "utf8");
  const serviceSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.service.ts", "utf8");
  const fetchSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts", "utf8");
  const adapterSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts", "utf8");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");
  const apiSpec = readFileSync("apps/web/components/daochong/mobile/daochongMobile.api.ts", "utf8");
  const taskBreakdown = readFileSync("docs/daochong-mobile-development-task-breakdown-2026-06-22.md", "utf8");
  const fieldMap = readFileSync("docs/daochong-mobile-development-field-map-2026-06-22.md", "utf8");
  const resultDoc = readFileSync(resultPath, "utf8");

  assert.ok(existsSync(resultPath));
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-160"));
  assert.match(controllerSource, /@Get\("customer-card-balances"\)/);
  assert.match(serviceSource, /async listCustomerCardBalances/);
  assert.match(serviceSource, /mapCustomerCardBalancePreview/);
  assert.match(serviceSource, /daochongCustomerRecharge\.findMany/);
  assert.match(serviceSource, /daochongCardConsumptionApproval\.findMany/);
  assert.match(serviceSource, /rechargeStatus: "CONFIRMED"/);
  assert.match(serviceSource, /balanceAppliedAt: \{ not: null \}/);
  assert.match(serviceSource, /approvalStatus: "APPROVED"/);
  assert.match(fetchSource, /getDaochongReadonlyCustomerCardBalancesPath/);
  assert.match(fetchSource, /customerCardBalancesPath/);
  assert.match(fetchSource, /readJson<DaochongReadonlyCustomerCardBalanceResponse>/);
  assert.match(adapterSource, /adaptReadonlyCustomerCardBalancesToRows/);
  assert.match(adapterSource, /已入账/);
  assert.match(adapterSource, /已耗卡/);
  assert.match(appSource, /adaptReadonlyCustomerCardBalancesToRows/);
  assert.match(appSource, /customerCardBalances/);
  assert.match(appSource, /customerCardBalancesDiagnostic/);
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.match(apiSpec, /key: "customerCardBalances"/);
  assert.match(taskBreakdown, /DCM-19C-15 客户卡项余额只读预览/);
  assert.match(fieldMap, /客户卡项余额只读预览（DCM-157 到 DCM-160）/);
  assert.match(resultDoc, /未开户/);
  assert.match(resultDoc, /未写流水/);
  assert.doesNotMatch(controllerSource, /@(Post|Put|Patch|Delete)\b/);
  assert.doesNotMatch(serviceSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.doesNotMatch(fetchSource, /method:\s*["'](POST|PUT|PATCH|DELETE)["']|sendWecom|wecom.*send/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "customer card balance readonly preview")?.value,
    "预览",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "卡项余额预览护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "卡项余额预览")?.value,
    "预览",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "卡项余额预览来源")?.value,
    "预览",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "客户卡项余额")?.value,
    "部分",
  );
});

test("Daochong DCM-161 to DCM-164 compensation rules readonly source stays GET-only", () => {
  const resultPath = "docs/daochong-mobile-phase1-dcm161-dcm164-compensation-rules-readonly-result-2026-06-23.md";
  const controllerSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.controller.ts", "utf8");
  const serviceSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.service.ts", "utf8");
  const dtoSource = readFileSync("apps/api/src/daochong-mobile/dto/daochong-mobile.dto.ts", "utf8");
  const fetchSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts", "utf8");
  const adapterSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts", "utf8");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");
  const apiSpec = readFileSync("apps/web/components/daochong/mobile/daochongMobile.api.ts", "utf8");
  const taskBreakdown = readFileSync("docs/daochong-mobile-development-task-breakdown-2026-06-22.md", "utf8");
  const fieldMap = readFileSync("docs/daochong-mobile-development-field-map-2026-06-22.md", "utf8");
  const resultDoc = readFileSync(resultPath, "utf8");

  assert.ok(existsSync(resultPath));
  assert.ok(apiPlanTimeline.some((item) => item.meta === "DCM-164"));
  assert.match(controllerSource, /@Get\("compensation-rules"\)/);
  assert.match(serviceSource, /compensation_rules/);
  assert.match(dtoSource, /effectiveMonth/);
  assert.match(fetchSource, /getDaochongReadonlyCompensationRulesPath/);
  assert.match(fetchSource, /compensationRulesPath/);
  assert.match(fetchSource, /readJson<DaochongReadonlyCompensationRuleResponse>/);
  assert.match(adapterSource, /adaptReadonlyCompensationRulesToRows/);
  assert.match(adapterSource, /不从工资单反推/);
  assert.match(appSource, /runtimeData\.compensationRows/);
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.match(apiSpec, /key: "compensation"/);
  assert.match(taskBreakdown, /DCM-19C-16 薪酬配置只读来源确认/);
  assert.match(fieldMap, /薪酬配置只读来源确认（DCM-161 到 DCM-164）/);
  assert.match(resultDoc, /不从薪资单反推/);
  assert.match(resultDoc, /未生成薪资条/);
  assert.doesNotMatch(controllerSource, /@(Post|Put|Patch|Delete)\b/);
  assert.doesNotMatch(serviceSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.doesNotMatch(fetchSource, /method:\s*["'](POST|PUT|PATCH|DELETE)["']|sendWecom|wecom.*send/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "compensation rules readonly GET")?.value,
    "待源",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "薪酬配置只读护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanPrecheckRows.find((row) => row.label === "薪酬配置源码层")?.value,
    "待源",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "薪酬配置来源")?.value,
    "待建",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "老师底薪和提点")?.value,
    "待建源",
  );
});

test("Daochong DCM-165 to DCM-168 wecom reminder dry-run readonly preview stays GET-only", () => {
  const resultPath = "docs/daochong-mobile-phase1-dcm165-dcm168-wecom-reminder-dryrun-readonly-result-2026-06-23.md";
  const controllerSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.controller.ts", "utf8");
  const serviceSource = readFileSync("apps/api/src/daochong-mobile/daochong-mobile.service.ts", "utf8");
  const dtoSource = readFileSync("apps/api/src/daochong-mobile/dto/daochong-mobile.dto.ts", "utf8");
  const fetchSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts", "utf8");
  const adapterSource = readFileSync("apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts", "utf8");
  const appSource = readFileSync("apps/web/components/daochong/mobile/DaochongMobileApp.tsx", "utf8");
  const apiSpec = readFileSync("apps/web/components/daochong/mobile/daochongMobile.api.ts", "utf8");
  const taskBreakdown = readFileSync("docs/daochong-mobile-development-task-breakdown-2026-06-22.md", "utf8");
  const fieldMap = readFileSync("docs/daochong-mobile-development-field-map-2026-06-22.md", "utf8");
  const resultDoc = readFileSync(resultPath, "utf8");

  assert.ok(existsSync(resultPath));
  assert.equal(apiPlanTimeline.at(-1)?.meta, "DCM-168");
  assert.match(controllerSource, /@Get\("wecom-reminder-dry-runs"\)/);
  assert.match(serviceSource, /listWecomReminderDryRuns/);
  assert.match(serviceSource, /mapWecomReminderDryRun/);
  assert.match(serviceSource, /DaochongServiceNote/);
  assert.match(dtoSource, /DaochongWecomReminderDryRunsReadonlyQueryDto/);
  assert.match(fetchSource, /getDaochongReadonlyWecomReminderDryRunsPath/);
  assert.match(fetchSource, /wecomReminderDryRunsPath/);
  assert.match(fetchSource, /readJson<DaochongReadonlyWecomReminderDryRunResponse>/);
  assert.match(adapterSource, /DaochongReadonlyWecomReminderDryRunResponse/);
  assert.match(adapterSource, /wecom-reminder-dry-runs GET/);
  assert.match(appSource, /wecomReminderDryRuns/);
  assert.match(appSource, /DCM-00 到 DCM-168/);
  assert.match(apiSpec, /key: "wecomReminderDryRuns"/);
  assert.match(taskBreakdown, /DCM-19C-17 企微提醒 dry-run 只读源码层/);
  assert.match(fieldMap, /企微提醒 dry-run 只读源码层（DCM-165 到 DCM-168）/);
  assert.match(resultDoc, /不创建通知/);
  assert.match(resultDoc, /未调用企业微信/);
  assert.doesNotMatch(controllerSource, /@(Post|Put|Patch|Delete)\b/);
  assert.doesNotMatch(serviceSource, /\.create\s*\(|\.update\s*\(|\.delete\s*\(|sendWecom|wecom.*send/i);
  assert.doesNotMatch(fetchSource, /method:\s*["'](POST|PUT|PATCH|DELETE)["']|sendWecom|wecom.*send/i);
  assert.equal(
    apiPlanEndpointRows.find((row) => row.label === "wecom reminder dry-run readonly GET")?.value,
    "已接",
  );
  assert.equal(
    apiPlanRiskRows.find((row) => row.label === "企微提醒 dry-run 护栏")?.value,
    "拦截",
  );
  assert.equal(
    apiPlanSourceRows.find((row) => row.label === "提醒发送来源")?.value,
    "已接",
  );
  assert.equal(
    apiPlanBlockerRows.find((row) => row.label === "剩余缺口源码确认")?.value,
    "只读已接",
  );
});

test("Daochong DCM-169 to DCM-172 cutover precheck stays read-only and manual-gated", () => {
  const resultPath = "docs/daochong-mobile-phase1-dcm169-dcm172-cutover-precheck-result-2026-06-23.md";
  const scriptSource = readFileSync("scripts/local/daochong-mobile-cutover-precheck.mjs", "utf8");
  const packageSource = readFileSync("package.json", "utf8");
  const taskBreakdown = readFileSync("docs/daochong-mobile-development-task-breakdown-2026-06-22.md", "utf8");
  const fieldMap = readFileSync("docs/daochong-mobile-development-field-map-2026-06-22.md", "utf8");
  const resultDoc = readFileSync(resultPath, "utf8");

  assert.ok(existsSync(resultPath));
  assert.match(packageSource, /"precheck:daochong-mobile-cutover": "node scripts\/local\/daochong-mobile-cutover-precheck\.mjs"/);
  assert.match(scriptSource, /phase: "DCM-169-DCM-172"/);
  assert.match(scriptSource, /canCutoverWithoutManualConfirmation: false/);
  assert.match(scriptSource, /manual Go\/No-Go/i);
  assert.match(taskBreakdown, /DCM-19C-18 切换前只读预检/);
  assert.match(fieldMap, /切换前只读预检（DCM-169 到 DCM-172）/);
  assert.match(resultDoc, /ready_for_manual_go_no_go/);
  assert.match(resultDoc, /不代表可以自动切正式入口/);
  assert.match(resultDoc, /未发送企业微信/);
  assert.doesNotMatch(
    scriptSource,
    /from ["']node:child_process["']|require\(["']node:child_process["']\)|writeFileSync|appendFileSync|createWriteStream|execSync\s*\(|execFileSync\s*\(|spawn\s*\(/,
  );
});

test("Daochong readonly snapshot exposes fallback diagnostics", () => {
  const snapshot = buildReadonlyApiSnapshot({
    dataSourceDiagnostics: [],
    pageMeta: {} as DaochongMobileSnapshot["pageMeta"],
    homeStats: [],
    homeStatuses: [],
    todayRosterStatuses: fallbackRosterStatuses,
    weekRosterStatuses: [],
    activityStatuses: [],
    appointments: fallbackAppointments,
    appointmentDetailFields: fallbackAppointmentDetailFields,
    appointmentDetailStatuses: fallbackAppointmentDetailStatuses,
    performanceStats: [],
    performanceRows: [],
    customers: fallbackCustomers,
    customerProfileFields: [],
    customerServiceHistory: [],
    customerPreferenceRows: [],
    approvalStatuses: [],
    approvalDetailFields: [],
    approvalRows: [],
    approvalDecisionFields: [],
    approvalTimeline: [],
    settlementFields: [],
    settlementDraftFields: [],
    settlementDraftRows: [],
    settlementSubmissionTimeline: [],
    settlementStatuses: [],
    rechargeFields: [],
    rechargeRows: [],
    rechargeStatuses: [],
    evidenceFields: [],
    evidenceRows: [],
    evidenceStatuses: [],
    evidenceTimeline: [],
    serviceNoteContextFields: [],
    serviceNoteFields: [],
    serviceNotePendingRows: [],
    serviceNoteReminderFields: [],
    serviceNoteReminderTimeline: [],
    serviceNoteDryRunStatuses: [],
    serviceNoteStatuses: [],
    financeRows: [],
    financeDraftFields: [],
    financeExceptionRows: [],
    financeBonusExpenseRows: [],
    financeStatuses: [],
    financeTimeline: [],
    expenseFields: [],
    expenseRows: [],
    expenseStatuses: [],
    teamBonusFields: [],
    teamBonusRows: [],
    teamBonusStatuses: [],
    communicationFields: [],
    communicationRows: [],
    communicationStatuses: [],
    communicationTimeline: [],
    meetingNoteFields: [],
    meetingTodoRows: [],
    meetingNoteStatuses: [],
    acceptanceFields: [],
    acceptancePageRows: [],
    acceptanceRoleRows: [],
    acceptanceCreateRows: [],
    acceptanceReadonlyRows: [],
    acceptanceStatuses: [],
    acceptanceTimeline: [],
    apiPlanFields: [],
    apiPlanPhaseRows: [],
    apiPlanEndpointRows: [],
    apiPlanRiskRows: [],
    apiPlanPrecheckRows: [],
    apiPlanSourceRows: [],
    apiPlanBlockerRows: [],
    apiPlanStatuses: [],
    apiPlanTimeline: [],
    managementStatuses: [],
    memberRows: [],
    memberPermissionStatuses: [],
    permissionGroups: [],
    projectRows: fallbackProjectRows,
    projectStatuses: [],
    projectFormFields: [],
    compensationRows: [],
    compensationStatuses: [],
    compensationFormFields: [],
  });

  assert.equal(snapshot.dataSourceDiagnostics.length, 19);
  assert.equal(snapshot.appointments[0].title, "许女士 · 香疗肩颈");
  assert.equal(snapshot.customers[0].name, "许女士");
  assert.equal(snapshot.projectRows[0].label, "香疗肩颈");
  assert.equal(snapshot.todayRosterStatuses[0].title, "慧心");
});

test("Daochong readonly diagnostics expose request states", () => {
  const diagnostics = buildReadonlyDiagnostics({
    appointmentDetail: { status: "empty", note: "预约详情为空" },
    appointments: { status: "success", note: "读取预约成功" },
    customers: { status: "success", note: "读取客户成功" },
    projects: { status: "loading", note: "读取项目中" },
    roster: { status: "forbidden", note: "没有班表权限" },
  });

  assert.equal(diagnostics[0].status, "成功");
  assert.equal(diagnostics[0].tone, "green");
  assert.equal(diagnostics[1].status, "空数据");
  assert.equal(diagnostics[1].tone, "amber");
  assert.equal(diagnostics[2].status, "加载");
  assert.equal(diagnostics[2].tone, "blue");
  assert.equal(diagnostics[3].status, "无权限");
  assert.equal(diagnostics[3].tone, "rose");
  assert.equal(diagnostics[4].status, "成功");
  assert.equal(diagnostics[4].tone, "green");
});

test("Daochong readonly fetch gate requires api-readonly mode and explicit switch", () => {
  const original = process.env.NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH;
  const makeSource = (mode: DaochongMobileDataSource["mode"]): DaochongMobileDataSource => ({
    getSnapshot: () => {
      throw new Error("not used");
    },
    mode,
    readonlyEndpoints: [],
  });

  process.env.NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH = "true";
  assert.equal(getDaochongReadonlyFetchGate(makeSource("mock")).requestEnabled, false);
  assert.equal(getDaochongReadonlyFetchGate(makeSource("api-readonly")).requestEnabled, true);
  assert.match(getDaochongReadonlyFetchGate(makeSource("api-readonly")).appointmentsPath, /^\/tasks\?/);
  assert.equal(getDaochongReadonlyFetchGate(makeSource("api-readonly")).appointmentDetailPath, "/daochong/mobile/appointments/:appointmentId");
  assert.equal(getDaochongReadonlyFetchGate(makeSource("api-readonly")).customerCardBalancesPath, "/daochong/mobile/customer-card-balances?customerId=:customerId");
  assert.equal(getDaochongReadonlyFetchGate(makeSource("api-readonly")).wecomReminderDryRunsPath, "/daochong/mobile/wecom-reminder-dry-runs?customerId=:customerId&dueBefore=:now&limit=20");
  assert.equal(getDaochongReadonlyFetchGate(makeSource("api-readonly")).evidenceAssetsPath, "/daochong/mobile/evidence-assets?businessType=daochong&limit=20");
  assert.equal(getDaochongReadonlyFetchGate(makeSource("api-readonly")).meetingNotesPath, "/daochong/mobile/meeting-notes?folderId=daochong-weekly&limit=20");
  assert.equal(getDaochongReadonlyFetchGate(makeSource("api-readonly")).projectCommunicationsPath, "/daochong/mobile/project-communications?folderId=daochong-weekly&limit=20");
  assert.match(getDaochongReadonlyFetchGate(makeSource("api-readonly")).rechargesPath, /^\/daochong\/mobile\/recharges\?/);
  assert.equal(getDaochongReadonlyFetchGate(makeSource("api-readonly")).settlementDraftsPath, "/daochong/mobile/settlement-drafts?limit=20");
  assert.match(getDaochongReadonlyFetchGate(makeSource("api-readonly")).consumptionApprovalsPath, /^\/daochong\/mobile\/consumption-approvals\?/);
  assert.match(getDaochongReadonlyFetchGate(makeSource("api-readonly")).financeSummaryPath, /^\/daochong\/mobile\/finance-summary\?/);
  assert.match(getDaochongReadonlyFetchGate(makeSource("api-readonly")).financeEvidenceExceptionsPath, /^\/daochong\/mobile\/finance-evidence-exceptions\?/);
  assert.match(getDaochongReadonlyFetchGate(makeSource("api-readonly")).bonusExpenseItemsPath, /^\/daochong\/mobile\/bonus-expense-items\?/);
  assert.match(getDaochongReadonlyFetchGate(makeSource("api-readonly")).compensationRulesPath, /^\/daochong\/mobile\/compensation-rules\?/);
  assert.equal(
    getDaochongReadonlyAppointmentsPath(new Date(2026, 5, 23)),
    "/tasks?pageSize=20&includeArchived=true&startDate=2026-06-23&endDate=2026-06-23",
  );
  assert.equal(getDaochongReadonlyAppointmentDetailPath("task 1"), "/daochong/mobile/appointments/task%201");
  assert.equal(
    getDaochongReadonlyRechargesPath(),
    "/daochong/mobile/recharges?limit=20",
  );
  assert.equal(
    getDaochongReadonlySettlementDraftsPath(),
    "/daochong/mobile/settlement-drafts?limit=20",
  );
  assert.equal(
    getDaochongReadonlyConsumptionApprovalsPath(new Date(2026, 5, 23)),
    "/daochong/mobile/consumption-approvals?limit=20&summaryMonth=2026-06",
  );
  assert.equal(
    getDaochongReadonlyFinanceSummaryPath(new Date(2026, 5, 23)),
    "/daochong/mobile/finance-summary?limit=6&summaryMonth=2026-06",
  );
  assert.equal(
    getDaochongReadonlyFinanceEvidenceExceptionsPath(new Date(2026, 5, 23)),
    "/daochong/mobile/finance-evidence-exceptions?limit=20&summaryMonth=2026-06",
  );
  assert.equal(
    getDaochongReadonlyBonusExpenseItemsPath(new Date(2026, 5, 23)),
    "/daochong/mobile/bonus-expense-items?limit=20&summaryMonth=2026-06",
  );
  assert.equal(
    getDaochongReadonlyCompensationRulesPath(new Date(2026, 5, 23)),
    "/daochong/mobile/compensation-rules?effectiveMonth=2026-06&limit=20",
  );

  process.env.NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH = "false";
  assert.equal(getDaochongReadonlyFetchGate(makeSource("api-readonly")).requestEnabled, false);

  if (original === undefined) {
    delete process.env.NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH;
  } else {
    process.env.NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH = original;
  }
});

test("Daochong readonly fetch client reports empty and forbidden states", async () => {
  const result = await fetchDaochongReadonlyAdapterInputWithClient(async (path) => {
    if (path.startsWith("/tasks")) {
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    }
    if (path.startsWith("/products")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (path.startsWith("/customers")) {
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ message: "forbidden" }), { status: 403 });
  });

  assert.equal(result.diagnostics.appointments?.status, "success");
  assert.equal(result.diagnostics.customers?.status, "success");
  assert.equal(result.diagnostics.projects?.status, "empty");
  assert.equal(result.diagnostics.roster?.status, "forbidden");
  assert.deepEqual(result.input.appointmentTaskResponse, { items: [] });
  assert.deepEqual(result.input.customerListResponse, { items: [] });
  assert.deepEqual(result.input.projectRecords, []);
  assert.equal(result.input.rosterResponse, null);
});

test("Daochong readonly customer detail fetch uses encoded customer path", async () => {
  const paths: string[] = [];
  const result = await fetchDaochongReadonlyCustomerDetailWithClient(async (path) => {
    paths.push(path);
    if (path.startsWith("/daochong/mobile/service-notes")) {
      return new Response(JSON.stringify({ items: [{ id: "note-1", noteStatus: "PENDING" }] }), { status: 200 });
    }
    if (path.startsWith("/daochong/mobile/wecom-reminder-dry-runs")) {
      return new Response(JSON.stringify({ items: [{ id: "dry-run-note-1", serviceNoteId: "note-1", dryRunStatus: "ready_to_preview" }] }), {
        status: 200,
      });
    }
    if (path.startsWith("/daochong/mobile/customer-preferences")) {
      return new Response(JSON.stringify({ items: [{ id: "pref-1", preferenceLabel: "房间", preferenceValue: "二号房" }] }), {
        status: 200,
      });
    }
    if (path.startsWith("/daochong/mobile/customer-card-balances")) {
      return new Response(JSON.stringify({ items: [{ customerId: "customer 1", remainingAmount: "2641.80" }] }), {
        status: 200,
      });
    }
    return new Response(
      JSON.stringify({
        id: "customer 1",
        name: "林女士",
        followups: [],
        quotations: [],
        tasks: [],
      }),
      { status: 200 },
    );
  }, "customer 1");

  assert.equal(getDaochongReadonlyCustomerDetailPath("customer 1"), "/customers/customer%201");
  assert.equal(getDaochongReadonlyServiceNotesPath("customer 1"), "/daochong/mobile/service-notes?customerId=customer%201&limit=20");
  assert.match(
    getDaochongReadonlyWecomReminderDryRunsPath("customer 1", new Date("2026-06-23T12:00:00.000Z")),
    /^\/daochong\/mobile\/wecom-reminder-dry-runs\?customerId=customer\+1&dueBefore=2026-06-23T12%3A00%3A00.000Z&limit=20$/,
  );
  assert.equal(getDaochongReadonlyCustomerPreferencesPath("customer 1"), "/daochong/mobile/customer-preferences?customerId=customer%201");
  assert.equal(getDaochongReadonlyCustomerCardBalancesPath("customer 1"), "/daochong/mobile/customer-card-balances?customerId=customer%201");
  assert.deepEqual(paths.map((path) => path.replace(/dueBefore=[^&]+/, "dueBefore=NOW")), [
    "/customers/customer%201",
    "/daochong/mobile/service-notes?customerId=customer%201&limit=20",
    "/daochong/mobile/wecom-reminder-dry-runs?customerId=customer+1&dueBefore=NOW&limit=20",
    "/daochong/mobile/customer-preferences?customerId=customer%201",
    "/daochong/mobile/customer-card-balances?customerId=customer%201",
  ]);
  assert.equal(result.diagnostic.status, "success");
  assert.equal(result.data?.name, "林女士");
  assert.deepEqual(result.serviceNotes, { items: [{ id: "note-1", noteStatus: "PENDING" }] });
  assert.deepEqual(result.wecomReminderDryRuns, { items: [{ id: "dry-run-note-1", serviceNoteId: "note-1", dryRunStatus: "ready_to_preview" }] });
  assert.deepEqual(result.customerPreferences, { items: [{ id: "pref-1", preferenceLabel: "房间", preferenceValue: "二号房" }] });
  assert.deepEqual(result.customerCardBalances, { items: [{ customerId: "customer 1", remainingAmount: "2641.80" }] });
});

test("Daochong readonly appointment detail fetch uses GET-only encoded appointment path", async () => {
  const paths: string[] = [];
  const result = await fetchDaochongReadonlyAppointmentDetailWithClient(async (path, init) => {
    paths.push(`${init?.method ?? "GET"} ${path}`);
    return new Response(
      JSON.stringify({
        id: "task 1",
        customerName: "林女士",
        teacherName: "慧心",
      }),
      { status: 200 },
    );
  }, "task 1");

  assert.equal(getDaochongReadonlyAppointmentDetailPath("task 1"), "/daochong/mobile/appointments/task%201");
  assert.deepEqual(paths, ["GET /daochong/mobile/appointments/task%201"]);
  assert.equal(result.diagnostic.status, "success");
  assert.equal(result.data?.customerName, "林女士");
});

test("Daochong readonly appointment detail fetch normalizes backend disabled envelope", async () => {
  const result = await fetchDaochongReadonlyAppointmentDetailWithClient(async () => new Response(
    JSON.stringify({
      items: [],
      diagnostics: [
        {
          key: "appointment_detail_shadow_readonly_disabled",
          message: "预约详情只读开关关闭",
        },
      ],
    }),
    { status: 200 },
  ), "task-1");

  assert.equal(result.diagnostic.status, "disabled");
  assert.equal(result.diagnostic.note, "预约详情只读开关关闭");
});

test("Daochong readonly high-risk fetch uses GET-only money evidence finance compensation communication and meeting paths", async () => {
  const paths: string[] = [];
  let rechargeHeaders: Headers | null = null;
  const restoreWindow = installReadonlyFetchWindowStorage({
    huigui_auth_expires_at: "2999-01-01T00:00:00.000Z",
    "huigui-record-scope": "TEST",
    "huigui-test-batch-id": "batch-1",
    huigui_token: "readonly-token",
    huigui_user: "{\"id\":\"user-1\"}",
  });
  let result: Awaited<ReturnType<typeof fetchDaochongReadonlyHighRiskWithClient>>;

  try {
    result = await fetchDaochongReadonlyHighRiskWithClient(async (path, init) => {
    paths.push(`${init?.method ?? "GET"} ${path}`);
    if (path.startsWith("/daochong/mobile/evidence-assets")) {
      return new Response(JSON.stringify({ items: [{ id: "ev-1", fileName: "proof.jpg", reviewStatus: "ACTIVE" }] }), {
        status: 200,
      });
    }
    if (path.startsWith("/daochong/mobile/recharges")) {
      rechargeHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ items: [{ id: "recharge-1", rechargeStatus: "PENDING_LIMENG_REVIEW" }] }), {
        status: 200,
      });
    }
    if (path.startsWith("/daochong/mobile/settlement-drafts")) {
      return new Response(JSON.stringify({ items: [{ id: "settlement-1", draftStatus: "READY_FOR_APPROVAL" }] }), {
        status: 200,
      });
    }
    if (path.startsWith("/daochong/mobile/consumption-approvals")) {
      return new Response(JSON.stringify({ items: [{ id: "approval-1", approvalStatus: "PENDING" }] }), {
        status: 200,
      });
    }
    if (path.startsWith("/daochong/mobile/finance-summary")) {
      return new Response(JSON.stringify({ items: [{ id: "finance-1", summaryMonth: "2026-06", financeStatus: "DRAFT" }] }), {
        status: 200,
      });
    }
    if (path.startsWith("/daochong/mobile/finance-evidence-exceptions")) {
      return new Response(JSON.stringify({ items: [{ id: "exception-1", exceptionStatus: "PENDING_SUPPLEMENT" }] }), {
        status: 200,
      });
    }
    if (path.startsWith("/daochong/mobile/bonus-expense-items")) {
      return new Response(JSON.stringify({ items: [{ id: "bonus-1", financeStatus: "PENDING_FINANCE_REVIEW" }] }), {
        status: 200,
      });
    }
    if (path.startsWith("/daochong/mobile/compensation-rules")) {
      return new Response(JSON.stringify({ items: [{ id: "rule-1", teacherId: "teacher-1", baseSalary: "5000.00" }] }), {
        status: 200,
      });
    }
    if (path.startsWith("/daochong/mobile/project-communications")) {
      return new Response(JSON.stringify({ items: [{ id: "communication-1", topic: "协作复盘", status: "readonly" }] }), {
        status: 200,
      });
    }
    return new Response(JSON.stringify({ items: [{ id: "meeting-1", title: "复盘会", todoItems: ["补纪要"] }] }), {
      status: 200,
    });
    });
  } finally {
    restoreWindow();
  }

  assert.equal(getDaochongReadonlyEvidenceAssetsPath(), "/daochong/mobile/evidence-assets?businessType=daochong&limit=20");
  assert.equal(getDaochongReadonlyRechargesPath(), "/daochong/mobile/recharges?limit=20");
  assert.equal(getDaochongReadonlySettlementDraftsPath(), "/daochong/mobile/settlement-drafts?limit=20");
  assert.match(getDaochongReadonlyConsumptionApprovalsPath(), /^\/daochong\/mobile\/consumption-approvals\?limit=20&summaryMonth=/);
  assert.match(getDaochongReadonlyFinanceSummaryPath(), /^\/daochong\/mobile\/finance-summary\?limit=6&summaryMonth=/);
  assert.match(getDaochongReadonlyFinanceEvidenceExceptionsPath(), /^\/daochong\/mobile\/finance-evidence-exceptions\?limit=20&summaryMonth=/);
  assert.match(getDaochongReadonlyBonusExpenseItemsPath(), /^\/daochong\/mobile\/bonus-expense-items\?limit=20&summaryMonth=/);
  assert.match(getDaochongReadonlyCompensationRulesPath(), /^\/daochong\/mobile\/compensation-rules\?effectiveMonth=/);
  assert.equal(getDaochongReadonlyMeetingNotesPath(), "/daochong/mobile/meeting-notes?folderId=daochong-weekly&limit=20");
  assert.equal(getDaochongReadonlyProjectCommunicationsPath(), "/daochong/mobile/project-communications?folderId=daochong-weekly&limit=20");
  assert.deepEqual(paths.map((path) => path
    .replace(/summaryMonth=\d{4}-\d{2}/, "summaryMonth=YYYY-MM")
    .replace(/effectiveMonth=\d{4}-\d{2}/, "effectiveMonth=YYYY-MM")), [
    "GET /daochong/mobile/evidence-assets?businessType=daochong&limit=20",
    "GET /daochong/mobile/recharges?limit=20",
    "GET /daochong/mobile/settlement-drafts?limit=20",
    "GET /daochong/mobile/consumption-approvals?limit=20&summaryMonth=YYYY-MM",
    "GET /daochong/mobile/finance-summary?limit=6&summaryMonth=YYYY-MM",
    "GET /daochong/mobile/finance-evidence-exceptions?limit=20&summaryMonth=YYYY-MM",
    "GET /daochong/mobile/bonus-expense-items?limit=20&summaryMonth=YYYY-MM",
    "GET /daochong/mobile/compensation-rules?effectiveMonth=YYYY-MM&limit=20",
    "GET /daochong/mobile/project-communications?folderId=daochong-weekly&limit=20",
    "GET /daochong/mobile/meeting-notes?folderId=daochong-weekly&limit=20",
  ]);
  assert.equal(rechargeHeaders?.get("authorization"), "Bearer readonly-token");
  assert.equal(rechargeHeaders?.get("x-huigui-record-scope"), "TEST");
  assert.equal(rechargeHeaders?.get("x-huigui-test-batch-id"), "batch-1");
  assert.equal(result.diagnostics.evidenceAssets?.status, "success");
  assert.equal(result.diagnostics.recharges?.status, "success");
  assert.equal(result.diagnostics.settlementDrafts?.status, "success");
  assert.equal(result.diagnostics.consumptionApprovals?.status, "success");
  assert.equal(result.diagnostics.financeSummary?.status, "success");
  assert.equal(result.diagnostics.financeEvidenceExceptions?.status, "success");
  assert.equal(result.diagnostics.bonusExpenseItems?.status, "success");
  assert.equal(result.diagnostics.compensationRules?.status, "success");
  assert.equal(result.diagnostics.meetingNotes?.status, "success");
  assert.equal(result.diagnostics.projectCommunications?.status, "success");
  assert.deepEqual(result.evidenceAssets, { items: [{ id: "ev-1", fileName: "proof.jpg", reviewStatus: "ACTIVE" }] });
  assert.deepEqual(result.recharges, { items: [{ id: "recharge-1", rechargeStatus: "PENDING_LIMENG_REVIEW" }] });
  assert.deepEqual(result.settlementDrafts, { items: [{ id: "settlement-1", draftStatus: "READY_FOR_APPROVAL" }] });
  assert.deepEqual(result.consumptionApprovals, { items: [{ id: "approval-1", approvalStatus: "PENDING" }] });
  assert.deepEqual(result.financeSummary, { items: [{ id: "finance-1", summaryMonth: "2026-06", financeStatus: "DRAFT" }] });
  assert.deepEqual(result.financeEvidenceExceptions, { items: [{ id: "exception-1", exceptionStatus: "PENDING_SUPPLEMENT" }] });
  assert.deepEqual(result.bonusExpenseItems, { items: [{ id: "bonus-1", financeStatus: "PENDING_FINANCE_REVIEW" }] });
  assert.deepEqual(result.compensationRules, { items: [{ id: "rule-1", teacherId: "teacher-1", baseSalary: "5000.00" }] });
  assert.deepEqual(result.meetingNotes, { items: [{ id: "meeting-1", title: "复盘会", todoItems: ["补纪要"] }] });
  assert.deepEqual(result.projectCommunications, { items: [{ id: "communication-1", topic: "协作复盘", status: "readonly" }] });
});

test("Daochong readonly high-risk fetch normalizes backend disabled and empty envelopes", async () => {
  const result = await fetchDaochongReadonlyHighRiskWithClient(async (path) => {
    if (path.startsWith("/daochong/mobile/evidence-assets")) {
      return new Response(
        JSON.stringify({
          items: [],
          diagnostics: [
            {
              key: "evidence_assets_high_risk_readonly_disabled",
              message: "高风险只读开关关闭",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (path.startsWith("/daochong/mobile/recharges")) {
      return new Response(
        JSON.stringify({
          items: [],
          diagnostics: [
            {
              key: "recharges_high_risk_readonly_disabled",
              message: "充值只读开关关闭",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (path.startsWith("/daochong/mobile/settlement-drafts")) {
      return new Response(
        JSON.stringify({
          items: [],
          diagnostics: [
            {
              key: "settlement_drafts_empty",
              message: "结算草稿暂无匹配记录",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (path.startsWith("/daochong/mobile/consumption-approvals")) {
      return new Response(
        JSON.stringify({
          items: [],
          diagnostics: [
            {
              key: "consumption_approvals_empty",
              message: "耗卡审批暂无匹配记录",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (path.startsWith("/daochong/mobile/finance-summary")) {
      return new Response(
        JSON.stringify({
          items: [],
          diagnostics: [
            {
              key: "finance_summary_high_risk_readonly_disabled",
              message: "财务汇总只读开关关闭",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (path.startsWith("/daochong/mobile/finance-evidence-exceptions")) {
      return new Response(
        JSON.stringify({
          items: [],
          diagnostics: [
            {
              key: "finance_evidence_exceptions_empty",
              message: "财务异常暂无匹配记录",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (path.startsWith("/daochong/mobile/bonus-expense-items")) {
      return new Response(
        JSON.stringify({
          items: [],
          diagnostics: [
            {
              key: "bonus_expense_items_empty",
              message: "奖金报销暂无匹配记录",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (path.startsWith("/daochong/mobile/compensation-rules")) {
      return new Response(
        JSON.stringify({
          items: [],
          diagnostics: [
            {
              key: "compensation_rules_source_mapping_pending",
              message: "薪酬配置来源待建",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (path.startsWith("/daochong/mobile/project-communications")) {
      return new Response(
        JSON.stringify({
          items: [],
          diagnostics: [
            {
              key: "project_communications_meeting_record_empty",
              message: "MeetingMinutesRecord 暂无匹配的项目沟通",
            },
          ],
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        items: [],
        diagnostics: [
          {
            key: "meeting_notes_record_empty",
            message: "MeetingMinutesRecord 暂无匹配记录",
          },
        ],
      }),
      { status: 200 },
    );
  });

  assert.equal(result.diagnostics.evidenceAssets?.status, "disabled");
  assert.equal(result.diagnostics.evidenceAssets?.note, "高风险只读开关关闭");
  assert.equal(result.diagnostics.recharges?.status, "disabled");
  assert.equal(result.diagnostics.recharges?.note, "充值只读开关关闭");
  assert.equal(result.diagnostics.settlementDrafts?.status, "empty");
  assert.equal(result.diagnostics.settlementDrafts?.note, "结算草稿暂无匹配记录");
  assert.equal(result.diagnostics.consumptionApprovals?.status, "empty");
  assert.equal(result.diagnostics.consumptionApprovals?.note, "耗卡审批暂无匹配记录");
  assert.equal(result.diagnostics.financeSummary?.status, "disabled");
  assert.equal(result.diagnostics.financeSummary?.note, "财务汇总只读开关关闭");
  assert.equal(result.diagnostics.financeEvidenceExceptions?.status, "empty");
  assert.equal(result.diagnostics.financeEvidenceExceptions?.note, "财务异常暂无匹配记录");
  assert.equal(result.diagnostics.bonusExpenseItems?.status, "empty");
  assert.equal(result.diagnostics.bonusExpenseItems?.note, "奖金报销暂无匹配记录");
  assert.equal(result.diagnostics.compensationRules?.status, "empty");
  assert.equal(result.diagnostics.compensationRules?.note, "薪酬配置来源待建");
  assert.equal(result.diagnostics.projectCommunications?.status, "empty");
  assert.equal(result.diagnostics.projectCommunications?.note, "MeetingMinutesRecord 暂无匹配的项目沟通");
  assert.equal(result.diagnostics.meetingNotes?.status, "empty");
  assert.equal(result.diagnostics.meetingNotes?.note, "MeetingMinutesRecord 暂无匹配记录");
});

test("Daochong readonly fetch client reports success and error states", async () => {
  const result = await fetchDaochongReadonlyAdapterInputWithClient(async (path) => {
    if (path.startsWith("/tasks")) {
      return new Response(
        JSON.stringify({
          items: [
            {
              title: "头疗复调",
              status: "TODO",
              startAt: "2026-06-23T13:30:00+08:00",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (path.startsWith("/products")) {
      return new Response(
        JSON.stringify([
          {
            displayName: "道冲香疗",
            employeeVisible: true,
            salePrice: "398",
          },
        ]),
        { status: 200 },
      );
    }
    if (path.startsWith("/customers")) {
      return new Response(
        JSON.stringify({
          items: [
            {
              customerName: "林女士",
              status: "CONTACTED",
            },
          ],
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ message: "server error" }), { status: 500 });
  });

  assert.equal(result.diagnostics.appointments?.status, "success");
  assert.equal(result.diagnostics.customers?.status, "success");
  assert.equal(result.diagnostics.projects?.status, "success");
  assert.equal(result.diagnostics.roster?.status, "error");
  assert.equal(Array.isArray(result.input.appointmentTaskResponse) ? false : result.input.appointmentTaskResponse?.items?.[0]?.title, "头疗复调");
  assert.equal(Array.isArray(result.input.customerListResponse) ? false : result.input.customerListResponse?.items?.[0]?.customerName, "林女士");
  assert.equal(result.input.projectRecords?.[0]?.displayName, "道冲香疗");
  assert.equal(result.input.rosterResponse, null);
});
