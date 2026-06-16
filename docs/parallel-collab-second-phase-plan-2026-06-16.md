# 大爱归心第二批数据同步实施方案

日期：2026-06-16
工作流：C，第二批数据同步实施方案
状态：`ready_for_review`
开始时间：2026-06-16 12:46:49 CST
范围：基于 C 线 dry-run，细化 `finance` / `OCR` / `platform` / `schedule` 的实施顺序、入库边界、schema/API/回填脚本建议和风险排序。

## 安全边界

本次只输出实施方案：

- 未读取 `.env` 明文。
- 未写生产数据库。
- 未生成生产执行 SQL。
- 未修改 API、前端或 Prisma。
- 未部署、未重启服务。
- 未删除或清空任何数据。

## 已读取资料

- `/opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md`
- `/opt/huigui-crm/docs/parallel-collab-second-phase-dryrun-2026-06-16.md`
- `/opt/huigui-crm/docs/employee-data-cross-function-sync-assessment-2026-06-16.md`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/parallel-collab-second-phase-dryrun.json`
- `/opt/huigui-crm/storage/uploads/employee-launch-contract/finance.json`
- `/opt/huigui-crm/storage/uploads/employee-launch-contract/ocr-tasks.json`
- `/opt/huigui-crm/storage/uploads/employee-launch-contract/platform.json`
- `/opt/huigui-crm/storage/uploads/employee-launch-contract/schedule.json`
- `/opt/huigui-crm/prisma/schema.prisma` 中现有 `AttendancePeriod`、`FileRecord`、`FileFolder`、`AuditLog`、`Notification`、`ApprovalRule`、`ApprovalRequest`、财务薪资相关模型。

## 总体结论

第二批不建议一次性正式回填。应先做“附件和证据链”稳定化，再处理费用申请工作流。

推荐顺序：

| 顺序 | 模块 | 动作 | 结论 |
| ---: | --- | --- | --- |
| 0 | 业务确认 | 确认 4 条 finance 报销单是测试还是正式流程 | 必做门槛 |
| 1 | schedule | 作为 `AttendancePeriod` 归档，缺件提示不建文件 | 可先做，低风险 |
| 2 | platform attachments | 12 条附件进入 `FileRecord` 或附件索引表 | finance/OCR 的前置依赖 |
| 3 | OCR | 8 条 finance 闭环任务入正式链路；20 条先做审计归档 | 分层处理 |
| 4 | finance | 4 条报销单默认不能直接按 REAL 迁移；确认后再入 `ExpenseClaim` | 高风险，需业务确认 |
| 5 | platform messages/audit | 周报消息先去重，auditItems 可审计归档 | 后置处理 |

## 特别检查

### 1. finance 报销单是否有测试语义，能否直接迁移

结论：有明显测试语义，不能直接作为正式 `REAL` 报销流程数据迁移。

4 条报销单全部为 `pending_review`，每条金额 `37.60`，合计 `150.40`。标题分别是：

| 报销单 | 标题 | 金额 | 状态 |
| --- | --- | ---: | --- |
| `EX-MQBHZYOV-IM808` | `Phase2 COS CORS 修复实票测试 20260613-0620` | 37.60 | `pending_review` |
| `EX-MQBGMQ6B-1TVDK` | `Phase2 COS/OCR v1 路由修复实票测试 20260613-0544` | 37.60 | `pending_review` |
| `EX-MQBG4UCE-J375P` | `Phase2 COS/OCR 修复实票测试 20260613-0524` | 37.60 | `pending_review` |
| `EX-MQAXBSDG-WRNXA` | `Phase2 实票测试 20260612-2031` | 37.60 | `pending_review` |

判断：

- `Phase2`、`COS/OCR`、`路由修复`、`CORS 修复`、`测试` 都是系统验证语义，不是普通业务报销标题。
- 虽然它们引用真实票据附件和 OCR 任务，仍不能自动等同于正式付款/审批数据。
- 推荐默认进入 `RecordDataScope.TEST` 或审计归档；只有业务明确确认“这些实票测试单需要保留为正式报销流程”后，才可按 `REAL` 导入。

### 2. OCR 28 条里哪 8 条和 finance 闭环

OCR 文件是按任务 ID 作为顶层 key 的对象，共 28 条。当前 finance 4 个报销单引用的 8 条全部存在，且状态均为 `succeeded`。

| OCR 任务 | 报销单 | 附件 | 文件 | 状态 | 金额字段 |
| --- | --- | --- | --- | --- | ---: |
| `ocr-mqaxbwxr-3kw78u` | `EX-MQAXBSDG-WRNXA` | `attachment-mqaxbvah-k2n0u3` | `02-xiangdao-invoice.pdf` | `succeeded` | 368.00 |
| `ocr-mqaxbwyy-n6qhio` | `EX-MQAXBSDG-WRNXA` | `attachment-mqaxbvah-4yj32z` | `01-didi-invoice.pdf` | `succeeded` | 368.00 |
| `ocr-mqbg4wal-uat6iq` | `EX-MQBG4UCE-J375P` | `attachment-mqbg4vl4-kv4m5q` | `01-didi-invoice.pdf` | `succeeded` | 26.08 |
| `ocr-mqbg4wf2-xt01p2` | `EX-MQBG4UCE-J375P` | `attachment-mqbg4vl5-ei479c` | `02-xiangdao-invoice.pdf` | `succeeded` | 11.52 |
| `ocr-mqbgmt13-w1ih9d` | `EX-MQBGMQ6B-1TVDK` | `attachment-mqbgmsbo-f4j4vj` | `01-didi-invoice.pdf` | `succeeded` | 26.08 |
| `ocr-mqbgmt27-yja64d` | `EX-MQBGMQ6B-1TVDK` | `attachment-mqbgmscf-b8xf87` | `02-xiangdao-invoice.pdf` | `succeeded` | 11.52 |
| `ocr-mqbi02ef-fj1hqn` | `EX-MQBHZYOV-IM808` | `attachment-mqbi01nk-rbxkg4` | `01-didi-invoice.pdf` | `succeeded` | 26.08 |
| `ocr-mqbi02ei-h4nnio` | `EX-MQBHZYOV-IM808` | `attachment-mqbi029j-00xqvj` | `02-xiangdao-invoice.pdf` | `succeeded` | 11.52 |

处理建议：

- 若 finance 被确认为正式数据：这 8 条作为正式 OCR 任务迁移，并关联 `ExpenseClaim` 和 `FileRecord`。
- 若 finance 被确认为测试数据：这 8 条随报销单进入 `TEST` 分区或审计归档，不进入正式付款工作流。
- 其余 20 条 OCR 只做历史 OCR 审计归档，暂不绑定当前 4 个报销单；它们涉及 14 个不在当前 finance 文件中的历史 `claimId`。

### 3. platform 12 条附件如何进入 FileRecord

platform 共有 12 条附件：

- 4 条会议录音，模块 `会议纪要`，均为 COS，已有 `fileUrl` / `previewUrl`。
- 8 条报销票据，模块 `报销审批`，全部被 finance 报销单引用。
- 报销票据中 2 条为 COS，有 `fileUrl` / `previewUrl`；6 条为 local/enterprise-cloud 形式，没有 `fileUrl` / `previewUrl`，只有 `receipt.storageKey`。

建议迁移策略：

1. 先建或确认 FileRecord 的来源字段，必须能保存：
   - `legacyAttachmentId`
   - `sourceFile=platform.json`
   - `sourceModule`
   - `storageProvider`
   - `storageKey`
   - `rawPayload`
2. 对已有 COS URL 的附件：
   - `fileUrl` 不保存带签名参数的临时 URL 作为唯一长期地址。
   - 长期定位以 `receipt.storageKey` 为准，访问时按需签发 URL。
3. 对 6 条 local / `enterprise-cloud://` 附件：
   - 先做可访问性验证。
   - 若找不到真实文件，不创建 `ACTIVE` FileRecord；可创建 `PENDING_REVIEW` 附件索引或审计归档。
