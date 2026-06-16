# 大爱归心第二批 TEST / 审计证据归档方案

日期：2026-06-16
工作流：C，第二批 finance / OCR / platform 后续归档方案
状态：`ready_for_review`
业务确认：4 条 `Phase2 实票测试` 报销单只作为 `TEST` / 审计证据保留，不进入正式报销。

## 安全边界

本轮只做归档方案，不做实施：

- 不写生产数据库。
- 不生成生产 SQL。
- 不生成可执行 SQL。
- 不改代码。
- 不改 Prisma schema。
- 不改 API 或前端。
- 不部署、不重启服务。

## 已读取资料

- `docs/parallel-collaboration-control-2026-06-16.md`
- `docs/parallel-collab-second-phase-dryrun-v2-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-second-phase-dryrun-v2.json`

输出文件：

- `docs/parallel-collab-second-phase-archive-plan-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-second-phase-archive-plan.json`

## 归档总原则

1. 这批 Phase2 报销数据不进入正式报销表、正式付款流或正式审批流。
2. 所有数据至少保留来源 JSON 指纹，保证以后能追溯原始状态。
3. DB-backed 归档只能走 `TEST` / 审计证据路径，不使用 `REAL` 分区。
4. 附件类数据不能保存临时签名 URL 作为长期唯一地址，必须优先保存稳定 `storageKey`。
5. 当前存在文件可达性和用户映射阻塞，因此本方案不标记任何行可以直接生产导入。

## 分类矩阵

| 数据类别 | 数量 | 归档结论 | 最低保全 | DB-backed 归档建议 | 可复用现有表 |
| --- | ---: | --- | --- | --- | --- |
| Phase2 报销单 | 4 | TEST / 审计证据 | 冻结 `finance.json` 指纹和 4 条 legacy claim | 新表 `EmployeeLaunchEvidenceArchive` 或 `ExpenseClaimAuditArchive` | 不复用正式 `ExpenseClaim` |
| 关联 OCR | 8 | 随 Phase2 报销单归档 | 冻结 `ocr-tasks.json` 指纹和 8 条 legacy task | 新表 `OcrEvidenceArchive`，或同一证据归档表 | 不进入正式 OCR 工作流 |
| 历史 OCR | 20 | 历史审计归档 | 冻结 JSON 指纹和 legacy task 清单 | 可后置新表，需先确认历史 claim 归属 | 暂不复用 |
| 报销附件 | 8 | Phase2 TEST 附件证据 | 冻结 `platform.json` 指纹和 legacy attachment 清单 | local 阻塞时用 `LegacyAttachmentArchive`；可访问后再考虑 `FileRecord` | 有条件复用 `FileRecord` |
| 会议附件 | 4 | 会议文件归档候选 | 冻结 JSON 指纹和 storageKey | 可作为会议资料归档 | 有条件复用 `FileRecord` |
| platform 消息 | 13 | 暂缓，防重复 | 冻结 JSON 指纹 | 去重后再决定 | 有条件复用 `Notification` |
| auditItems | 24 | 审计轨迹候选 | 冻结 JSON 指纹 | 用户映射后可归档 | 有条件复用 `AuditLog` |

## 逐项保留方案

### 1. 4 条 Phase2 报销单

处理结论：

- 保留为 `TEST_AUDIT_ONLY`。
- 不创建正式 `ExpenseClaim`。
- 不进入正式付款、审批、财务统计。

建议保留字段：

- `legacyClaimId`
- `title`
- `amount`
- `status`
- `submittedAt`
- `attachmentIds`
- `ocrTaskIds`
- `sourceFile=finance.json`
- `sourceSha16=ca3fc6f74b4720b9`
- `dataScope=TEST`
- `rawPayload`

最低保全：

- 冻结 `finance.json` 指纹。
- 将 4 个 `legacyClaimId` 和业务结论写入归档记录。

需要新表的情况：

- 若希望后台可检索、过滤、导出 TEST 证据，建议新建通用 `EmployeeLaunchEvidenceArchive` 或专用 `ExpenseClaimAuditArchive`。
- 不建议复用正式报销表，避免未来统计或付款误计入。

