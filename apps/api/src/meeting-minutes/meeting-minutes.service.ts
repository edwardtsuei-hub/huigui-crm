import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";
import { fetch as undiciFetch, File, FormData, ProxyAgent } from "undici";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import type {
  MeetingMinutesAudioAnalysisFileInput,
  MeetingMinutesAudioAnalysisInput,
  MeetingMinutesAudioAnalysisResult,
  MeetingMinutesAudioAnalysisTaskPayload,
  MeetingMinutesAudioAnalysisTaskStatus,
  MeetingMinutesOpenAiStatus,
} from "./meeting-minutes.types";

interface MeetingMinutesModelOutput {
  translatedTranscript: string;
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    text: string;
    owner: string;
    dueLabel: string;
  }>;
  questions: string[];
  suggestions: string[];
}

interface MeetingMinutesAudioAnalysisTask {
  id: string;
  status: MeetingMinutesAudioAnalysisTaskStatus;
  input: MeetingMinutesAudioAnalysisInput;
  result: MeetingMinutesAudioAnalysisResult | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

interface MeetingMinutesAudioAnalysisTaskRecord {
  id: string;
  status: string;
  title: string;
  folderLabel: string;
  folderShortLabel: string;
  meetingAt: Date | null;
  fileNamesJson: Prisma.JsonValue;
  inputJson: Prisma.JsonValue;
  resultJson: Prisma.JsonValue | null;
  errorMessage: string | null;
  createdBy: string | null;
  createdByUserId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  audioClearedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AudioTranscriptionChunk {
  name: string;
  bytes: Buffer;
  mimeType: string;
}

interface MeetingMinutesStoredRecord {
  id: string;
  folderId: string;
  title: string;
  meetingAt: Date;
  sourceType: string;
  recordJson: Prisma.JsonValue;
  createdBy: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MeetingMinutesStoredFolderPermission {
  folderId: string;
  allowedIdentityIdsJson: Prisma.JsonValue;
  allowedParticipantIdsJson: Prisma.JsonValue;
  managerIdentityIdsJson: Prisma.JsonValue;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_SUMMARY_MODEL = "gpt-5-mini";
const AUDIO_TASK_LIMIT = 80;
const AUDIO_TASK_RETENTION_DAYS = 60;
const MAX_AUDIO_FILE_BYTES = 25 * 1024 * 1024;
const MAX_AUDIO_TRANSCRIPTION_BYTES = 24 * 1024 * 1024;
const AUDIO_CHUNK_SECONDS = 9 * 60;
const MEETING_RECORD_LIMIT = 500;
const AUDIO_CLEANUP_CYCLE_LABEL = "转写完成后每 2 个月清理原始音频";
const MEETING_FOLDER_IDS = [
  "bearhug-weekly",
  "daochong-weekly",
  "course-weekly",
  "office-weekly",
  "finance-weekly",
  "responsible-monthly",
  "gratitude-village",
] as const;

type MeetingFolderId = typeof MEETING_FOLDER_IDS[number];

const DEFAULT_MEETING_FOLDER_PERMISSIONS: Record<MeetingFolderId, {
  allowedIdentityIds: string[];
  allowedParticipantIds: string[];
  managerIdentityIds: string[];
}> = {
  "bearhug-weekly": {
    allowedIdentityIds: ["office_admin", "bearhug_manager"],
    allowedParticipantIds: ["bearhug-lisa", "bearhug-arui", "bearhug-shenqi", "bearhug-liyaoyao", "bearhug-luokaixin", "office-linjingyi", "founder-cuiyida", "founder-zhanghanyu"],
    managerIdentityIds: ["office_admin", "bearhug_manager"],
  },
  "daochong-weekly": {
    allowedIdentityIds: ["office_admin", "daochong_manager", "finance_reviewer"],
    allowedParticipantIds: ["daochong-chengcheng", "daochong-yanzi", "daochong-huixin", "daochong-juexin", "daochong-ziqing", "finance-zhoulimeng", "office-linjingyi", "founder-cuiyida", "founder-zhanghanyu"],
    managerIdentityIds: ["office_admin", "daochong_manager"],
  },
  "course-weekly": {
    allowedIdentityIds: ["office_admin", "course_coordinator"],
    allowedParticipantIds: ["course-yanan", "course-jiamin", "course-xuyan", "course-liaoliao", "course-yanghuimin", "office-linjingyi", "founder-cuiyida", "founder-zhanghanyu"],
    managerIdentityIds: ["office_admin", "course_coordinator"],
  },
  "office-weekly": {
    allowedIdentityIds: ["office_admin"],
    allowedParticipantIds: ["office-linjingyi", "founder-cuiyida", "founder-zhanghanyu"],
    managerIdentityIds: ["office_admin"],
  },
  "finance-weekly": {
    allowedIdentityIds: ["office_admin", "finance_reviewer"],
    allowedParticipantIds: ["finance-zhoulimeng", "office-linjingyi", "founder-cuiyida", "founder-zhanghanyu"],
    managerIdentityIds: ["office_admin", "finance_reviewer"],
  },
  "responsible-monthly": {
    allowedIdentityIds: ["office_admin", "bearhug_manager", "daochong_manager", "course_coordinator", "finance_reviewer"],
    allowedParticipantIds: ["bearhug-lisa", "daochong-chengcheng", "course-yanan", "finance-zhoulimeng", "office-linjingyi", "founder-cuiyida", "founder-zhanghanyu"],
    managerIdentityIds: ["office_admin", "bearhug_manager", "daochong_manager", "course_coordinator", "finance_reviewer"],
  },
  "gratitude-village": {
    allowedIdentityIds: ["office_admin", "course_coordinator"],
    allowedParticipantIds: ["course-yanan", "course-jiamin", "office-linjingyi", "founder-cuiyida", "founder-zhanghanyu"],
    managerIdentityIds: ["office_admin", "course_coordinator"],
  },
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true" || value === "1";
}

function uniqueTextList(values: string[], limit: number, fallback: string) {
  const items = Array.from(
    new Set(values.map((item) => item.trim()).filter(Boolean)),
  ).slice(0, limit);
  return items.length ? items : [fallback];
}

function extractDataUrlBase64(value: string) {
  const commaIndex = value.indexOf(",");
  return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

function resolveFileMimeType(file: MeetingMinutesAudioAnalysisFileInput) {
  const dataUrlMime = normalizeText(file.dataUrl).match(/^data:([^;,]+)[;,]/)?.[1];
  return normalizeText(file.mimeType) || dataUrlMime || "application/octet-stream";
}

function collectOutputText(value: unknown, results: string[] = []) {
  if (!value || typeof value !== "object") return results;
  if (Array.isArray(value)) {
    value.forEach((item) => collectOutputText(item, results));
    return results;
  }

  const record = value as Record<string, unknown>;
  const text = normalizeText(record.text);
  if (text && (record.type === "output_text" || record.type === "text")) {
    results.push(text);
  }
  Object.values(record).forEach((item) => collectOutputText(item, results));
  return results;
}

function extractOpenAiOutputText(payload: unknown) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    const outputText = normalizeText(record.output_text);
    if (outputText) return outputText;
    const text = normalizeText(record.text);
    if (text) return text;
  }

  return collectOutputText(payload)[0] ?? "";
}

function normalizeStringArray(value: unknown, limit: number, fallback: string) {
  return Array.isArray(value)
    ? uniqueTextList(value.map(normalizeText), limit, fallback)
    : [fallback];
}

function normalizePreviousMeeting(value: unknown): MeetingMinutesAudioAnalysisInput["previousMeeting"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    title: normalizeText(record.title),
    summary: normalizeText(record.summary),
    carryOverItems: normalizeStringArray(record.carryOverItems, 8, ""),
    openIssues: normalizeStringArray(record.openIssues, 8, ""),
    actionItems: Array.isArray(record.actionItems)
      ? record.actionItems.flatMap((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return [];
          const action = item as Record<string, unknown>;
          const text = normalizeText(action.text);
          if (!text) return [];
          return [{
            text,
            owner: normalizeText(action.owner) || "待确认",
            dueLabel: normalizeText(action.dueLabel) || "下次会议前",
          }];
        }).slice(0, 8)
      : [],
  };
}

function toDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: unknown) {
  return toDate(value)?.toISOString() ?? null;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonthsIso(value: string, monthCount: number) {
  const date = toDate(value) ?? new Date();
  date.setMonth(date.getMonth() + monthCount);
  return date.toISOString();
}

function createMeetingId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isMeetingFolderId(value: unknown): value is MeetingFolderId {
  return typeof value === "string" && (MEETING_FOLDER_IDS as readonly string[]).includes(value);
}

function normalizeRecordObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function hasOwnValue(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeStringList(value: unknown, limit = 80) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((item) => normalizeText(item)).filter(Boolean)),
  ).slice(0, limit);
}

