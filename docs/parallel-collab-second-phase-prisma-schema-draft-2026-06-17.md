# 大爱归心 C 线 EmployeeLaunchEvidenceArchive Prisma schema 设计草案

日期：2026-06-17
工作流：C，第二批 TEST / 审计证据归档 Prisma schema draft
状态：`draft_only_waiting_review`

## 安全边界

本轮只做文档草案：

- 不写生产数据库。
- 不生成生产 SQL。
- 不生成 migration。
- 不修改 `prisma/schema.prisma`。
- 不修改 API、前端或回填脚本。
- 不部署、不重启服务。

## 输入依据

- `docs/parallel-collab-second-phase-archive-schema-draft-2026-06-16.md`
- `docs/parallel-collab-second-phase-archive-plan-2026-06-16.md`
- `docs/parallel-collab-second-phase-dryrun-v2-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-second-phase-archive-schema-draft.json`

已确认上一轮结论：

- 第一阶段推荐通用归档表：`EmployeeLaunchEvidenceArchive`。
- dry-run v3 `would-create` 总数：81。
- 不创建正式报销、正式 `FileRecord`、正式 `Notification`、正式 `AuditLog`。

## 设计原则

1. 这批数据只作为 TEST / 审计证据，不进入 `REAL` 分区。
2. 归档表保存来源指纹、幂等键、legacy ID、`payloadJson` 和阻塞原因。
3. 不为了复用现有业务表而伪造 `User.id`、附件 URL 或业务外键。
4. `FileRecord`、`AuditLog`、`Notification` 只作为后续晋级目标，不作为本轮直接落点。
5. `TestBatch` 可做 TEST 分组，但不能替代证据归档表。

## Prisma schema 草案

以下仅为草案代码块，不应直接复制到生产 schema 执行迁移。

```prisma
enum EmployeeLaunchEvidenceType {
  EXPENSE_CLAIM_TEST_AUDIT
  OCR_TEST_LINKED_TO_PHASE2_CLAIM
  OCR_HISTORICAL_ARCHIVE_ONLY
  LEGACY_ATTACHMENT_TEST_AUDIT
  LEGACY_ATTACHMENT_UNREACHABLE_TEST_AUDIT
  MEETING_ATTACHMENT_ARCHIVE_CANDIDATE
  PLATFORM_WEEKLY_MESSAGE_DEFERRED
  PLATFORM_AUDIT_ITEM_ARCHIVE_PENDING_USER_MAPPING
}

enum EmployeeLaunchEvidenceMigrationStatus {
  DRY_RUN
  READY_FOR_ARCHIVE
  ARCHIVED
  BLOCKED
  NEEDS_REVIEW
  SKIPPED
  CONFLICT
}

model EmployeeLaunchEvidenceArchive {
  id              String                                  @id @default(cuid())
  evidenceType    EmployeeLaunchEvidenceType
  migrationStatus EmployeeLaunchEvidenceMigrationStatus   @default(DRY_RUN)
  disposition     String                                  @db.VarChar(80)

  sourceModule    String                                  @db.VarChar(32)
  sourceFileName  String                                  @db.VarChar(255)
  sourceSha16     String                                  @db.VarChar(32)
  sourceSizeBytes Int?
  sourceRecordId  String                                  @db.VarChar(191)

  legacyClaimId      String?                              @db.VarChar(128)
  legacyTaskId       String?                              @db.VarChar(128)
  legacyAttachmentId String?                              @db.VarChar(128)
  legacyMessageId    String?                              @db.VarChar(128)
  legacyAuditId      String?                              @db.VarChar(128)

  storageProvider String?                                 @db.VarChar(64)
  storageKey      String?                                 @db.VarChar(500)
  fileUrl         String?                                 @db.VarChar(500)
  previewUrl      String?                                 @db.VarChar(500)

  actorText    String?                                    @db.VarChar(128)
  mappedUserId String?                                    @db.VarChar(191)
  title        String?                                    @db.VarChar(255)
  statusText   String?                                    @db.VarChar(64)
  amount       Decimal?                                   @db.Decimal(12, 2)
  occurredAt   DateTime?

  dataScope    RecordDataScope                            @default(TEST)
  partitionKey String                                     @default("TEST") @db.VarChar(64)
  archiveScope String                                     @default("TEST_AUDIT") @db.VarChar(64)
  testBatchId  String?                                    @db.VarChar(191)

  idempotencyKey     String                               @unique @db.VarChar(255)
  payloadJson        Json
  evidenceMetaJson   Json?
  blockedReasonsJson Json?
  migrationNote      String?                              @db.Text

  createdAt DateTime                                     @default(now())
  updatedAt DateTime                                     @updatedAt

  @@index([evidenceType, migrationStatus])
  @@index([sourceFileName, sourceSha16])
  @@index([sourceModule, sourceRecordId])
  @@index([legacyClaimId])
  @@index([legacyTaskId])
  @@index([legacyAttachmentId])
  @@index([legacyMessageId])
  @@index([legacyAuditId])
  @@index([mappedUserId])
  @@index([partitionKey])
  @@index([archiveScope])
  @@index([testBatchId])
  @@index([createdAt])
}
```