### 2. 8 条关联 OCR

处理结论：

- 随 4 条 Phase2 报销单一起保留为 TEST / 审计证据。
- 不进入正式 OCR 工作流。

8 条闭环任务：

- `ocr-mqaxbwxr-3kw78u`
- `ocr-mqaxbwyy-n6qhio`
- `ocr-mqbg4wal-uat6iq`
- `ocr-mqbg4wf2-xt01p2`
- `ocr-mqbgmt13-w1ih9d`
- `ocr-mqbgmt27-yja64d`
- `ocr-mqbi02ef-fj1hqn`
- `ocr-mqbi02ei-h4nnio`

建议保留字段：

- `legacyTaskId`
- `legacyClaimId`
- `legacyAttachmentId`
- `status`
- `engine`
- `fieldsJson`
- `correctedFieldsJson`
- `rawText`
- `warningsJson`
- `sourceFile=ocr-tasks.json`
- `sourceSha16=f5778a33f59cbd49`
- `dataScope=TEST`
- `rawPayload`

需要新表的情况：

- 若需要 DB-backed 查询，建议 `OcrEvidenceArchive` 或并入 `EmployeeLaunchEvidenceArchive`。
- 不建议在未有正式报销单关系时强行建正式 OCR 外键。

### 3. 20 条历史 OCR

处理结论：

- 只做历史 OCR 审计归档。
- 不绑定当前 4 条 Phase2 报销单。
- 不进入正式报销链路。

最低保全：

- 冻结 `ocr-tasks.json` 指纹。
- 保留 20 条 legacy task 的 ID、claimId、attachmentId、status、rawPayload。

需要新表的情况：

- 只有在后续要可检索历史 OCR 时，才建议进入 `OcrEvidenceArchive`。
- 进入新表前必须先确认历史 `claimId` 的业务归属，否则只能 archive-only。

### 4. 8 条报销附件

处理结论：

- 随 Phase2 报销单保留为 TEST 附件证据。
- 不标记为可执行 FileRecord 导入。

附件分类：

| 类别 | 数量 | 处理 |
| --- | ---: | --- |
| COS 报销票据 | 2 | 可作为 FileRecord 候选，但需要 `storageKey/sourceFile/legacyAttachmentId` 元数据策略 |
| local / enterprise-cloud 报销票据 | 6 | 当前阻塞，只能保留 JSON 元数据和审计证据 |

最低保全：

- 冻结 `platform.json` 指纹。
- 保存 8 条 `legacyAttachmentId`、`storageProvider`、`storageKey`、`name`、`module`、`category`。

可复用 `FileRecord` 的条件：

- `FileRecord` 支持或能承载 `storageKey`。
- 可保存 `sourceFile`、`legacyAttachmentId`，或有等价去重键。
- 已解决 `uploaderUserId` 映射。
- local 文件可达，或明确允许以不可达证据索引形式归档。

需要新表的情况：

- 如果不扩展 `FileRecord`，建议新建 `LegacyAttachmentArchive` 保存 legacy 附件证据。
- 6 条 local / enterprise-cloud 附件目前更适合新表或 JSON 指纹冻结，不适合直接塞进 `FileRecord`。

### 5. 4 条会议附件

处理结论：

- 与 finance/OCR 无关。
- 可作为会议资料归档候选。

最低保全：

- 冻结 `platform.json` 指纹。
- 保存 4 条会议附件的 legacyAttachmentId 和 storageKey。

可复用 `FileRecord` 的条件：

- 上传人能映射到 `User.id`。
- 保存稳定 storageKey，而不是只保存签名 URL。
- 明确业务类型，例如 `businessType=meeting_minutes`。

不需要新表的情况：

- 如果 `FileRecord` 补齐元数据能力，4 条会议附件可以复用 `FileRecord`。

### 6. 13 条 platform 消息

处理结论：

- 暂缓导入。
- 只冻结 JSON 指纹。

原因：

