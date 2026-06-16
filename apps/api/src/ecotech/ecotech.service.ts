import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";

const ECOTECH_DEPARTMENT = "洄归生态科技";
const ECOTECH_DEPARTMENT_ALIASES = ["洄归生态科技", "洄歸生態科技"];

type EcotechCollection =
  | "customers"
  | "quotations"
  | "products"
  | "orders"
  | "financeAccounts"
  | "channelPartners"
  | "contracts"
  | "inspections";

type PrismaModelDelegate = {
  findMany(args?: unknown): Promise<Array<{ recordJson: Prisma.JsonValue }>>;
  findFirst(args: unknown): Promise<{ id: string; recordJson: Prisma.JsonValue } | null>;
  upsert(args: unknown): Promise<{ recordJson: Prisma.JsonValue }>;
  deleteMany(args: unknown): Promise<unknown>;
};

type CollectionConfig = {
  departmentScoped: boolean;
  delegate: () => PrismaModelDelegate;
  extract: (record: Record<string, unknown>) => Record<string, unknown>;
};

type EcotechAccessIdentity = "office_admin" | "ecotech_manager" | "ecommerce_manager" | "";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asDate(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function jsonRecord(record: Record<string, unknown>) {
  return record as Prisma.InputJsonObject;
}

function resolveIdentity(user: AuthenticatedUser): EcotechAccessIdentity {
  const text = [
    user.roleCode,
    user.roleName,
    user.department ?? "",
    user.title ?? "",
    user.name,
    user.wecomName ?? "",
    user.loginAccount ?? "",
    user.permissions.join(" "),
  ].join(" ").toLowerCase();

  if (
    user.roleCode === "SUPER_ADMIN" ||
    user.roleCode === "ADMIN" ||
    /office|办公室|辦公室|综合|綜合|founder|创办|創辦|管理/.test(text)
  ) {
    return "office_admin";
  }

  if (/洄归|洄歸|ecotech|譚喜|谭喜|tanxi|book chen|bookchen/.test(text)) {
    return "ecotech_manager";
  }

  if (
    user.roleCode === "PRODUCT_SPECIALIST" ||
    /ecommerce|电商|電商|产品|產品|product|郭美辰/.test(text)
  ) {
    return "ecommerce_manager";
  }

  return "";
}

function canUseEcotechWorkspace(user: AuthenticatedUser) {
  const identity = resolveIdentity(user);
  return identity === "office_admin" || identity === "ecotech_manager";
}

function canUseEcotechProducts(user: AuthenticatedUser) {
  const identity = resolveIdentity(user);
  return identity === "office_admin" || identity === "ecotech_manager" || identity === "ecommerce_manager";
}

function compareRecordUpdatedAt(left: Record<string, unknown>, right: Record<string, unknown>) {
  const leftDate = Date.parse(asString(left.updatedAt) ?? asString(left.createdAt) ?? "");
  const rightDate = Date.parse(asString(right.updatedAt) ?? asString(right.createdAt) ?? "");
  return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
}

@Injectable()
export class EcotechService {
  constructor(private readonly prisma: PrismaService) {}

  async workspace(user: AuthenticatedUser) {
    this.assertWorkspaceAccess(user);
    const [
      customers,
      quotations,
      products,
      orders,
      financeAccounts,
      channelPartners,
      contracts,
      inspections,
    ] = await Promise.all([
      this.listCollection("customers", user),
      this.listCollection("quotations", user),
      this.listCollection("products", user),
      this.listCollection("orders", user),
      this.listCollection("financeAccounts", user),
      this.listCollection("channelPartners", user),
      this.listCollection("contracts", user),
      this.listCollection("inspections", user),
    ]);

    return {
      customers,
      quotations,
      products,
      orders,
      financeAccounts,
      channelPartners,
      contracts,
      inspections,
      meta: {
        source: "api",
        syncMode: "workspace",
        department: ECOTECH_DEPARTMENT,
        loadedAt: new Date().toISOString(),
      },
    };
  }

  async list(collection: EcotechCollection, user: AuthenticatedUser) {
    this.assertCollectionAccess(collection, user);
    return this.listCollection(collection, user);
  }

  async create(collection: EcotechCollection, input: unknown, user: AuthenticatedUser) {
    this.assertCollectionAccess(collection, user);
    const record = this.normalizeInputRecord(input);
    return this.upsertRecord(collection, record);
  }

  async update(collection: EcotechCollection, id: string, input: unknown, user: AuthenticatedUser) {
    this.assertCollectionAccess(collection, user);
    const existing = await this.getRecord(collection, id);
    const record = {
      ...existing,
      ...this.normalizeInputRecord(input),
      id,
    };
    return this.upsertRecord(collection, record);
  }

  async bulkProducts(input: unknown, user: AuthenticatedUser) {
    this.assertCollectionAccess("products", user);
    const records = Array.isArray(input) ? input : [];
    if (!records.length) return this.productMutationPayload(user);

    for (const item of records) {
      await this.upsertRecord("products", this.normalizeInputRecord(item));
    }

    return this.productMutationPayload(user);
  }

  async reviewQuotation(
    id: string,
    decision: "approved" | "rejected",
    reviewer: string,
    note: string | undefined,
    user: AuthenticatedUser,
  ) {
    this.assertWorkspaceAccess(user);
    const existing = await this.getRecord("quotations", id);
    const record = {
      ...existing,
      id,
      status: decision,
      approval: {
        ...(isPlainObject(existing.approval) ? existing.approval : {}),
        reviewer,
        note,
        decidedAt: new Date().toISOString(),
      },
    };
    return this.upsertRecord("quotations", record);
  }

  async remove(collection: EcotechCollection, id: string, user: AuthenticatedUser) {
    this.assertCollectionAccess(collection, user);
    const config = this.getConfig(collection);
    const where = config.departmentScoped ? { id, department: ECOTECH_DEPARTMENT } : { id };
    const result = await config.delegate().deleteMany({ where });
    if (!isPlainObject(result) || typeof result.count !== "number" || result.count < 1) {
      throw new NotFoundException("未找到洄归生态科技记录");
    }
    if (collection === "products") {
      return this.productMutationPayload(user);
    }

    return this.workspace(user);
  }

  async reset(user: AuthenticatedUser) {
    this.assertWorkspaceAccess(user);
    await Promise.all(
      ([
        "customers",
        "quotations",
        "orders",
        "channelPartners",
        "contracts",
        "inspections",
      ] as EcotechCollection[]).map((collection) => {
        const config = this.getConfig(collection);
        return config.delegate().deleteMany({ where: { department: ECOTECH_DEPARTMENT } });
      }),
    );
    return this.workspace(user);
  }

  private normalizeInputRecord(input: unknown) {
    const record = isPlainObject(input) && isPlainObject(input.record) ? input.record : input;
    if (!isPlainObject(record)) {
      throw new NotFoundException("洄归生态科技记录 payload 不完整");
    }

    return record;
  }

  private async listCollection(collection: EcotechCollection, user: AuthenticatedUser) {
    this.assertCollectionAccess(collection, user);
    const config = this.getConfig(collection);
    const rows = await config.delegate().findMany({
      where: config.departmentScoped ? { department: ECOTECH_DEPARTMENT } : undefined,
      orderBy: { updatedAt: "desc" },
    });
    const records = rows.reduce<Array<Record<string, unknown>>>((items, row) => {
      const record: unknown = row.recordJson;
      if (isPlainObject(record)) {
        items.push(record);
      }
      return items;
    }, []);

    return records
      .sort(compareRecordUpdatedAt);
  }

  private async getRecord(collection: EcotechCollection, id: string) {
    const config = this.getConfig(collection);
    const record = await config.delegate().findFirst({
      where: config.departmentScoped ? { id, department: ECOTECH_DEPARTMENT } : { id },
    });
    if (!record || !isPlainObject(record.recordJson)) {
      throw new NotFoundException("未找到洄归生态科技记录");
    }
    return record.recordJson;
  }

  private async upsertRecord(collection: EcotechCollection, record: Record<string, unknown>) {
    const id = asString(record.id);
    if (!id) {
      throw new NotFoundException("洄归生态科技记录缺少 id");
    }

    const config = this.getConfig(collection);
    const extracted = config.extract(record);
    const data = {
      ...extracted,
      department: ECOTECH_DEPARTMENT,
      recordJson: jsonRecord({
        ...record,
        updatedAt: asString(record.updatedAt) ?? new Date().toISOString(),
      }),
    };
    const row = await config.delegate().upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
    return row.recordJson;
  }

  private async productMutationPayload(user: AuthenticatedUser) {
    if (canUseEcotechWorkspace(user)) {
      return this.workspace(user);
    }

    return {
      products: await this.listCollection("products", user),
      meta: {
        source: "api",
        syncMode: "products",
        department: ECOTECH_DEPARTMENT,
        loadedAt: new Date().toISOString(),
      },
    };
  }

  private assertWorkspaceAccess(user: AuthenticatedUser) {
    if (!canUseEcotechWorkspace(user)) {
      throw new ForbiddenException("无权访问洄归生态科技 CRM");
    }
  }

  private assertCollectionAccess(collection: EcotechCollection, user: AuthenticatedUser) {
    if (collection === "products") {
      if (!canUseEcotechProducts(user)) {
        throw new ForbiddenException("无权访问洄归产品库");
      }
      return;
    }

    this.assertWorkspaceAccess(user);
  }

  private getConfig(collection: EcotechCollection): CollectionConfig {
    const configs: Record<EcotechCollection, CollectionConfig> = {
      customers: {
        departmentScoped: true,
        delegate: () => this.prisma.ecotechCustomerRecord as unknown as PrismaModelDelegate,
        extract: (record) => ({
          customerName: asString(record.name) ?? asString(record.customerName),
          ownerName: asString(record.owner),
          status: asString(record.status),
          industry: asString(record.industry),
          nextFollowupAt: asDate(record.nextFollowupAt),
        }),
      },
      quotations: {
        departmentScoped: true,
        delegate: () => this.prisma.ecotechQuotationRecord as unknown as PrismaModelDelegate,
        extract: (record) => ({
          code: asString(record.code),
          title: asString(record.title),
          customerName: asString(record.customerName),
          status: asString(record.status),
          industry: asString(record.industry),
          source: asString(record.source),
          totalAmount: asNumber(record.totalAmount),
        }),
      },
      products: {
        departmentScoped: true,
        delegate: () => this.prisma.ecotechProductRecord as unknown as PrismaModelDelegate,
        extract: (record) => ({
          sku: asString(record.sku),
          name: asString(record.name),
          brand: asString(record.brand),
          category: asString(record.category),
          status: asString(record.status),
        }),
      },
      orders: {
        departmentScoped: true,
        delegate: () => this.prisma.ecotechOrderRecord as unknown as PrismaModelDelegate,
        extract: (record) => ({
          code: asString(record.code),
          customerName: asString(record.customerName),
          status: asString(record.status),
          totalAmount: asNumber(record.totalAmount),
          financeAccount: asString(record.financeAccountId),
        }),
      },
      financeAccounts: {
        departmentScoped: true,
        delegate: () => this.prisma.ecotechFinanceAccountRecord as unknown as PrismaModelDelegate,
        extract: (record) => ({
          entity: asString(record.entity),
          accountName: asString(record.accountName),
          bank: asString(record.bank),
          active: asBoolean(record.active, true),
        }),
      },
      channelPartners: {
        departmentScoped: true,
        delegate: () => this.prisma.ecotechChannelPartnerRecord as unknown as PrismaModelDelegate,
        extract: (record) => ({
          name: asString(record.name),
          contact: asString(record.contact),
          phone: asString(record.phone),
          active: asBoolean(record.active, true),
        }),
      },
      contracts: {
        departmentScoped: true,
        delegate: () => this.prisma.ecotechContractRecord as unknown as PrismaModelDelegate,
        extract: (record) => ({
          code: asString(record.code),
          title: asString(record.title),
          customerName: asString(record.customerName),
          status: asString(record.status),
          endAt: asDate(record.endAt),
        }),
      },
      inspections: {
        departmentScoped: true,
        delegate: () => this.prisma.ecotechInspectionRecord as unknown as PrismaModelDelegate,
        extract: (record) => ({
          code: asString(record.code),
          customerName: asString(record.customerName),
          currentStage: asString(record.currentStage),
          paymentStatus: asString(record.paymentStatus),
          expectedReportAt: asDate(record.expectedReportAt),
        }),
      },
    };

    return configs[collection];
  }
}

export { ECOTECH_DEPARTMENT, ECOTECH_DEPARTMENT_ALIASES, resolveIdentity as resolveEcotechIdentity };