function normalizeNullableText(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeMeetingDate(value: unknown, fallback?: string | Date | null) {
  return toIso(normalizeText(value)) ?? toIso(fallback) ?? new Date().toISOString();
}

function normalizeMeetingSourceType(value: unknown) {
  return value === "text" ? "text" : "audio";
}

function normalizeMeetingAnalysisStatus(value: unknown) {
  const text = normalizeText(value);
  return text === "queued" || text === "running" || text === "ready" || text === "failed"
    ? text
    : "draft";
}

function normalizeMeetingTaskStatus(value: unknown) {
  const text = normalizeText(value);
  return text === "queued" || text === "running" || text === "completed" || text === "failed"
    ? text
    : null;
}

function resolveMeetingAudioRetentionStatus(cleanupDueAt: string | null, cleanedAt: string | null) {
  if (cleanedAt) return "cleaned";
  if (!cleanupDueAt) return "not_required";
  const dueDate = toDate(cleanupDueAt);
  if (!dueDate) return "scheduled";
  return dueDate.getTime() <= Date.now() ? "due" : "scheduled";
}

function normalizeMeetingActionItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const record = normalizeRecordObject(item);
    const text = normalizeText(record.text);
    if (!text) return [];
    const status = normalizeText(record.status) === "done" ? "done" : "open";
    return [{
      id: normalizeText(record.id) || `action-${Date.now().toString(36)}-${index + 1}`,
      text,
      owner: normalizeText(record.owner) || "待确认",
      dueLabel: normalizeText(record.dueLabel) || "下次会议前",
      status,
    }];
  }).slice(0, 50);
}

function normalizeMeetingDiscussionMessages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const record = normalizeRecordObject(item);
    const body = normalizeText(record.body);
    if (!body) return [];
    return [{
      id: normalizeText(record.id) || `message-${Date.now().toString(36)}-${index + 1}`,
      author: normalizeText(record.author) || "系统",
      role: normalizeText(record.role) || "会议纪要",
      body,
      at: normalizeMeetingDate(record.at),
    }];
  }).slice(0, 200);
}

function normalizeMeetingContinuity(value: unknown) {
  const record = normalizeRecordObject(value);
  return {
    previousMeetingId: normalizeNullableText(record.previousMeetingId),
    previousMeetingTitle: normalizeText(record.previousMeetingTitle) || "暂无上一场会议",
    carryOverItems: normalizeStringList(record.carryOverItems, 30),
    openIssues: normalizeStringList(record.openIssues, 30),
  };
}

function normalizeMeetingAudioRetention(
  value: unknown,
  sourceType: string,
  meetingAt: string,
  createdAt: string,
) {
  const record = normalizeRecordObject(value);
  if (sourceType !== "audio") {
    return {
      cleanupDueAt: null,
      status: "not_required",
      cleanedAt: null,
      cleanupCycleLabel: AUDIO_CLEANUP_CYCLE_LABEL,
    };
  }

  const cleanedAt = toIso(record.cleanedAt);
  const cleanupDueAt = toIso(record.cleanupDueAt) ?? addMonthsIso(meetingAt || createdAt, 2);
  return {
    cleanupDueAt,
    status: resolveMeetingAudioRetentionStatus(cleanupDueAt, cleanedAt),
    cleanedAt,
    cleanupCycleLabel: normalizeText(record.cleanupCycleLabel) || AUDIO_CLEANUP_CYCLE_LABEL,
  };
}

function normalizeMeetingRecordPayload(
  value: unknown,
  options: {
    user?: AuthenticatedUser;
    fallback?: Record<string, unknown>;
    forceId?: string;
  } = {},
) {
  const fallback = options.fallback ?? {};
  const record = {
    ...fallback,
    ...normalizeRecordObject(value),
  };
  const now = new Date().toISOString();
  const folderId = isMeetingFolderId(record.folderId) ? record.folderId : "course-weekly";
  const sourceType = normalizeMeetingSourceType(record.sourceType);
  const createdAt = normalizeMeetingDate(record.createdAt, fallback.createdAt as string | undefined);
  const meetingAt = normalizeMeetingDate(record.meetingAt, fallback.meetingAt as string | undefined);
  const updatedAt = normalizeMeetingDate(record.updatedAt, now);
  const creatorName = normalizeText(options.user?.wecomName)
    || normalizeText(options.user?.name)
    || normalizeText(record.createdBy)
    || "系统";
  const title = normalizeText(record.title) || `会议纪要 ${meetingAt.slice(0, 10)}`;
  const transcript = normalizeText(record.transcript)
    || normalizeText(record.textInput)
    || (sourceType === "audio" ? "会议录音已上传，等待系统转写。" : "会议文字已上传。");
  const summary = normalizeText(record.summary) || "会议纪要已保存，等待复核总结。";
  const analysisTaskStatus = normalizeMeetingTaskStatus(record.analysisTaskStatus);

  return {
    id: options.forceId ?? (normalizeText(record.id) || createMeetingId("meeting")),
    folderId,
    title,
    meetingAt,
    createdAt,
    createdBy: creatorName,
    sourceType,
    sourceLabel: normalizeText(record.sourceLabel) || (sourceType === "audio" ? "录音上传" : "文字补录"),
    attachmentIds: normalizeStringList(record.attachmentIds, 80),
    textInput: normalizeText(record.textInput),
    transcript,
    summary,
    keyPoints: normalizeStringList(record.keyPoints, 50),
    actionItems: normalizeMeetingActionItems(record.actionItems),
    questions: normalizeStringList(record.questions, 50),
    suggestions: normalizeStringList(record.suggestions, 50),
    discussionMessages: normalizeMeetingDiscussionMessages(record.discussionMessages),
    continuity: normalizeMeetingContinuity(record.continuity),
    audioRetention: normalizeMeetingAudioRetention(record.audioRetention, sourceType, meetingAt, createdAt),
    analysisStatus: normalizeMeetingAnalysisStatus(record.analysisStatus),
    analysisLabel: normalizeText(record.analysisLabel) || "OpenAI 摘要草稿",
    analysisTaskId: normalizeNullableText(record.analysisTaskId),
    analysisTaskStatus,
    analysisTaskUpdatedAt: toIso(record.analysisTaskUpdatedAt),
    updatedAt,
  };
}

function normalizeMeetingFolderPermissionPayload(
  folderId: string,
  value: unknown,
  fallback?: {
    allowedIdentityIds: string[];
    allowedParticipantIds: string[];
    managerIdentityIds: string[];
  },
) {
  if (!isMeetingFolderId(folderId)) {
    throw new BadRequestException("会议纪要资料夹不存在。");
  }
  const record = normalizeRecordObject(value);
  const defaults = fallback ?? DEFAULT_MEETING_FOLDER_PERMISSIONS[folderId];
  const allowedIdentityIds = hasOwnValue(record, "allowedIdentityIds")
    ? normalizeStringList(record.allowedIdentityIds, 30)
    : defaults.allowedIdentityIds;
  const allowedParticipantIds = hasOwnValue(record, "allowedParticipantIds")
    ? normalizeStringList(record.allowedParticipantIds, 120)
    : defaults.allowedParticipantIds;
  const managerIdentityIds = hasOwnValue(record, "managerIdentityIds")
    ? normalizeStringList(record.managerIdentityIds, 30)
    : defaults.managerIdentityIds;
  return {
    folderId,
    allowedIdentityIds,
    allowedParticipantIds,
    managerIdentityIds: managerIdentityIds.length
      ? Array.from(new Set(["office_admin", ...managerIdentityIds]))
      : defaults.managerIdentityIds,
    updatedAt: normalizeMeetingDate(record.updatedAt),
  };
}