4. `FileRecord` 当前必填 `uploaderUserId` 和 `fileUrl`，因此直接迁移前需要解决：
   - 上传人中文名到 `User.id` 的映射。
   - 无 URL 的 local 附件如何表示。
   - 是否新增 `storageKey` / `storageProvider` / `metadataJson` 字段，避免把存储信息塞进 `note`。

推荐入库边界：

| 附件类别 | 数量 | 处理 |
| --- | ---: | --- |
| 报销票据 COS | 2 | 可作为 `FileRecord` 候选，关联 finance/OCR |
| 报销票据 local/enterprise-cloud | 6 | 先校验真实文件，再入 `FileRecord`；否则审计归档 |
| 会议录音 COS | 4 | 可入 `FileRecord`，业务类型建议 `meeting_minutes` |

### 4. schedule 是否只作为 AttendancePeriod 归档

结论：是。schedule 当前只适合作为 `AttendancePeriod` 轻量归档。

当前快照：

- `date=2026-05-30`
- `status=empty`
- `reviewState=approved`
- `makeupConfirmed=true`
- `attendanceLocked=true`
- `totalOpenItems=0`

附件只有一条缺件提示：

- `id=supporting-proof`
- `status=missing`
- 内容是“缺主管补充说明，当前请假单已退回补件。”

