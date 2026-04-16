import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";

type AuditLogInput = {
  userId: string;
  action: string;
  module: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  result?: string;
  content?: string;
  beforeSummary?: string;
  afterSummary?: string;
  source?: string;
  ipAddress?: string;
  deviceInfo?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        module: input.module,
        targetType: input.targetType,
        targetId: input.targetId,
        targetName: input.targetName,
        result: input.result ?? "SUCCESS",
        content: input.content,
        beforeSummary: input.beforeSummary,
        afterSummary: input.afterSummary,
        source: input.source ?? "WEB",
        ipAddress: input.ipAddress,
        deviceInfo: input.deviceInfo
      }
    });
  }

  async logWithRequest(request: Request, input: AuditLogInput) {
    const forwardedFor = request.headers["x-forwarded-for"];
    const ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === "string"
        ? forwardedFor.split(",")[0]?.trim()
        : request.ip;

    return this.log({
      ...input,
      ipAddress: input.ipAddress ?? ipAddress ?? undefined,
      deviceInfo: input.deviceInfo ?? request.headers["user-agent"],
      source: input.source ?? "WEB"
    });
  }

  summarizeChanges(
    beforeRecord: Record<string, unknown> | null | undefined,
    afterRecord: Record<string, unknown> | null | undefined,
    fields: string[]
  ) {
    const lines = fields
      .map((field) => {
        const beforeValue = beforeRecord?.[field];
        const afterValue = afterRecord?.[field];

        if (beforeValue === afterValue) {
          return null;
        }

        return `${field}: ${this.stringifyValue(beforeValue)} -> ${this.stringifyValue(afterValue)}`;
      })
      .filter(Boolean);

    return lines.length ? lines.join("；") : undefined;
  }

  private stringifyValue(value: unknown) {
    if (value === null || value === undefined || value === "") {
      return "空";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }
}