function resolveMeetingIdentityId(user?: AuthenticatedUser) {
  if (!user) return "";
  const text = `${user.roleCode} ${user.roleName} ${user.department ?? ""} ${user.title ?? ""} ${user.name} ${user.wecomName ?? ""}`.toLowerCase();
  if (/super_admin|admin|办公室|辦公室|综合|綜合|founder|创办|創辦|管理/.test(text)) return "office_admin";
  if (/finance|财务|財務|人事/.test(text)) return "finance_reviewer";
  if (/daochong|道冲|道沖/.test(text)) return "daochong_manager";
  if (/course|课程|課程|光的家园|光的家園/.test(text)) return "course_coordinator";
  if (/bearhug|熊抱|餐饮|餐飲|门店|門店|前厅|前廳|后厨|後廚/.test(text)) return "bearhug_manager";
  return "";
}

function resolveMeetingParticipantIds(user?: AuthenticatedUser) {
  if (!user) return [];
  const identityId = resolveMeetingIdentityId(user);
  const rawName = normalizeText(user.wecomName ?? user.name);
  const name = rawName.toLowerCase();
  const byIdentity: Record<string, string> = {
    office_admin: "office-linjingyi",
    finance_reviewer: "finance-zhoulimeng",
    daochong_manager: "daochong-chengcheng",
    course_coordinator: "course-yanan",
    bearhug_manager: "bearhug-lisa",
  };
  const byName: Record<string, string> = {
    lisa: "bearhug-lisa",
    "阿蕊": "bearhug-arui",
    "申琦": "bearhug-shenqi",
    "李瑶瑶": "bearhug-liyaoyao",
    "罗凯欣": "bearhug-luokaixin",
    "程程": "daochong-chengcheng",
    "燕子": "daochong-yanzi",
    "慧心": "daochong-huixin",
    "觉心": "daochong-juexin",
    "子青": "daochong-ziqing",
    "雅南": "course-yanan",
    "嘉敏": "course-jiamin",
    "许研": "course-xuyan",
    "了了": "course-liaoliao",
    "杨慧敏": "course-yanghuimin",
    "林静宜": "office-linjingyi",
    "周立猛": "finance-zhoulimeng",
    "崔以达": "founder-cuiyida",
    "张涵予": "founder-zhanghanyu",
  };
  return Array.from(new Set([
    identityId ? byIdentity[identityId] : "",
    byName[name],
    byName[rawName],
  ].filter(Boolean)));
}

function isMeetingAdmin(user?: AuthenticatedUser) {
  if (!user) return false;
  return user.roleCode === "SUPER_ADMIN"
    || user.roleCode === "ADMIN"
    || resolveMeetingIdentityId(user) === "office_admin"
    || user.permissions.includes("menu.management");
}

function estimateBase64ByteLength(value: string) {
  const normalized = value.replace(/\s/g, "");
  if (!normalized) return 0;
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function isMeetingMinutesTaskStatus(value: string): value is MeetingMinutesAudioAnalysisTaskStatus {
  return value === "queued" || value === "running" || value === "completed" || value === "failed";
}

function coerceAnalysisInput(value: unknown): MeetingMinutesAudioAnalysisInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      files: [],
      folderLabel: "会议资料夹",
      folderShortLabel: "会议",
      folderKind: "meeting",
      title: "会议纪要",
      meetingAt: new Date().toISOString(),
      createdBy: "系统",
      previousMeeting: null,
    };
  }
  const record = value as Record<string, unknown>;
  const files = Array.isArray(record.files)
    ? record.files.flatMap((file) => {
        if (!file || typeof file !== "object" || Array.isArray(file)) return [];
        const item = file as Record<string, unknown>;
        const name = normalizeText(item.name);
        if (!name) return [];
        return [{
          name,
          mimeType: normalizeText(item.mimeType) || undefined,
          dataUrl: normalizeText(item.dataUrl) || undefined,
          base64: normalizeText(item.base64) || undefined,
          fileUrl: normalizeText(item.fileUrl) || undefined,
          storageKey: normalizeText(item.storageKey) || undefined,
          sizeBytes: typeof item.sizeBytes === "number" && Number.isFinite(item.sizeBytes) ? item.sizeBytes : undefined,
        }];
      })
    : [];

  return {
    files,
    folderLabel: normalizeText(record.folderLabel) || "会议资料夹",
    folderShortLabel: normalizeText(record.folderShortLabel) || "会议",
    folderKind: normalizeText(record.folderKind) || "meeting",
    title: normalizeText(record.title) || "会议纪要",
    meetingAt: normalizeText(record.meetingAt) || new Date().toISOString(),
    createdBy: normalizeText(record.createdBy) || "系统",
    textHint: normalizeText(record.textHint),
    previousMeeting: normalizePreviousMeeting(record.previousMeeting),
    dryRun: normalizeBoolean(record.dryRun),
    strictOpenai: normalizeBoolean(record.strictOpenai),
  };
}

function coerceAnalysisResult(value: unknown): MeetingMinutesAudioAnalysisResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const generationMode = normalizeText(record.generationMode);
  if (generationMode !== "live" && generationMode !== "fallback" && generationMode !== "dry_run") return null;
  return {
    ok: record.ok === true,
    generationMode,
    transcriptionModel: normalizeText(record.transcriptionModel),
    model: normalizeText(record.model),
    transcript: normalizeText(record.transcript),
    translatedTranscript: normalizeText(record.translatedTranscript),
    summary: normalizeText(record.summary),
    keyPoints: normalizeStringArray(record.keyPoints, 8, "确认会议重点并补齐复核。"),
    actionItems: Array.isArray(record.actionItems)
      ? record.actionItems.flatMap((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return [];
          const action = item as Record<string, unknown>;
          const text = normalizeText(action.text);
          if (!text) return [];
          return [{
            text,
            owner: normalizeText(action.owner) || "待确认",
            dueLabel: normalizeText(action.dueLabel) || "下次会议前",
          }];
        }).slice(0, 8)
      : [],
    questions: normalizeStringArray(record.questions, 8, "是否还有需要补充负责人或截止时间的事项？"),
    suggestions: normalizeStringArray(record.suggestions, 8, "建议会后复核行动项，并在讨论区关闭已解决问题。"),
    sourceLabel: normalizeText(record.sourceLabel) || "OpenAI 转写",
    analysisLabel: normalizeText(record.analysisLabel) || "OpenAI 已整理",
    warnings: normalizeStringArray(record.warnings, 8, ""),
    processedFiles: Array.isArray(record.processedFiles)
      ? record.processedFiles.flatMap((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return [];
          const processed = item as Record<string, unknown>;
          const status = normalizeText(processed.status);
          return [{
            name: normalizeText(processed.name) || "meeting-audio",
            status: status === "transcribed" || status === "fallback" || status === "failed" ? status : "fallback",
            warning: normalizeText(processed.warning) || undefined,
          }];
        })
      : [],
    createdAt: normalizeText(record.createdAt) || new Date().toISOString(),
  };
}