处理建议：

- 将 `snapshot` 写入现有 `AttendancePeriod.rawSnapshot`。
- `periodKey` 可按实际口径定为 `2026-05-30` 或业务确认后的月份键。
- `source=legacy_schedule_json`、`sourceSha16=0f5ecba5e4de95cb`。
- 4 条 `auditTrail` 可作为 `rawSnapshot` 内部审计保留；如要进 `AuditLog`，需要先完成 `actor=admin` 到 `User.id` 映射。
- 不为 `supporting-proof` 创建 `FileRecord`，因为它是 missing 缺件提示，不是真实文件。

## 正式数据库表 vs 附件/审计归档

| 数据 | 数量 | 推荐归属 | 原因 |
| --- | ---: | --- | --- |
| schedule snapshot | 1 | 正式 `AttendancePeriod` 归档 | 已有表，低风险，状态锁定 |
| schedule missing attachment | 1 | 审计归档 | 不是文件，不应伪造成 FileRecord |
| schedule auditTrail | 4 | `rawSnapshot` 或 `AuditLog` | 需 user 映射后再进 AuditLog |
| platform 报销票据附件 | 8 | `FileRecord` 或待审附件索引 | finance/OCR 前置证据 |
| platform 会议录音附件 | 4 | `FileRecord` | 会议纪要资产，非 finance 链路 |
| platform messages | 13 | 暂缓，先去重 | 全部周报消息，可能和现有周报/通知重复 |
| platform auditItems | 24 | 审计归档或 `AuditLog` | 需 user/module 映射 |
| finance expenseClaims | 4 | 默认 TEST/审计；确认后进 `ExpenseClaim` | 标题有测试语义 |
| finance approval policy | 1 | 配置候选，不进流水 | 审批策略，不是业务单据 |
| OCR finance 闭环任务 | 8 | 随 finance 判定进入正式或 TEST | 与 4 个报销单闭环 |
| OCR 历史/孤立任务 | 20 | 审计归档 | 缺当前 finance claim |

## 下一批 schema 建议

建议新增或调整以下结构，先出 Prisma migration 草案和 dry-run v2，不直接执行生产迁移。

### 1. 附件来源字段

优先在 `FileRecord` 增加字段：

- `legacyAttachmentId String?`
- `sourceFile String?`
- `sourceModule String?`
- `storageProvider String?`
- `storageKey String?`
- `metadataJson Json?`

建议增加唯一约束：

- `@@unique([legacyAttachmentId, partitionKey])`

原因：

- 现在 `FileRecord.fileUrl` 必填，且没有稳定存储键字段。
- COS 签名 URL 不适合作长期唯一地址。
- local / enterprise-cloud 附件需要先保留稳定 key 和待审状态。

### 2. 报销申请表

建议新增 `ExpenseClaim`，不要直接复用现有 `ApprovalRequest` 作为唯一主表。原因是现有 `ApprovalRuleType` 没有报销类型，`ApprovalRequest` 更像审批外壳，不适合承载票据、OCR、付款语义。

核心字段建议：

- `id`
- `legacyClaimId`
- `title`
- `amount Decimal(12,2)`
- `status`
- `submittedAt`
- `applicantUserId`
- `reviewerUserId`
- `dataScope`
- `partitionKey`
- `testBatchId`
- `sourceFile`
- `sourceSha16`
- `rawPayload Json`

关联表建议：

- `ExpenseClaimFile`：连接 `ExpenseClaim` 和 `FileRecord`
- `ExpenseClaimOcrTask` 或直接在 `OcrTask` 上保存 `expenseClaimId`

如果业务确认要接入通用审批，再扩展：

- `ApprovalRuleType.EMPLOYEE_EXPENSE`
- `ApprovalRequest.targetType=expense_claim`
- `ApprovalRequest.targetId=<ExpenseClaim.id>`

### 3. OCR 任务表

建议新增 `OcrTask` 或 `FileOcrTask`：

- `legacyTaskId`
- `fileRecordId`
- `legacyAttachmentId`
- `expenseClaimId`
- `legacyClaimId`
- `taskType`
- `sourceModule`
- `status`
- `engine`
- `mimeType`
- `fileName`
- `fieldsJson`
- `correctedFieldsJson`
- `rawText`
- `warningsJson`
- `rawPayload`
- `dataScope`
- `partitionKey`
- `sourceFile`