### 字段说明

| 字段 | 说明 |
| --- | --- |
| `evidenceType` | 证据类型，直接对应 dry-run v3 的 8 类 evidence。 |
| `migrationStatus` | 归档生命周期状态。dry-run 产物保持 `DRY_RUN`；后续真正归档时才可能进入 `READY_FOR_ARCHIVE`、`ARCHIVED`、`BLOCKED`。 |
| `disposition` | 业务处置，如 `TEST_AUDIT_ONLY`、`ARCHIVE_ONLY`、`DEFERRED`。 |
| `sourceModule` | `finance`、`ocr` 或 `platform`。 |
| `sourceFileName` | 来源 JSON 文件名。 |
| `sourceSha16` | 来源 JSON 指纹，保证审计可追溯。 |
| `sourceRecordId` | 当前 evidence 的主 legacy ID，用于跨类型统一查询。 |
| `legacyClaimId` | 报销单 ID 或 OCR/附件关联的 claim ID。 |
| `legacyTaskId` | OCR task ID。 |
| `legacyAttachmentId` | platform attachment ID。 |
| `legacyMessageId` | platform message ID。 |
| `legacyAuditId` | platform audit item ID。 |
| `storageProvider` / `storageKey` | 附件来源和长期对象 key。签名 URL 不能作为唯一证据。 |
| `actorText` | auditItems 原始 actor 文本，避免在映射未完成时伪造 `User.id`。 |
| `mappedUserId` | 后续完成用户映射后再填，草案阶段不设置外键。 |
| `dataScope` / `partitionKey` | 固定进入 TEST 分区，不使用 `REAL`。 |
| `archiveScope` | 弥补 `RecordDataScope` 只有 `REAL/TEST` 的限制，用于区分 `TEST_AUDIT`、`ARCHIVE_ONLY`、`DEFERRED`。 |
| `idempotencyKey` | 唯一幂等键，防止重复归档。 |
| `payloadJson` | 完整原始来源对象，用于审计复原。 |
| `evidenceMetaJson` | 归档摘要、关联 ID、统计字段等可选派生信息。 |
| `blockedReasonsJson` | 当前阻塞原因数组。 |

## 幂等键规则

| evidenceType | 数量 | 幂等键 |
| --- | ---: | --- |
| `EXPENSE_CLAIM_TEST_AUDIT` | 4 | `finance.json:{legacyClaimId}:TEST_AUDIT_ONLY` |
| `OCR_TEST_LINKED_TO_PHASE2_CLAIM` | 8 | `ocr-tasks.json:{legacyTaskId}:TEST_AUDIT_ONLY` |
| `OCR_HISTORICAL_ARCHIVE_ONLY` | 20 | `ocr-tasks.json:{legacyTaskId}:ARCHIVE_ONLY` |
| `LEGACY_ATTACHMENT_TEST_AUDIT` | 2 | `platform.json:{legacyAttachmentId}:TEST_AUDIT_ONLY` |
| `LEGACY_ATTACHMENT_UNREACHABLE_TEST_AUDIT` | 6 | `platform.json:{legacyAttachmentId}:TEST_AUDIT_ONLY` |
| `MEETING_ATTACHMENT_ARCHIVE_CANDIDATE` | 4 | `platform.json:{legacyAttachmentId}:MEETING_ARCHIVE` |
| `PLATFORM_WEEKLY_MESSAGE_DEFERRED` | 13 | `platform.json:{legacyMessageId}:MESSAGE_ARCHIVE_ONLY` |
| `PLATFORM_AUDIT_ITEM_ARCHIVE_PENDING_USER_MAPPING` | 24 | `platform.json:{legacyAuditId}:AUDIT_ITEM_ARCHIVE_ONLY` |

合计：81 条 would-create evidence。

## 来源指纹

| sourceFileName | sourceModule | sourceSha16 | sourceSizeBytes |
| --- | --- | --- | ---: |
| `finance.json` | `finance` | `ca3fc6f74b4720b9` | 8165 |
| `ocr-tasks.json` | `ocr` | `f5778a33f59cbd49` | 38516 |
| `platform.json` | `platform` | `9aaf13d5b6a98cb2` | 53387 |

## 81 条 dry-run evidence 映射