- 13 条都是周报消息。
- 当前周报链路已有 `WeeklyReportPayload`、`WeeklyReport`、旧 JSON 分叉。
- 直接导入 `Notification` 可能造成重复提醒。

可复用 `Notification` 的条件：

- 已完成收件人到 `User.id` 的映射。
- 已按 `to/title/receivedAt` 与现有周报通知链路去重。
- 明确是否保留 unread 状态。

### 7. 24 条 auditItems

处理结论：

- 先冻结 JSON 指纹。
- 可作为审计归档候选。

模块分布：

| module | 数量 |
| --- | ---: |
| 消息中心 | 11 |
| 附件中心 | 8 |
| 报销审批 | 4 |
| 财务导入 | 1 |

可复用 `AuditLog` 的条件：

- `actor` 可映射到 `User.id`。
- `action`、`module`、`targetType`、`targetId` 可规范化。
- 对于无法映射的 actor，不应伪造 userId。

需要新表的情况：

- 如果需要保留不可映射 actor 的原始审计，建议使用 `EmployeeLaunchEvidenceArchive` 或 `LegacyAuditItemArchive`，不要强塞 `AuditLog`。

## 只需冻结 JSON 指纹的项目

以下项目当前只需冻结来源 JSON 指纹和 legacy ID 清单：

- 13 条 platform 周报消息。
- 24 条 auditItems，直到 actor 到 `User.id` 映射完成。
- 20 条历史 OCR，直到历史 claim 归属确认。
- 6 条 local / enterprise-cloud 报销附件，直到文件可达性确认。

## 需要新表或新归档结构的项目

建议新建归档结构，而不是写正式业务表：

- 4 条 Phase2 报销单：`EmployeeLaunchEvidenceArchive` 或 `ExpenseClaimAuditArchive`。
- 8 条关联 OCR：`OcrEvidenceArchive` 或通用证据归档表。
- 6 条 local / enterprise-cloud 报销附件：`LegacyAttachmentArchive`，除非 `FileRecord` 先补齐 legacy/storage 字段。
- 不可映射 actor 的 auditItems：`LegacyAuditItemArchive` 或通用证据归档表。

## 可复用现有表的项目

| 表 | 可复用对象 | 前置条件 |
| --- | --- | --- |
| `FileRecord` | 2 条 COS 报销票据、4 条会议附件 | 补齐或承载 `storageKey/sourceFile/legacyAttachmentId`，完成 `uploaderUserId` 映射 |
| `AuditLog` | 24 条 auditItems | 完成 actor 到 `User.id` 映射和 action/module 规范化 |
| `Notification` | 13 条周报消息 | 完成收件人映射，并与现有周报通知链路去重 |
| `TestBatch` | TEST 证据分组 | 可作为分组关系使用，但不够单独承载 raw evidence |

## blocked 点

1. local 附件文件不可达
   6 条 local / enterprise-cloud 报销附件没有 `fileUrl` / `previewUrl`。dry-run v2 用精确 blob key 在 `/opt/huigui-crm/storage` 下查找，没有找到对应文件。

2. `FileRecord` 缺 legacy/storage 字段
   当前 `FileRecord` 有 `fileUrl`，但没有明确的 `storageKey`、`sourceFile`、`legacyAttachmentId` 字段。直接使用会影响长期访问和幂等导入。

3. `uploaderUserId` 映射不完整
   `FileRecord.uploaderUserId` 必填，但 platform 附件只有中文 owner / uploadedBy 文本，需要先映射到 `User.id`。

4. `AuditLog.userId` 映射不完整
   auditItems 中的 actor 也需要映射到 `User.id`，否则不能直接进入 `AuditLog`。

5. `Notification.userId` 与去重未完成
   13 条周报消息需要先做收件人映射，并与现有周报通知链路去重。

## 停止点

归档方案已完成。当前停止点：

- 不写生产数据库。
- 不生成生产 SQL。
- 不改 schema。
- 不改 API。
- 不改代码。
- 不部署。
- 等待用户决定是否只冻结 JSON 指纹，还是另开 DB-backed TEST / 审计归档设计。
