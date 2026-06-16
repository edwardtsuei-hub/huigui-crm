# 大爱归心第二批 TEST / 审计归档 schema 草案 + dry-run v3

日期：2026-06-16
工作流：C，第二批 TEST / 审计证据归档 schema draft + dry-run v3
状态：`ready_for_review`

## 安全边界

本轮只输出 schema 草案和 dry-run v3 方案：

- 不写生产数据库。
- 不生成生产执行 SQL。
- 不生成 COMMIT SQL。
- 不改 Prisma schema 文件。
- 不改 API、前端或回填脚本。
- 不部署、不重启服务。

## 已读取资料

- `docs/parallel-collab-second-phase-archive-plan-2026-06-16.md`
- `docs/parallel-collab-second-phase-dryrun-v2-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-second-phase-dryrun-v2.json`
- `storage/uploads/employee-launch-contract/platform.json`，仅用于补齐 13 条消息和 24 条 auditItems 的 would-create 幂等键。

## 设计结论

建议第一阶段只设计一个通用归档表：`EmployeeLaunchEvidenceArchive`。

不建议第一步就拆成 `ExpenseClaimAuditArchive` / `OcrEvidenceArchive` / `LegacyAttachmentArchive`。原因是这批数据已经确认只作为 TEST / 审计证据，不进入正式报销、正式 OCR、正式附件或正式通知链路。通用表可以先完整保留来源指纹、legacy ID、幂等键、rawPayload 和 blockedReasons，避免为了进入现有业务表而伪造外键或丢失证据链。

拆表可以作为后续选项：

| 结构 | 本轮建议 | 触发条件 |
| --- | --- | --- |
| `EmployeeLaunchEvidenceArchive` | 推荐 | 第一阶段 DB-backed 审计归档统一落点 |
| `ExpenseClaimAuditArchive` | 暂不拆 | 只有财务审核 UI 需要大量 typed finance 查询时再拆 |
| `OcrEvidenceArchive` | 暂不拆 | 只有 OCR 校验/纠错分析需要 typed OCR 查询时再拆 |
| `LegacyAttachmentArchive` | 暂不拆 | 只有附件可达性生命周期需要独立台账时再拆 |
| `LegacyAuditItemArchive` | 暂不拆 | 通用表无法满足 legacy audit 筛选时再拆 |

## EmployeeLaunchEvidenceArchive 草案字段

| 字段 | 类型草案 | 用途 |
| --- | --- | --- |
| `id` | String | 主键 |
| `evidenceType` | String | 证据类型，如 `EXPENSE_CLAIM_TEST_AUDIT`、`OCR_TEST_LINKED_TO_PHASE2_CLAIM` |
| `dataScope` | RecordDataScope/String | `TEST` 或 `ARCHIVE_ONLY`；Phase2 报销绝不使用 `REAL` |
| `sourceModule` | String | `finance` / `ocr` / `platform` |
| `sourceFile` | String | `finance.json` / `ocr-tasks.json` / `platform.json` |
| `sourceSha16` | String | 来源文件指纹 |
| `legacyId` | String | legacy 主 ID |
| `legacyClaimId` | String? | 报销单或 OCR 关联 claim |
| `legacyTaskId` | String? | OCR task ID |
| `legacyAttachmentId` | String? | platform attachment ID |
| `legacyMessageId` | String? | platform message ID |
| `legacyAuditId` | String? | platform audit item ID |
| `storageProvider` | String? | `cos` / `local` / `enterprise-cloud` |
| `storageKey` | String? | 长期对象 key，不能只依赖签名 URL |
| `fileUrl` | String? | 当前 URL，可选，不作为唯一证据键 |
| `actorText` | String? | auditItems 原始 actor 文本 |
| `mappedUserId` | String? | 后续映射到 User 后再填，可空 |
| `occurredAt` | DateTime? | 来源事件时间 |
| `title` | String? | 展示标题 |
| `status` | String? | legacy 状态 |
| `amount` | Decimal? | 金额字段，仅用于 finance/OCR |
| `disposition` | String | `TEST_AUDIT_ONLY` / `ARCHIVE_ONLY` / `BLOCKED` 等 |
| `blockedReasons` | Json? | 阻塞原因数组 |
| `idempotencyKey` | String | 唯一幂等键，建议唯一索引 |
| `rawPayload` | Json | 完整来源对象 |
| `testBatchId` | String? | 可选 TEST 分组；`TestBatch` 本身不承载 raw evidence |
| `createdAt` / `updatedAt` | DateTime | 标准时间戳 |