| 类别 | would create | evidenceType | migrationStatus 建议 | archiveScope | 说明 |
| --- | ---: | --- | --- | --- | --- |
| Phase2 报销单 | 4 | `EXPENSE_CLAIM_TEST_AUDIT` | `READY_FOR_ARCHIVE` | `TEST_AUDIT` | 只保留 TEST / 审计证据，不进入正式报销。 |
| 关联 OCR | 8 | `OCR_TEST_LINKED_TO_PHASE2_CLAIM` | `READY_FOR_ARCHIVE` | `TEST_AUDIT` | 随 4 条 Phase2 报销单闭环归档。 |
| 历史 OCR | 20 | `OCR_HISTORICAL_ARCHIVE_ONLY` | `NEEDS_REVIEW` | `ARCHIVE_ONLY` | 历史 claim 归属未确认，不绑定当前 Phase2。 |
| COS 报销附件 | 2 | `LEGACY_ATTACHMENT_TEST_AUDIT` | `NEEDS_REVIEW` | `TEST_AUDIT` | 可保留 metadata，但不能直接晋级 `FileRecord`。 |
| local 报销附件 | 6 | `LEGACY_ATTACHMENT_UNREACHABLE_TEST_AUDIT` | `BLOCKED` | `TEST_AUDIT` | 文件不可达，只能先保留 metadata/payload。 |
| 会议附件 | 4 | `MEETING_ATTACHMENT_ARCHIVE_CANDIDATE` | `NEEDS_REVIEW` | `ARCHIVE_ONLY` | 与报销无关，等待 FileRecord 元数据和上传人映射。 |
| platform 周报消息 | 13 | `PLATFORM_WEEKLY_MESSAGE_DEFERRED` | `BLOCKED` | `DEFERRED` | 等待 `Notification.userId` 映射和周报链路去重。 |
| auditItems | 24 | `PLATFORM_AUDIT_ITEM_ARCHIVE_PENDING_USER_MAPPING` | `BLOCKED` | `ARCHIVE_ONLY` | 等待 `AuditLog.userId` 映射。 |

dry-run 阶段不实际写入以上状态。若未来只跑 dry-run 入库预演，`migrationStatus` 可统一保留 `DRY_RUN`；若进入正式审计归档，再按上表设置目标状态。

## 与现有表的关系

### FileRecord

本轮不建议复用 `FileRecord`：

- `FileRecord.fileUrl` 必填，但 6 条 local / enterprise-cloud 报销附件没有可用 URL。
- `FileRecord.uploaderUserId` 必填，但 legacy 上传人/owner 仍未映射到 `User.id`。
- 现有 `FileRecord` 缺 `storageKey`、`sourceFile`、`legacyAttachmentId`，长期追溯和幂等不足。

建议路径：

1. 先用 `EmployeeLaunchEvidenceArchive` 保存附件 evidence。
2. 后续若要进入 `FileRecord`，先补 metadata 能力或建立单独附件归档表。
3. 只有完成文件可达性和上传人映射后，才做 `FileRecord` 晋级 dry-run。

### AuditLog

本轮不建议复用 `AuditLog`：

- `AuditLog.userId` 必填。
- platform `auditItems.actor` 只是 legacy 文本。
- 不应为了进入 `AuditLog` 伪造 `User.id`。

建议先将 `actorText` 保存到 `EmployeeLaunchEvidenceArchive.actorText`，后续再补 `mappedUserId`。

### Notification

本轮不建议复用 `Notification`：

- `Notification.userId` 必填。
- 13 条消息都是周报相关消息。
- A 线 DB-first 后，周报链路已存在 `WeeklyReportPayload` / `WeeklyReport` / 通知桥风险，直接导入可能重复。

建议先归档为 `PLATFORM_WEEKLY_MESSAGE_DEFERRED`，完成收件人映射和周报消息去重后再决定是否晋级。

### TestBatch

`TestBatch` 可作为 TEST 证据分组，但不承载 `payloadJson`、来源指纹、legacy ID、幂等键和 blockedReasons。因此它只能作为可选 `testBatchId`，不能替代归档表。

## blocked 点

1. local 附件不可达
   6 条 local / enterprise-cloud 报销附件缺少 `fileUrl` / `previewUrl`，v2 精确 blob-key 搜索未在 `/opt/huigui-crm/storage` 找到文件。

2. `FileRecord` 元数据不足
   现有模型缺 `storageKey`、`sourceFile`、`legacyAttachmentId`，无法完整保存 legacy 附件证据链和幂等来源。

3. `uploaderUserId` 映射不完整
   附件上传人只有 legacy 文本，不能直接满足 `FileRecord.uploaderUserId`。

4. `AuditLog.userId` 映射不完整
   auditItems 的 actor 文本尚未映射到 `User.id`。

5. `Notification.userId` 映射不完整
   13 条周报消息缺少明确接收人 `User.id`。

6. 周报消息去重未完成
   13 条消息需要先与 `WeeklyReportPayload`、`WeeklyReport` 和现有通知链路去重。

## 非本轮内容

本草案不包含：

- Prisma schema 实际修改。
- migration 文件。
- SQL 文件。
- 回填脚本。
- 生产库写入。
- API 或前端读取归档表的实现。

## 停止点

C 线 Prisma schema 设计草案已完成到文档层。下一步如果继续，需要用户单独确认是否把该草案转为 `prisma/schema.prisma` 的正式变更设计；确认前继续保持不落库、不生成 migration、不生成生产 SQL。
