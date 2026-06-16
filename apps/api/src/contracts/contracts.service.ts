import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ContractStatus, PermissionLevel, Prisma } from "@prisma/client";
import { AccessControlService } from "../common/services/access-control.service";
import { RecordPartitionService } from "../common/services/record-partition.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { ContractQueryDto, CreateContractDto, UpdateContractDto } from "./dto/contract.dto";

function normalizeKeyword(value?: string) {
  return value?.trim() ?? "";
}

function normalizeNullableText(value?: string) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function parseOptionalDate(value?: string) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("日期格式不正确");
  }

  return date;
}

function toDecimal(value?: number) {
  if (value === undefined) {
    return undefined;
  }

  return new Prisma.Decimal(value);
}

function formatMoney(value?: Prisma.Decimal | number | string | null) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const amount =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number(value.toString());

  return Number.isNaN(amount) ? null : amount.toFixed(2);
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly recordPartition: RecordPartitionService,
  ) {}

  async list(query: ContractQueryDto, user: AuthenticatedUser) {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const where = await this.buildContractWhere(user, this.buildQueryWhere(query));

    const [items, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        orderBy: [{ expiredAt: "asc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: this.contractInclude(),
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: items.map((item) => this.serializeContract(item)),
    };
  }

  async getById(id: string, user: AuthenticatedUser) {
    return this.serializeContract(await this.ensureContractAccess(id, user));
  }

  async create(dto: CreateContractDto, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.customer.update",
      "当前账号无权维护客户合同",
    );

    const contractName = dto.contractName.trim();
    if (!contractName) {
      throw new BadRequestException("合同名称不能为空");
    }

    const customer = await this.ensureCustomerVisible(dto.customerId, user);
    const partition = await this.recordPartition.getWritableCreateData(user);

    const contract = await this.prisma.contract.create({
      data: {
        customerId: customer.id,
        contractName,
        contractNo: normalizeNullableText(dto.contractNo) ?? null,
        contractType: normalizeNullableText(dto.contractType) ?? null,
        signedAt: parseOptionalDate(dto.signedAt),
        effectiveAt: parseOptionalDate(dto.effectiveAt),
        expiredAt: parseOptionalDate(dto.expiredAt),
        amount: toDecimal(dto.amount),
        status: dto.status ?? ContractStatus.DRAFT,
        permissionLevel: dto.permissionLevel ?? PermissionLevel.ALL_VISIBLE,
        fileUrl: normalizeNullableText(dto.fileUrl) ?? null,
        remark: normalizeNullableText(dto.remark) ?? null,
        creatorUserId: user.id,
        dataScope: partition.dataScope,
        partitionKey: partition.partitionKey,
        testBatchId: partition.testBatchId,
      },
      include: this.contractInclude(),
    });

    return this.serializeContract(contract);
  }

  async update(id: string, dto: UpdateContractDto, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.customer.update",
      "当前账号无权维护客户合同",
    );

    const existing = await this.ensureContractAccess(id, user);
    this.recordPartition.assertSamePartition(user, existing, "合同");
    await this.recordPartition.getWritableCreateData(user);

    const nextCustomerId = dto.customerId
      ? (await this.ensureCustomerVisible(dto.customerId, user)).id
      : undefined;
    const nextContractName =
      dto.contractName === undefined ? undefined : dto.contractName.trim();

    if (nextContractName === "") {
      throw new BadRequestException("合同名称不能为空");
    }

    const contract = await this.prisma.contract.update({
      where: { id },
      data: {
        customerId: nextCustomerId,
        contractName: nextContractName,
        contractNo: normalizeNullableText(dto.contractNo),
        contractType: normalizeNullableText(dto.contractType),
        signedAt: parseOptionalDate(dto.signedAt),
        effectiveAt: parseOptionalDate(dto.effectiveAt),
        expiredAt: parseOptionalDate(dto.expiredAt),
        amount: toDecimal(dto.amount),
        status: dto.status,
        permissionLevel: dto.permissionLevel,
        fileUrl: normalizeNullableText(dto.fileUrl),
        remark: normalizeNullableText(dto.remark),
      },
      include: this.contractInclude(),
    });

    return this.serializeContract(contract);
  }

  private contractInclude() {
    return {
      customer: {
        select: {
          id: true,
          customerName: true,
          companyName: true,
          ownerUserId: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    } satisfies Prisma.ContractInclude;
  }

  private buildQueryWhere(query: ContractQueryDto): Prisma.ContractWhereInput {
    const keyword = normalizeKeyword(query.keyword);
    const andFilters: Prisma.ContractWhereInput[] = [];

    if (query.customerId) {
      andFilters.push({ customerId: query.customerId });
    }

    if (query.status) {
      andFilters.push({ status: query.status });
    }

    if (query.permissionLevel) {
      andFilters.push({ permissionLevel: query.permissionLevel });
    }

    if (query.expiredFrom || query.expiredTo) {
      andFilters.push({
        expiredAt: {
          ...(query.expiredFrom ? { gte: parseOptionalDate(query.expiredFrom) ?? undefined } : {}),
          ...(query.expiredTo ? { lte: parseOptionalDate(query.expiredTo) ?? undefined } : {}),
        },
      });
    }

    if (keyword) {
      andFilters.push({
        OR: [
          { contractName: { contains: keyword } },
          { contractNo: { contains: keyword } },
          { contractType: { contains: keyword } },
          { customer: { customerName: { contains: keyword } } },
          { customer: { companyName: { contains: keyword } } },
        ],
      });
    }

    return andFilters.length ? { AND: andFilters } : {};
  }

  private async buildContractWhere(
    user: AuthenticatedUser,
    baseWhere: Prisma.ContractWhereInput,
  ) {
    const customerWhere = await this.accessControl.buildCustomerWhere(user);
    const filters: Prisma.ContractWhereInput[] = [
      this.recordPartition.buildWhere(user) as Prisma.ContractWhereInput,
      { customer: customerWhere },
      this.buildPermissionWhere(user),
    ].filter((item) => Object.keys(item).length > 0);

    if (Object.keys(baseWhere).length > 0) {
      filters.push(baseWhere);
    }

    return filters.length ? { AND: filters } : {};
  }

  private buildPermissionWhere(user: AuthenticatedUser): Prisma.ContractWhereInput {
    if (["SUPER_ADMIN", "ADMIN"].includes(user.roleCode)) {
      return {};
    }

    const visiblePermissions: Prisma.ContractWhereInput[] = [
      { permissionLevel: PermissionLevel.ALL_VISIBLE },
      {
        AND: [
          { permissionLevel: PermissionLevel.OWNER_ONLY },
          {
            OR: [
              { creatorUserId: user.id },
              { customer: { ownerUserId: user.id } },
            ],
          },
        ],
      },
    ];

    if (["SALES_MANAGER", "FINANCE"].includes(user.roleCode)) {
      visiblePermissions.push({ permissionLevel: PermissionLevel.ADMIN_MANAGER });
    }

    return { OR: visiblePermissions };
  }

  private async ensureCustomerVisible(customerId: string, user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findFirst({
      where: await this.accessControl.buildCustomerWhere(user, { id: customerId }),
      select: { id: true },
    });

    if (!customer) {
      throw new BadRequestException("客户不存在或当前账号无权引用");
    }

    return customer;
  }

  private async ensureContractAccess(id: string, user: AuthenticatedUser) {
    const contract = await this.prisma.contract.findFirst({
      where: await this.buildContractWhere(user, { id }),
      include: this.contractInclude(),
    });

    if (!contract) {
      throw new NotFoundException("合同不存在或无权访问");
    }

    return contract;
  }

  private serializeContract(contract: any) {
    return {
      id: contract.id,
      customerId: contract.customerId,
      contractName: contract.contractName,
      contractNo: contract.contractNo,
      contractType: contract.contractType,
      signedAt: contract.signedAt,
      effectiveAt: contract.effectiveAt,
      expiredAt: contract.expiredAt,
      amount: formatMoney(contract.amount),
      status: contract.status,
      permissionLevel: contract.permissionLevel,
      fileUrl: contract.fileUrl,
      remark: contract.remark,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      customer: contract.customer
        ? {
            id: contract.customer.id,
            name: contract.customer.customerName,
            companyName: contract.customer.companyName,
          }
        : null,
      creator: contract.creator
        ? {
            id: contract.creator.id,
            displayName: contract.creator.name,
            roleName: contract.creator.role?.name ?? "",
          }
        : null,
    };
  }
}