建议索引：

- `unique(idempotencyKey)`
- `index(sourceFile, sourceSha16)`
- `index(evidenceType, dataScope)`
- `index(legacyClaimId)`
- `index(legacyAttachmentId)`
- `index(legacyTaskId)`
- `index(disposition)`
- `index(testBatchId)`

## 现有表复用判断

| 现有表 | 本轮是否复用 | 原因 |
| --- | --- | --- |
| `FileRecord` | 否 | 缺 `storageKey/sourceFile/legacyAttachmentId`，且 `uploaderUserId` 必填但映射不完整 |
| `AuditLog` | 否 | `userId` 必填，legacy `actor` 尚未映射到 `User.id` |
| `Notification` | 否 | `userId` 必填，且 13 条周报消息需与周报/通知链路去重 |
| `TestBatch` | 仅可分组 | 可标识 TEST 批次，但不能单独保存 rawPayload、来源指纹和 blockedReasons |

## dry-run v3 would-create 汇总

| 类别 | would create | 当前可执行导入 | 主要阻塞 |
| --- | ---: | ---: | --- |
| Phase2 报销单证据 | 4 | 0 | 只进 TEST / 审计，不进正式报销 |
| 关联 OCR 证据 | 8 | 0 | 只随 TEST 报销闭环归档 |
| 历史 OCR 证据 | 20 | 0 | 历史 claim 归属未确认 |
| 报销附件证据 | 8 | 0 | 6 条 local 不可达；FileRecord 元数据和 uploader 映射不足 |
| 会议附件证据 | 4 | 0 | FileRecord 元数据和 uploader 映射不足 |
| platform 周报消息 | 13 | 0 | Notification.userId 未映射，且需周报链路去重 |
| platform auditItems | 24 | 0 | AuditLog.userId 未映射 |
| 合计 | 81 | 0 | 本轮只做 would-create，不执行 |

关键计数：

- `would_create_employee_launch_evidence_archive_total = 81`
- `would_create_real_expense_claims = 0`
- `would_create_file_records_now = 0`
- `would_create_notifications_now = 0`
- `would_create_audit_logs_now = 0`
- `would_generate_executable_production_sql = 0`
- `would_write_database = 0`

## 幂等键规则

| 类别 | 幂等键规则 |
| --- | --- |
| Phase2 报销单 | `finance.json:{legacyClaimId}:TEST_AUDIT_ONLY` |
| 关联 OCR | `ocr-tasks.json:{legacyTaskId}:TEST_AUDIT_ONLY` |
| 历史 OCR | `ocr-tasks.json:{legacyTaskId}:ARCHIVE_ONLY` |
| 报销附件 | `platform.json:{legacyAttachmentId}:TEST_AUDIT_ONLY` |
| 会议附件 | `platform.json:{legacyAttachmentId}:MEETING_ARCHIVE` |
| platform 消息 | `platform.json:{legacyMessageId}:MESSAGE_ARCHIVE_ONLY` |
| auditItems | `platform.json:{legacyAuditId}:AUDIT_ITEM_ARCHIVE_ONLY` |

## blocked 点处理

1. local 附件不可达
   6 条 local / enterprise-cloud 报销附件当前只允许进入 metadata evidence。v3 不会把它们标记为 `FileRecord` 可创建记录。

2. `storageKey/sourceFile/legacyAttachmentId` 缺失
   附件证据先进入通用归档结构；除非未来扩展 `FileRecord` 或建立 `LegacyAttachmentArchive`，否则不建议直接塞入 `FileRecord`。

3. `uploaderUserId` 映射不完整
   `FileRecord.uploaderUserId` 必填，legacy 只有中文 owner / uploadedBy 文本。本轮不伪造用户 ID。

4. `AuditLog.userId` 映射不完整
   auditItems 只保留 `actorText`，等待 actor 到 `User.id` 映射后再考虑 `AuditLog`。

5. `Notification.userId` 和去重不完整
   13 条周报消息先冻结为证据，不进入 `Notification`。需要先完成收件人映射，并与 `WeeklyReportPayload` / `WeeklyReport` / 现有通知链路去重。

## 输出文件

- `docs/parallel-collab-second-phase-archive-schema-draft-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-second-phase-archive-schema-draft.json`

## 停止点

schema draft + dry-run v3 已到方案层停止。下一步若继续，需要用户单独确认是否把草案转为 Prisma schema 变更设计；在确认前不生成迁移、不生成 SQL、不写库。