function parseModelOutput(text: string): MeetingMinutesModelOutput | null {
  const normalized = text.trim();
  if (!normalized) return null;

  const candidates = [
    normalized,
    normalized.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim(),
  ];
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(normalized.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of Array.from(new Set(candidates)).filter(Boolean)) {
    try {
      const parsed = JSON.parse(candidate) as Partial<MeetingMinutesModelOutput>;
      const translatedTranscript = normalizeText(parsed.translatedTranscript);
      const summary = normalizeText(parsed.summary);
      if (!translatedTranscript || !summary) continue;

      return {
        translatedTranscript,
        summary,
        keyPoints: normalizeStringArray(parsed.keyPoints, 8, "确认会议重点并补齐复核。"),
        actionItems: Array.isArray(parsed.actionItems)
          ? parsed.actionItems.flatMap((item) => {
              if (!item || typeof item !== "object" || Array.isArray(item)) return [];
              const record = item as Record<string, unknown>;
              const actionText = normalizeText(record.text);
              if (!actionText) return [];
              return [{
                text: actionText,
                owner: normalizeText(record.owner) || "待确认",
                dueLabel: normalizeText(record.dueLabel) || "下次会议前",
              }];
            }).slice(0, 8)
          : [],
        questions: normalizeStringArray(parsed.questions, 8, "是否还有需要补充负责人或截止时间的事项？"),
        suggestions: normalizeStringArray(parsed.suggestions, 8, "建议会后复核行动项，并在讨论区关闭已解决问题。"),
      };
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function buildFallbackOutput(input: MeetingMinutesAudioAnalysisInput, transcript: string): MeetingMinutesModelOutput {
  const fileNames = input.files.map((file) => normalizeText(file.name)).filter(Boolean);
  const fallbackTranscript = normalizeText(transcript)
    || normalizeText(input.textHint)
    || (fileNames.length ? `音频文件：${fileNames.join("、")}。` : "会议资料已上传，等待 OpenAI 转写。");
  const previousTitle = normalizeText(input.previousMeeting?.title);
  const carryOver = input.previousMeeting?.actionItems
    ?.map((item) => item.text)
    .filter(Boolean)
    .slice(0, 2) ?? [];

  return {
    translatedTranscript: fallbackTranscript,
    summary: previousTitle
      ? `本次「${input.title || input.folderShortLabel}」已归入 ${input.folderShortLabel}，系统保留录音与待复核草稿，并参考上一场「${previousTitle}」延续事项。`
      : `本次「${input.title || input.folderShortLabel}」已归入 ${input.folderShortLabel}，系统保留录音与待复核草稿。`,
    keyPoints: uniqueTextList([
      ...fallbackTranscript.split(/[\n。；;]+/).slice(0, 3),
      fileNames.length ? `已上传 ${fileNames.length} 份会议录音。` : "",
    ], 5, "录音已上传，等待转写后补齐会议重点。"),
    actionItems: (carryOver.length ? carryOver : ["复核录音转写，补齐负责人、截止时间和资料位置"]).slice(0, 4).map((text) => ({
      text,
      owner: input.createdBy || "待确认",
      dueLabel: "下次会议前",
    })),
    questions: uniqueTextList([
      "这次会议中哪些行动项还缺负责人？",
      "关键事项是否需要补充截止时间？",
      previousTitle ? `上一场「${previousTitle}」的未完成事项是否已经关闭？` : "",
    ], 4, "是否有需要转入讨论区持续追踪的问题？"),
    suggestions: uniqueTextList([
      "建议确认转写无误后再标记原始音频清理。",
      previousTitle ? `下次总结先回看「${previousTitle}」的未关闭事项，再新增本次行动项。` : "后续同一资料夹内每场会议都和上一场串联，便于看出反复卡点。",
    ], 4, "建议会后复核行动项，并在讨论区关闭已解决问题。"),
  };
}

function buildResult(
  input: MeetingMinutesAudioAnalysisInput,
  output: MeetingMinutesModelOutput,
  options: {
    generationMode: MeetingMinutesAudioAnalysisResult["generationMode"];
    transcriptionModel: string;
    model: string;
    transcript: string;
    warnings: string[];
    processedFiles: MeetingMinutesAudioAnalysisResult["processedFiles"];
    createdAt: string;
  },
): MeetingMinutesAudioAnalysisResult {
  const live = options.generationMode === "live";
  return {
    ok: live,
    generationMode: options.generationMode,
    transcriptionModel: options.transcriptionModel,
    model: options.model,
    transcript: options.transcript,
    translatedTranscript: output.translatedTranscript,
    summary: output.summary,
    keyPoints: uniqueTextList(output.keyPoints, 8, "确认会议重点并补齐复核。"),
    actionItems: output.actionItems.length ? output.actionItems.slice(0, 8) : [{
      text: "复核会议纪要并补齐负责人、截止时间和资料位置",
      owner: input.createdBy || "待确认",
      dueLabel: "下次会议前",
    }],
    questions: uniqueTextList(output.questions, 8, "是否还有需要补充负责人或截止时间的事项？"),
    suggestions: uniqueTextList(output.suggestions, 8, "建议会后复核行动项，并在讨论区关闭已解决问题。"),
    sourceLabel: live ? "OpenAI 转写" : options.generationMode === "dry_run" ? "OpenAI dry-run" : "录音待转写",
    analysisLabel: live ? "OpenAI 已整理" : options.generationMode === "dry_run" ? "OpenAI dry-run" : "OpenAI 待接入",
    warnings: options.warnings,
    processedFiles: options.processedFiles,
    createdAt: options.createdAt,
  };
}

function stripAudioContent(input: MeetingMinutesAudioAnalysisInput): MeetingMinutesAudioAnalysisInput {
  return {
    ...input,
    files: input.files.map((file) => ({
      name: file.name,
      mimeType: file.mimeType,
      storageKey: file.storageKey,
      sizeBytes: file.sizeBytes,
    })),
  };
}

@Injectable()
export class MeetingMinutesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.cleanupExpiredAudioAnalysisTasks();
    await this.recoverActiveAudioAnalysisTasks();
  }

  getOpenAiStatus(): MeetingMinutesOpenAiStatus {
    const baseUrl = this.resolveOpenAiBaseUrl();
    const responsesUrl = this.resolveOpenAiUrl("responses");
    const audioUrl = this.resolveOpenAiUrl("audio/transcriptions");
    return {
      hasApiKey: Boolean(normalizeText(process.env.OPENAI_API_KEY)),
      baseUrlConfigured: Boolean(normalizeText(
        process.env.OPENAI_MEETING_MINUTES_BASE_URL
        ?? process.env.OPENAI_WEEKLY_SUMMARY_BASE_URL
        ?? process.env.OPENAI_BASE_URL
        ?? process.env.OPENAI_API_BASE
        ?? process.env.OPENAI_API_BASE_URL,
      )),
      proxyConfigured: Boolean(
        normalizeText(process.env.HTTPS_PROXY ?? process.env.https_proxy)
        || normalizeText(process.env.HTTP_PROXY ?? process.env.http_proxy)
        || normalizeText(process.env.ALL_PROXY ?? process.env.all_proxy),
      ),
      baseUrl,
      responsesUrl,
      audioUrl,
      transcriptionModel: normalizeText(process.env.OPENAI_MEETING_TRANSCRIPTION_MODEL) || DEFAULT_TRANSCRIPTION_MODEL,
      summaryModel: normalizeText(process.env.OPENAI_MEETING_SUMMARY_MODEL ?? process.env.OPENAI_WEEKLY_SUMMARY_MODEL) || DEFAULT_SUMMARY_MODEL,
      checkedAt: new Date().toISOString(),
    };
  }

  async getWorkspace(user?: AuthenticatedUser) {
    const permissions = await this.listFolderPermissions();
    const visibleFolderIds = this.resolveVisibleFolderIds(permissions, user);
    const recordWhere = isMeetingAdmin(user)
      ? {}
      : user?.id
        ? { OR: [{ folderId: { in: visibleFolderIds } }, { createdByUserId: user.id }] }
        : { folderId: { in: visibleFolderIds } };
    const records = await this.prisma.meetingMinutesRecord.findMany({
      where: recordWhere,
      orderBy: [{ meetingAt: "desc" }, { updatedAt: "desc" }],
      take: MEETING_RECORD_LIMIT,
    });

    return {
      records: records.map((record) => this.toMeetingRecordPayload(record)),
      permissions,
      meta: {
        persistence: "server",
        loadedAt: new Date().toISOString(),
        visibleFolderIds,
      },
    };
  }

  async saveRecord(body: Record<string, unknown>, user?: AuthenticatedUser) {
    const payload = normalizeMeetingRecordPayload(this.unwrapRecordBody(body), { user });
    await this.assertCanViewFolder(payload.folderId, user);
    return this.persistMeetingRecordPayload(payload, user);
  }

  async updateRecord(recordId: string, body: Record<string, unknown>, user?: AuthenticatedUser) {
    const existingRecord = await this.prisma.meetingMinutesRecord.findUnique({
      where: { id: recordId },
    });
    const fallback = existingRecord ? this.toMeetingRecordPayload(existingRecord) as Record<string, unknown> : { id: recordId };
    const payload = normalizeMeetingRecordPayload(this.unwrapRecordBody(body), {
      user,
      fallback,
      forceId: recordId,
    });
    await this.assertCanViewFolder(payload.folderId, user);
    return this.persistMeetingRecordPayload(payload, user);
  }

  async appendDiscussionMessage(recordId: string, body: Record<string, unknown>, user?: AuthenticatedUser) {
    const existingRecord = await this.getStoredRecordOrThrow(recordId);
    const payload = this.toMeetingRecordPayload(existingRecord);
    await this.assertCanViewFolder(payload.folderId, user);

    const record = normalizeRecordObject(body);
    const messageInput = normalizeRecordObject(record.message ?? body);
    const messageBody = normalizeText(messageInput.body);
    if (!messageBody) {
      throw new BadRequestException("讨论内容不能为空。");
    }
    const at = normalizeMeetingDate(messageInput.at);
    const nextMessage = {
      id: normalizeText(messageInput.id) || createMeetingId("message"),
      author: normalizeText(messageInput.author) || normalizeText(user?.wecomName ?? user?.name) || "系统",
      role: normalizeText(messageInput.role) || normalizeText(user?.title ?? user?.roleName) || "会议纪要",
      body: messageBody,
      at,
    };
    const nextPayload = normalizeMeetingRecordPayload({
      ...payload,
      discussionMessages: [...payload.discussionMessages, nextMessage],
      updatedAt: at,
    }, {
      fallback: payload as Record<string, unknown>,
      forceId: payload.id,
    });

    return this.persistMeetingRecordPayload(nextPayload, user);
  }

  async markAudioCleaned(recordId: string, body: Record<string, unknown>, user?: AuthenticatedUser) {
    const existingRecord = await this.getStoredRecordOrThrow(recordId);
    const payload = this.toMeetingRecordPayload(existingRecord);
    await this.assertCanManageFolder(payload.folderId, user);

    const now = new Date().toISOString();
    const providedRecord = normalizeRecordObject(body.record);
    const baseRecord = Object.keys(providedRecord).length ? providedRecord : payload;
    const nextPayload = normalizeMeetingRecordPayload({
      ...baseRecord,
      audioRetention: {
        ...payload.audioRetention,
        cleanupDueAt: payload.audioRetention.cleanupDueAt ?? addMonthsIso(payload.meetingAt || payload.createdAt, 2),
        status: "cleaned",
        cleanedAt: now,
        cleanupCycleLabel: payload.audioRetention.cleanupCycleLabel || AUDIO_CLEANUP_CYCLE_LABEL,
      },
      updatedAt: now,
    }, {
      fallback: payload as Record<string, unknown>,
      forceId: payload.id,
    });

    return this.persistMeetingRecordPayload(nextPayload, user);
  }

  async saveFolderPermission(folderId: string, body: Record<string, unknown>, user?: AuthenticatedUser) {
    const currentPermission = await this.getFolderPermissionPayload(folderId);
    this.assertCanManagePermission(currentPermission, user);
    const record = normalizeRecordObject(body);
    const permissionInput = normalizeRecordObject(record.permission ?? body);
    const payload = normalizeMeetingFolderPermissionPayload(folderId, permissionInput, currentPermission);
    const savedPermission = await this.prisma.meetingMinutesFolderPermission.upsert({
      where: { folderId: payload.folderId },
      create: {
        folderId: payload.folderId,
        allowedIdentityIdsJson: toInputJsonValue(payload.allowedIdentityIds),
        allowedParticipantIdsJson: toInputJsonValue(payload.allowedParticipantIds),
        managerIdentityIdsJson: toInputJsonValue(payload.managerIdentityIds),
        updatedByUserId: user?.id ?? null,
      },
      update: {
        allowedIdentityIdsJson: toInputJsonValue(payload.allowedIdentityIds),
        allowedParticipantIdsJson: toInputJsonValue(payload.allowedParticipantIds),
        managerIdentityIdsJson: toInputJsonValue(payload.managerIdentityIds),
        updatedByUserId: user?.id ?? null,
      },
    });

    return this.toFolderPermissionPayload(savedPermission);
  }

  async listAudioAnalysisTasks() {
    await this.cleanupExpiredAudioAnalysisTasks();
    const tasks = await this.prisma.meetingMinutesAudioAnalysisTask.findMany({
      orderBy: { createdAt: "desc" },
      take: AUDIO_TASK_LIMIT,
    });
    return tasks.map((task) => this.toTaskPayload(task));
  }

  async getAudioAnalysisTask(taskId: string) {
    const task = await this.prisma.meetingMinutesAudioAnalysisTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException("未找到会议纪要音频分析任务。");
    }
    return this.toTaskPayload(task);
  }

  async createAudioAnalysisTask(body: Record<string, unknown>) {
    const input = this.normalizeAnalysisInput(body);
    const createdAt = new Date();
    const task = await this.prisma.meetingMinutesAudioAnalysisTask.create({
      data: {
        id: `meeting-audio-task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        status: "queued",
        title: input.title,
        folderLabel: input.folderLabel,
        folderShortLabel: input.folderShortLabel,
        meetingAt: toDate(input.meetingAt),
        fileNamesJson: input.files.map((file) => file.name) as Prisma.InputJsonValue,
        inputJson: input as unknown as Prisma.InputJsonValue,
        resultJson: Prisma.JsonNull,
        errorMessage: null,
        createdBy: input.createdBy,
        createdByUserId: normalizeText(body.createdByUserId) || null,
        startedAt: null,
        completedAt: null,
        audioClearedAt: null,
        expiresAt: addDays(createdAt, AUDIO_TASK_RETENTION_DAYS),
        createdAt,
      },
    });
    this.runAudioAnalysisTask(task.id);
    return this.toTaskPayload(task);
  }

  async analyzeAudioNow(body: Record<string, unknown>) {
    return this.generateAudioAnalysis(this.normalizeAnalysisInput(body));
  }

  private async recoverActiveAudioAnalysisTasks() {
    const activeTasks = await this.prisma.meetingMinutesAudioAnalysisTask.findMany({
      where: { status: { in: ["queued", "running"] } },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    for (const task of activeTasks) {
      this.runAudioAnalysisTask(task.id);
    }
  }

  @Cron("20 3 * * *")
  async cleanupExpiredAudioAnalysisTasks() {
    await this.prisma.meetingMinutesAudioAnalysisTask.deleteMany({
      where: {
        status: { in: ["completed", "failed"] },
        expiresAt: { lt: new Date() },
      },
    });
  }

  private unwrapRecordBody(body: Record<string, unknown>) {
    const record = normalizeRecordObject(body.record);
    return Object.keys(record).length ? record : body;
  }

  private async getStoredRecordOrThrow(recordId: string) {
    const record = await this.prisma.meetingMinutesRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException("未找到会议纪要。");
    }
    return record;
  }

  private async persistMeetingRecordPayload(
    payload: ReturnType<typeof normalizeMeetingRecordPayload>,
    user?: AuthenticatedUser,
  ) {
    const meetingAt = toDate(payload.meetingAt) ?? new Date();
    const createdAt = toDate(payload.createdAt) ?? new Date();
    const savedRecord = await this.prisma.meetingMinutesRecord.upsert({
      where: { id: payload.id },
      create: {
        id: payload.id,
        folderId: payload.folderId,
        title: payload.title,
        meetingAt,
        sourceType: payload.sourceType,
        recordJson: toInputJsonValue(payload),
        createdBy: payload.createdBy,
        createdByUserId: user?.id ?? null,
        createdAt,
      },
      update: {
        folderId: payload.folderId,
        title: payload.title,
        meetingAt,
        sourceType: payload.sourceType,
        recordJson: toInputJsonValue(payload),
        createdBy: payload.createdBy,
      },
    });
    return this.toMeetingRecordPayload(savedRecord);
  }

  private toMeetingRecordPayload(record: MeetingMinutesStoredRecord) {
    const fallback = {
      id: record.id,
      folderId: record.folderId,
      title: record.title,
      meetingAt: record.meetingAt.toISOString(),
      sourceType: record.sourceType,
      createdBy: record.createdBy ?? "系统",
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
    const payload = normalizeMeetingRecordPayload(record.recordJson, { fallback });
    return {
      ...payload,
      id: record.id,
      folderId: isMeetingFolderId(record.folderId) ? record.folderId : payload.folderId,
      title: normalizeText(record.title) || payload.title,
      meetingAt: record.meetingAt.toISOString(),
      sourceType: normalizeMeetingSourceType(record.sourceType),
      createdBy: record.createdBy ?? payload.createdBy,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private createDefaultFolderPermissionPayload(folderId: MeetingFolderId) {
    return normalizeMeetingFolderPermissionPayload(
      folderId,
      {},
      DEFAULT_MEETING_FOLDER_PERMISSIONS[folderId],
    );
  }

  private toFolderPermissionPayload(permission: MeetingMinutesStoredFolderPermission) {
    if (!isMeetingFolderId(permission.folderId)) {
      return this.createDefaultFolderPermissionPayload("course-weekly");
    }
    return normalizeMeetingFolderPermissionPayload(permission.folderId, {
      allowedIdentityIds: permission.allowedIdentityIdsJson,
      allowedParticipantIds: permission.allowedParticipantIdsJson,
      managerIdentityIds: permission.managerIdentityIdsJson,
      updatedAt: permission.updatedAt.toISOString(),
    }, DEFAULT_MEETING_FOLDER_PERMISSIONS[permission.folderId]);
  }

  private async listFolderPermissions() {
    const storedPermissions = await this.prisma.meetingMinutesFolderPermission.findMany();
    const storedByFolder = new Map<MeetingFolderId, ReturnType<typeof normalizeMeetingFolderPermissionPayload>>();
    for (const permission of storedPermissions) {
      if (isMeetingFolderId(permission.folderId)) {
        storedByFolder.set(permission.folderId, this.toFolderPermissionPayload(permission));
      }
    }
    return MEETING_FOLDER_IDS.map((folderId) => (
      storedByFolder.get(folderId) ?? this.createDefaultFolderPermissionPayload(folderId)
    ));
  }

  private async getFolderPermissionPayload(folderId: string) {
    if (!isMeetingFolderId(folderId)) {
      throw new BadRequestException("会议纪要资料夹不存在。");
    }
    const permission = await this.prisma.meetingMinutesFolderPermission.findUnique({
      where: { folderId },
    });
    return permission
      ? this.toFolderPermissionPayload(permission)
      : this.createDefaultFolderPermissionPayload(folderId);
  }

  private resolveVisibleFolderIds(
    permissions: Array<ReturnType<typeof normalizeMeetingFolderPermissionPayload>>,
    user?: AuthenticatedUser,
  ) {
    if (!user || isMeetingAdmin(user)) return [...MEETING_FOLDER_IDS];
    return permissions
      .filter((permission) => this.canViewPermission(permission, user))
      .map((permission) => permission.folderId);
  }

  private canViewPermission(
    permission: ReturnType<typeof normalizeMeetingFolderPermissionPayload>,
    user?: AuthenticatedUser,
  ) {
    if (!user || isMeetingAdmin(user)) return true;
    const identityId = resolveMeetingIdentityId(user);
    const participantIds = resolveMeetingParticipantIds(user);
    return Boolean(
      identityId && (
        permission.allowedIdentityIds.includes(identityId)
        || permission.managerIdentityIds.includes(identityId)
      ),
    ) || participantIds.some((participantId) => permission.allowedParticipantIds.includes(participantId));
  }

  private canManagePermission(
    permission: ReturnType<typeof normalizeMeetingFolderPermissionPayload>,
    user?: AuthenticatedUser,
  ) {
    if (!user || isMeetingAdmin(user)) return true;
    const identityId = resolveMeetingIdentityId(user);
    return Boolean(identityId && permission.managerIdentityIds.includes(identityId));
  }

  private async assertCanViewFolder(folderId: string, user?: AuthenticatedUser) {
    const permission = await this.getFolderPermissionPayload(folderId);
    if (!this.canViewPermission(permission, user)) {
      throw new ForbiddenException("当前账号无权查看该会议纪要资料夹。");
    }
  }

  private async assertCanManageFolder(folderId: string, user?: AuthenticatedUser) {
    const permission = await this.getFolderPermissionPayload(folderId);
    this.assertCanManagePermission(permission, user);
  }

  private assertCanManagePermission(
    permission: ReturnType<typeof normalizeMeetingFolderPermissionPayload>,
    user?: AuthenticatedUser,
  ) {
    if (!this.canManagePermission(permission, user)) {
      throw new ForbiddenException("当前账号无权设置该会议纪要资料夹。");
    }
  }

  private toMemoryTask(task: MeetingMinutesAudioAnalysisTaskRecord): MeetingMinutesAudioAnalysisTask {
    const input = coerceAnalysisInput(task.inputJson);
    input.title = input.title || task.title;
    input.folderLabel = input.folderLabel || task.folderLabel;
    input.folderShortLabel = input.folderShortLabel || task.folderShortLabel;
    input.meetingAt = input.meetingAt || task.meetingAt?.toISOString() || new Date().toISOString();
    const status = isMeetingMinutesTaskStatus(task.status) ? task.status : "failed";
    return {
      id: task.id,
      status,
      input,
      result: coerceAnalysisResult(task.resultJson),
      errorMessage: task.errorMessage,
      createdAt: task.createdAt.toISOString(),
      startedAt: toIso(task.startedAt),
      completedAt: toIso(task.completedAt),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private toTaskPayload(task: MeetingMinutesAudioAnalysisTaskRecord): MeetingMinutesAudioAnalysisTaskPayload {
    const memoryTask = this.toMemoryTask(task);
    return {
      id: memoryTask.id,
      status: memoryTask.status,
      result: memoryTask.result,
      errorMessage: memoryTask.errorMessage,
      createdAt: memoryTask.createdAt,
      startedAt: memoryTask.startedAt,
      completedAt: memoryTask.completedAt,
      updatedAt: memoryTask.updatedAt,
      inputMeta: {
        title: memoryTask.input.title,
        meetingAt: memoryTask.input.meetingAt,
        folderLabel: memoryTask.input.folderLabel,
        folderShortLabel: memoryTask.input.folderShortLabel,
        fileNames: memoryTask.input.files.map((file) => file.name),
      },
    };
  }

  private async markTaskRunning(taskId: string) {
    const startedAt = new Date();
    return this.prisma.meetingMinutesAudioAnalysisTask.update({
      where: { id: taskId },
      data: {
        status: "running",
        startedAt,
      },
    });
  }

  private runAudioAnalysisTask(taskId: string) {
    void Promise.resolve().then(async () => {
      const runningTask = await this.markTaskRunning(taskId);
      const task = this.toMemoryTask(runningTask);
      const input = task.input;

      try {
        if (!input.files.some((file) => normalizeText(file.base64) || normalizeText(file.dataUrl) || normalizeText(file.fileUrl))) {
          throw new Error("会议纪要音频任务缺少原始音频内容，无法继续分析。");
        }
        const result = await this.generateAudioAnalysis(input);
        const completedAt = new Date();
        await this.prisma.meetingMinutesAudioAnalysisTask.update({
          where: { id: taskId },
          data: {
            inputJson: stripAudioContent(input) as unknown as Prisma.InputJsonValue,
            status: "completed",
            resultJson: result as unknown as Prisma.InputJsonValue,
            errorMessage: null,
            completedAt,
            audioClearedAt: completedAt,
            expiresAt: addDays(completedAt, AUDIO_TASK_RETENTION_DAYS),
          },
        });
      } catch (error) {
        const completedAt = new Date();
        const errorMessage = error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "OpenAI 音频分析未完成。";
        await this.prisma.meetingMinutesAudioAnalysisTask.update({
          where: { id: taskId },
          data: {
            inputJson: stripAudioContent(input) as unknown as Prisma.InputJsonValue,
            status: "failed",
            resultJson: Prisma.JsonNull,
            errorMessage,
            completedAt,
            audioClearedAt: completedAt,
            expiresAt: addDays(completedAt, AUDIO_TASK_RETENTION_DAYS),
          },
        });
      }
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Meeting minutes audio task ${taskId} failed before completion: ${message}`);
    });
  }

  private normalizeAnalysisInput(body: Record<string, unknown>) {
    const files = Array.isArray(body.files)
      ? body.files.flatMap((file) => {
          if (!file || typeof file !== "object" || Array.isArray(file)) return [];
          const item = file as Record<string, unknown>;
          const name = normalizeText(item.name);
          const dataUrl = normalizeText(item.dataUrl);
          const base64 = normalizeText(item.base64);
          const fileUrl = normalizeText(item.fileUrl);
          if (!name || (!dataUrl && !base64 && !fileUrl)) return [];
          return [{
            name,
            mimeType: normalizeText(item.mimeType) || undefined,
            dataUrl: dataUrl || undefined,
            base64: base64 || undefined,
            fileUrl: fileUrl || undefined,
            storageKey: normalizeText(item.storageKey) || undefined,
            sizeBytes: typeof item.sizeBytes === "number" && Number.isFinite(item.sizeBytes) ? item.sizeBytes : undefined,
          }];
        })
      : [];

    if (!files.length) {
      throw new BadRequestException("会议纪要音频分析缺少音频文件。");
    }

    return {
      files,
      folderLabel: normalizeText(body.folderLabel) || "会议资料夹",
      folderShortLabel: normalizeText(body.folderShortLabel) || "会议",
      folderKind: normalizeText(body.folderKind) || "meeting",
      title: normalizeText(body.title) || "会议纪要",
      meetingAt: normalizeText(body.meetingAt) || new Date().toISOString(),
      createdBy: normalizeText(body.createdBy) || "系统",
      textHint: normalizeText(body.textHint),
      previousMeeting: normalizePreviousMeeting(body.previousMeeting),
      dryRun: normalizeBoolean(body.dryRun),
      strictOpenai: normalizeBoolean(body.strictOpenai),
    } satisfies MeetingMinutesAudioAnalysisInput;
  }

  private resolveOpenAiBaseUrl() {
    const value = normalizeText(
      process.env.OPENAI_MEETING_MINUTES_BASE_URL
      ?? process.env.OPENAI_WEEKLY_SUMMARY_BASE_URL
      ?? process.env.OPENAI_BASE_URL
      ?? process.env.OPENAI_API_BASE
      ?? process.env.OPENAI_API_BASE_URL,
    );
    return (value || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
  }

  private resolveOpenAiUrl(path: "responses" | "audio/transcriptions") {
    const baseUrl = this.resolveOpenAiBaseUrl();
    if (path === "responses" && baseUrl.endsWith("/responses")) return baseUrl;
    return `${baseUrl}/${path}`;
  }

  private resolveOpenAiProxyUrl(targetUrl: string) {
    const target = new URL(targetUrl);
    const noProxy = normalizeText(process.env.NO_PROXY ?? process.env.no_proxy)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (noProxy.some((item) => (
      item === "*"
      || item === target.hostname
      || (item.startsWith(".") && target.hostname.endsWith(item))
      || target.hostname.endsWith(`.${item}`)
    ))) {
      return null;
    }

    const proxy = target.protocol === "https:"
      ? process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY ?? process.env.http_proxy ?? process.env.ALL_PROXY ?? process.env.all_proxy
      : process.env.HTTP_PROXY ?? process.env.http_proxy ?? process.env.ALL_PROXY ?? process.env.all_proxy;
    return normalizeText(proxy);
  }

  private getOpenAiFetchOptions(url: string) {
    const proxyUrl = this.resolveOpenAiProxyUrl(url);
    return proxyUrl ? { dispatcher: new ProxyAgent(proxyUrl) } : {};
  }

  private async readAudioFileBytes(file: MeetingMinutesAudioAnalysisFileInput) {
    const base64 = normalizeText(file.base64) || extractDataUrlBase64(normalizeText(file.dataUrl));
    if (base64) {
      return Buffer.from(base64, "base64");
    }

    const fileUrl = normalizeText(file.fileUrl);
    if (!fileUrl) {
      throw new Error(`音频文件 ${file.name || "unnamed"} 缺少可读取内容。`);
    }
    if (fileUrl.startsWith("dev-api://")) {
      throw new Error(`音频文件 ${file.name || "unnamed"} 只有本地占位地址，无法交给服务器转写。`);
    }

    const response = await undiciFetch(fileUrl, this.getOpenAiFetchOptions(fileUrl));
    if (!response.ok) {
      throw new Error(`音频文件 ${file.name || "unnamed"} 读取失败：HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async splitAudioForTranscription(file: MeetingMinutesAudioAnalysisFileInput, bytes: Buffer): Promise<AudioTranscriptionChunk[]> {
    if (bytes.length <= MAX_AUDIO_TRANSCRIPTION_BYTES) {
      return [{
        name: normalizeText(file.name) || "meeting-audio.m4a",
        bytes,
        mimeType: resolveFileMimeType(file),
      }];
    }

    const workDir = await mkdtemp(join(tmpdir(), "meeting-audio-"));
    const inputName = normalizeText(file.name) || "meeting-audio.m4a";
    const extension = parse(inputName).ext || ".m4a";
    const inputPath = join(workDir, `source${extension}`);

    try {
      await writeFile(inputPath, bytes);
      await new Promise<void>((resolve, reject) => {
        const process = spawn("ffmpeg", [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          inputPath,
          "-vn",
          "-ac",
          "1",
          "-ar",
          "16000",
          "-b:a",
          "48k",
          "-f",
          "segment",
          "-segment_time",
          String(AUDIO_CHUNK_SECONDS),
          "-reset_timestamps",
          "1",
          join(workDir, "chunk-%03d.mp3"),
        ]);
        let stderr = "";
        process.stderr.on("data", (chunk) => {
          stderr += chunk.toString();
        });
        process.on("error", reject);
        process.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg 音频分段失败：${stderr.trim() || `exit ${code}`}`));
        });
      });

      const chunkFiles = (await readdir(workDir))
        .filter((name) => /^chunk-\d+\.mp3$/.test(name))
        .sort();
      if (!chunkFiles.length) {
        throw new Error("ffmpeg 音频分段没有生成可转写片段。");
      }

      return await Promise.all(chunkFiles.map(async (chunkName, index) => {
        const chunkPath = join(workDir, chunkName);
        const chunkStat = await stat(chunkPath);
        if (chunkStat.size > MAX_AUDIO_TRANSCRIPTION_BYTES) {
          throw new Error(`音频片段 ${index + 1} 仍超过转写大小限制，请降低码率或缩短分段。`);
        }
        return {
          name: `${parse(inputName).name || "meeting-audio"}-${String(index + 1).padStart(2, "0")}.mp3`,
          bytes: await readFile(chunkPath),
          mimeType: "audio/mpeg",
        };
      }));
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private async transcribeAudioChunk(chunk: AudioTranscriptionChunk, model: string) {
    const audioUrl = this.resolveOpenAiUrl("audio/transcriptions");
    const form = new FormData();
    form.append("file", new File([chunk.bytes], chunk.name, { type: chunk.mimeType }));
    form.append("model", model);
    form.append("response_format", "json");
    form.append("prompt", "公司内部会议录音，可能包含中文、英文、日文或口语化表达。请尽量保留人名、项目名、待办、日期与数字。");

    const response = await undiciFetch(audioUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
      ...this.getOpenAiFetchOptions(audioUrl),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify((payload as Record<string, unknown>).error)
        : `HTTP ${response.status}`;
      throw new Error(`OpenAI 音频转写失败：${message}`);
    }

    const transcript = extractOpenAiOutputText(payload);
    if (!transcript) {
      throw new Error("OpenAI 音频转写未返回文字。");
    }
    return transcript;
  }

  private async transcribeAudioFile(file: MeetingMinutesAudioAnalysisFileInput, model: string) {
    const bytes = await this.readAudioFileBytes(file);
    const chunks = await this.splitAudioForTranscription(file, bytes);
    const transcriptParts: string[] = [];

    for (const [index, chunk] of chunks.entries()) {
      const transcript = await this.transcribeAudioChunk(chunk, model);
      transcriptParts.push(chunks.length > 1 ? `【片段 ${index + 1}/${chunks.length}】\n${transcript}` : transcript);
    }

    return transcriptParts.join("\n\n");
  }

  private buildMeetingSummaryPayload(model: string, input: MeetingMinutesAudioAnalysisInput, transcript: string) {
    return {
      model,
      input: [
        {
          role: "system",
          content: [
            "你是公司内部会议纪要助手。",
            "请把会议音频转写内容翻译并整理为中文会议纪要，方便主管直接复核。",
            "只使用输入中的事实，不编造未出现的人名、数字、承诺、客户或结论。",
            "要特别保留：结论、行动项、负责人、截止时间、问题点、建议，以及与上一场会议的延续关系。",
            "如果转写中包含英文、日文或口语化片段，请翻译成自然中文；专有名词不确定时保留原文并标注待确认。",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            meeting: {
              title: input.title,
              folderLabel: input.folderLabel,
              folderShortLabel: input.folderShortLabel,
              folderKind: input.folderKind,
              meetingAt: input.meetingAt,
              createdBy: input.createdBy,
            },
            previousMeeting: input.previousMeeting ?? null,
            textHint: input.textHint ?? "",
            transcript,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "meeting_minutes_audio_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["translatedTranscript", "summary", "keyPoints", "actionItems", "questions", "suggestions"],
            properties: {
              translatedTranscript: { type: "string" },
              summary: { type: "string" },
              keyPoints: { type: "array", items: { type: "string" } },
              actionItems: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["text", "owner", "dueLabel"],
                  properties: {
                    text: { type: "string" },
                    owner: { type: "string" },
                    dueLabel: { type: "string" },
                  },
                },
              },
              questions: { type: "array", items: { type: "string" } },
              suggestions: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      max_output_tokens: 5000,
    };
  }

  private async summarizeMeetingTranscript(input: MeetingMinutesAudioAnalysisInput, transcript: string, model: string) {
    const responsesUrl = this.resolveOpenAiUrl("responses");
    const response = await undiciFetch(responsesUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.buildMeetingSummaryPayload(model, input, transcript)),
      ...this.getOpenAiFetchOptions(responsesUrl),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify((payload as Record<string, unknown>).error)
        : `HTTP ${response.status}`;
      throw new Error(`OpenAI 会议整理失败：${message}`);
    }

    const output = parseModelOutput(extractOpenAiOutputText(payload));
    if (!output) {
      throw new Error("OpenAI 会议整理未返回可解析 JSON。");
    }
    return output;
  }

  private async generateAudioAnalysis(input: MeetingMinutesAudioAnalysisInput): Promise<MeetingMinutesAudioAnalysisResult> {
    const createdAt = new Date().toISOString();
    const transcriptionModel = normalizeText(process.env.OPENAI_MEETING_TRANSCRIPTION_MODEL) || DEFAULT_TRANSCRIPTION_MODEL;
    const model = normalizeText(process.env.OPENAI_MEETING_SUMMARY_MODEL ?? process.env.OPENAI_WEEKLY_SUMMARY_MODEL) || DEFAULT_SUMMARY_MODEL;
    const apiKey = normalizeText(process.env.OPENAI_API_KEY);
    const envDryRun = process.env.OPENAI_MEETING_MINUTES_DRY_RUN === "1" || process.env.OPENAI_MEETING_MINUTES_DRY_RUN === "true";
    const strictOpenai = input.strictOpenai ?? process.env.OPENAI_MEETING_MINUTES_STRICT === "1";
    const forceDryRun = Boolean(input.dryRun || envDryRun);

    if (forceDryRun || !apiKey) {
      if (!apiKey && strictOpenai) {
        throw new Error("OPENAI_API_KEY 未配置，严格模式已停止会议纪要音频分析。");
      }
      const output = buildFallbackOutput(input, "");
      return buildResult(input, output, {
        generationMode: forceDryRun ? "dry_run" : "fallback",
        transcriptionModel,
        model,
        transcript: output.translatedTranscript,
        warnings: [
          forceDryRun
            ? "OpenAI 会议纪要 dry-run：使用确定性摘要预览，未调用 OpenAI。"
            : "OPENAI_API_KEY 未配置：已保留录音与确定性会议纪要草稿，未调用 OpenAI。",
        ],
        processedFiles: input.files.map((file) => ({
          name: normalizeText(file.name) || "meeting-audio",
          status: "fallback",
        })),
        createdAt,
      });
    }

    const warnings: string[] = [];
    const processedFiles: MeetingMinutesAudioAnalysisResult["processedFiles"] = [];
    const transcriptParts: string[] = [];

    for (const file of input.files) {
      const name = normalizeText(file.name) || "meeting-audio";
      try {
        const transcript = await this.transcribeAudioFile(file, transcriptionModel);
        transcriptParts.push(`【${name}】\n${transcript}`);
        processedFiles.push({ name, status: "transcribed" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (strictOpenai) throw error;
        warnings.push(message);
        processedFiles.push({ name, status: "failed", warning: message });
      }
    }

    const transcript = [
      ...transcriptParts,
      normalizeText(input.textHint) ? `【补充说明】\n${normalizeText(input.textHint)}` : "",
    ].filter(Boolean).join("\n\n");

    if (!transcript.trim()) {
      const output = buildFallbackOutput(input, "");
      return buildResult(input, output, {
        generationMode: "fallback",
        transcriptionModel,
        model,
        transcript: output.translatedTranscript,
        warnings: warnings.length ? warnings : ["OpenAI 音频转写没有返回可用文字，已保留会议纪要草稿。"],
        processedFiles,
        createdAt,
      });
    }

    try {
      const output = await this.summarizeMeetingTranscript(input, transcript, model);
      return buildResult(input, output, {
        generationMode: "live",
        transcriptionModel,
        model,
        transcript,
        warnings,
        processedFiles,
        createdAt,
      });
    } catch (error) {
      if (strictOpenai) throw error;
      const message = error instanceof Error ? error.message : "OpenAI 会议整理失败。";
      const output = buildFallbackOutput(input, transcript);
      return buildResult(input, output, {
        generationMode: "fallback",
        transcriptionModel,
        model,
        transcript,
        warnings: [...warnings, `${message} 已改用确定性会议纪要草稿。`],
        processedFiles,
        createdAt,
      });
    }
  }
}