建议唯一约束：

- `@@unique([legacyTaskId, partitionKey])`

### 4. schedule 归档

现有 `AttendancePeriod` 已够用。只建议在 dry-run v2 明确：

- `periodKey`
- `sourceSha16`
- `rawSnapshot`
- 是否需要 `AuditLog`

不建议新增复杂 schedule 表。

## 下一批 API 建议

原则：DB-first + JSON fallback，先只读桥，再切写。

建议接口分层：

| 模块 | API 建议 | 说明 |
| --- | --- | --- |
| schedule | 读取时先查 `AttendancePeriod`，缺失 fallback 到 `schedule.json` | 写入暂不开放，先归档 |
| platform attachments | 附件列表先查 `FileRecord`，缺失 fallback 到 `platform.json.attachments` | fileUrl 由后端按 `storageKey` 签发 |
| OCR | 任务详情先查 `OcrTask`，缺失 fallback 到 `ocr-tasks.json` | 保留 legacyTaskId 查找 |
| finance | 报销单先查 `ExpenseClaim`，缺失 fallback 到 `finance.json.expenseClaims` | 写入需等业务确认正式/测试策略 |
| platform messages | 暂不接入写路径 | 先和周报通知去重 |

前端路径建议不变，由 API 做兼容。

## 下一批回填脚本建议

只建议脚本形态，不生成生产 SQL。

1. `employee-second-phase-classify.mjs`
   - 输入四份 JSON。
   - 输出 REAL / TEST / ARCHIVE 分类候选。
   - 把 4 条 finance 报销单默认标记为 `TEST_PENDING_BUSINESS_CONFIRMATION`。

2. `employee-platform-attachments-dryrun-v2.mjs`
   - 校验 12 条附件。
   - 检查 `storageKey`、`storageProvider`、`fileUrl`、上传人映射、目标 `FileRecord` 去重键。
   - 输出可入库、待补文件、仅审计三类。

3. `employee-ocr-dryrun-v2.mjs`
   - 将 28 条 OCR 拆成 `finance_linked_8` 与 `historical_orphan_20`。
   - 校验附件和 claim 双向引用。
   - 输出 `OcrTask` 候选行，不生成 SQL。

4. `employee-finance-expense-dryrun-v2.mjs`
   - 在业务确认后运行。
   - 输出 `ExpenseClaim`、`ExpenseClaimFile`、`ExpenseClaimOcrTask` 候选行。
   - 若未确认，则只输出审计归档计划。

5. `employee-schedule-attendance-dryrun-v2.mjs`
   - 输出 1 条 `AttendancePeriod` 候选。
   - 不处理 missing attachment 为 FileRecord。

## 风险排序

| 优先级 | 风险 | 影响 | 处理 |
| --- | --- | --- | --- |
| P0 | finance 标题有测试语义，不能确认是否正式 | 可能把测试报销变成正式付款/审批数据 | 业务确认前只做 TEST/审计 |
| P0 | 6 条 local/enterprise-cloud 附件无 `fileUrl` / `previewUrl` | FileRecord 可能指向不可访问文件 | 先做文件可达性校验 |
| P1 | OCR 有 20 条历史/孤立任务 | 错绑当前报销单会污染证据链 | 先归档，不绑定 |
| P1 | COS URL 带签名参数 | 长期失效，影响文件访问 | 保存 `storageKey`，按需签发 |
| P1 | `FileRecord` 缺少 legacy/source/storage 字段 | 幂等导入和追溯困难 | schema 先补字段 |
| P2 | platform 周报消息可能重复 | 通知中心重复提醒 | 去重后再导入 |
| P2 | `AuditLog` 需要 userId | admin/中文 actor 不能直接写 | 先做用户映射表 |
| P3 | schedule 是空快照 | 业务价值有限 | 低风险轻量归档 |

## 推荐执行节奏

1. 用户/业务确认 finance 4 单的性质。
2. 只读检查 12 个附件的真实文件可达性和上传人映射。
3. 出 schema 草案，不执行 migration。
4. 出 dry-run v2 JSON，包含候选行、去重键、失败原因。
5. 评审后另开生产执行窗口：备份、生成 SQL、执行、验收。

## 当前停止点

实施方案已准备完成。下一步不应直接生产迁移，而是：

1. 由业务确认 4 条 Phase2 报销测试单是否要作为正式数据保留。
2. 由开发线先设计 schema 和 API DB-first 桥。
3. C 线再做 dry-run v2，不生成生产 SQL。
