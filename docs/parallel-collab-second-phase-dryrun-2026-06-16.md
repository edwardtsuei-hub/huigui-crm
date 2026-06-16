# 大爱归心第二批数据同步 dry-run 报告

日期：2026-06-16
工作流：C，第二批数据同步 dry-run
状态：done
生成时间：2026-06-16 12:30:52 +0800

## 说明

本地环境中 `/opt/huigui-crm` 不存在；本次按当前工作区镜像读取同名文件：`docs/parallel-collaboration-control-2026-06-16.md`、`docs/employee-data-cross-function-sync-assessment-2026-06-16.md` 与 `storage/uploads/employee-launch-contract/*.json`。四份 JSON 的大小与协作评估记录一致。

本次只做只读 dry-run：

- 未读取 `.env` 明文。
- 未连接或写入生产数据库。
- 未修改 API、前端、Prisma schema 或迁移。
- 未生成生产执行 SQL。
- 仅新增本文档和 output JSON。

## 协作记录

开始时间：2026-06-16 12:30:52 +0800
负责范围：只读分析 `schedule.json`、`finance.json`、`ocr-tasks.json`、`platform.json`，输出第二批同步方案和风险排序。
读过的关键文件：

- `docs/parallel-collaboration-control-2026-06-16.md`
- `docs/employee-data-cross-function-sync-assessment-2026-06-16.md`
- `storage/uploads/employee-launch-contract/schedule.json`
- `storage/uploads/employee-launch-contract/finance.json`
- `storage/uploads/employee-launch-contract/ocr-tasks.json`
- `storage/uploads/employee-launch-contract/platform.json`
- `prisma/schema.prisma` 相关模型只读核对：`AttendancePeriod`、`Notification`、`FileRecord`、`AuditLog`、`ApprovalRule`、`ApprovalRequest`、`FinanceAccount`、`SalarySlip`、`SalaryNotifyLog`、`PayrollDraftBatch`

改过的文件：

- `docs/parallel-collab-second-phase-dryrun-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-second-phase-dryrun.json`

执行过的检查：

- JSON 可解析性检查。
- 顶层结构、数组数量、字段集合、状态枚举、来源指纹检查。
- `finance.expenseClaims.attachmentIds` 对 `platform.attachments.id` 的引用检查。
- `finance.expenseClaims.ocrTaskIds` 对 `ocr-tasks` 任务 ID 的引用检查。
- `ocr-tasks.claimId` 对 `finance.expenseClaims.id` 的反向引用检查。
- 当前 Prisma 已有目标表能力的只读核对。

当前状态：done
停止点：已生成 dry-run Markdown 和机器 JSON；没有生成生产 SQL。
下一步建议：先由业务确认哪些 Phase2 报销测试单属于正式数据，再设计 schema/API 同步桥。

## 来源指纹

| 文件 | 大小 | 修改时间 UTC | sha16 |
| --- | ---: | --- | --- |
| `schedule.json` | 1735 | 2026-05-30T04:24:07.000Z | `0f5ecba5e4de95cb` |
| `finance.json` | 8165 | 2026-06-12T22:28:36.000Z | `ca3fc6f74b4720b9` |
| `ocr-tasks.json` | 38516 | 2026-06-12T22:28:36.000Z | `f5778a33f59cbd49` |
| `platform.json` | 53387 | 2026-06-15T03:33:03.000Z | `9aaf13d5b6a98cb2` |

## 总览

| 模块 | 数量 | 主要字段 | 目标表建议 | dry-run 结论 |
| --- | ---: | --- | --- | --- |
| schedule | `snapshot:1`、`attachments:1`、`auditTrail:4` | `date`、`status`、`reviewState`、`attendanceLocked`、`actor`、`at` | `AttendancePeriod`、`AuditLog`，附件仅在有真实文件时进 `FileRecord` | 可轻量同步；不是第二批最大风险 |
| finance | `expenseClaims:4`，总金额 `150.40`，另有审批策略 | `id`、`amount`、`status`、`attachmentIds`、`ocrTaskIds`、`summary` | 新增 `ExpenseClaim`/员工报销表，审批策略可进 `ApprovalRule` 或财务策略配置 | 报销申请是第二批核心，但标题显示 Phase2 测试，需要业务确认 |
| OCR | `tasks:28` | `attachmentId`、`claimId`、`status`、`fields`、`rawText`、`engine` | 新增 `OcrTask`/`FileOcrTask`，关联 `FileRecord` 和报销记录 | 8 条与当前 finance 报销单闭环；其余多为历史或孤立任务 |
| platform | `messages:13`、`attachments:12`、`auditItems:24` | `module`、`status`、`fileUrl`、`receipt.storageKey`、`to`、`actor` | `Notification`、`FileRecord`/`FileFolder`、`AuditLog` | 附件与审计需要尽快同步；消息应防止和周报通知重复 |

## 详细发现

### schedule

- 顶层结构：`snapshot`、`attachments`、`auditTrail`、`meta`。
- `snapshot.date=2026-05-30`，`status=empty`，`reviewState=approved`，`makeupConfirmed=true`，`attendanceLocked=true`，`totalOpenItems=0`。
- `attachments` 只有 1 条，状态为 `missing`，更像缺件提示，不像已有文件资产。
- `auditTrail` 有 4 条，可归档为 `AuditLog`，或随 `AttendancePeriod.rawSnapshot` 保存。
- 建议：若第一批 `AttendancePeriod` 已上线，可将快照作为考勤周期归档候选；不要单独做复杂表。

### finance

- 顶层结构包含 `attendanceArchive`、`imports`、`monthlyReports`、`monthlyAdjustments`、`courseSettlement`、`expenseClaims`、`reviewRequests`、`invoiceFollowUps`、`expenseApprovalPolicy`、`bankTransactions`、`internalReports`、`statutoryJobs`、`meta`。
- 真实非空事务数据集中在 `expenseClaims`：4 条，全部 `pending_review`，每条金额 `37.60`，合计 `150.40`。
- 每条报销单都引用 2 个附件和 2 个 OCR 任务；8 个附件 ID 全部能在 `platform.attachments` 找到，8 个 OCR 任务 ID 全部能在 `ocr-tasks.json` 找到。
- `attendanceArchive.archived=false`，尚无财务回传文件，只能作为状态快照，不建议作为正式归档数据导入。
- `expenseApprovalPolicy` 有阈值 `1000`，财务审批人 1 人，超级管理员 2 人，部门规则 4 条；更适合作为审批配置导入，而不是业务流水。
- 建议：报销单需要单独表或复用 `ApprovalRequest` 时保留完整 `payloadJson`；现有 schema 未看到专门的报销申请表。

### OCR

- OCR 任务共 28 条，`taskType=invoice`，`sourceModule=报销审批`。
- 状态分布：`confirmed:16`、`succeeded:10`、`failed:2`。
- 引擎分布：未标注 19 条、`tencent-cloud-ocr:RecognizeGeneralInvoice` 7 条、`ocr:not-configured` 2 条。
- 28 条均有 `claimId`，但只有 4 个 `claimId` 对应当前 `finance.expenseClaims`；有 14 个历史或孤立 `claimId` 不在当前 finance 文件中。
- 当前 finance 引用的 8 条 OCR 全部存在，且状态均为 `succeeded`。
- 有 9 条带 warnings，16 条含人工校正字段。
- 建议：第二批正式同步时只把当前 finance 闭环内 8 条作为强关联迁移；其余 20 条先进入 OCR 审计归档，待找到对应历史报销单后再补链。

### platform

- `messages` 有 13 条，全部为周报消息，全部 `unread`，优先级 `中:12`、`高:1`。
- `attachments` 有 12 条：会议录音 4 条、报销票据 8 条；状态全部 `pending`。
- 附件存储：`cos:6`、`local:6`。6 条 COS 附件带 `fileUrl/previewUrl`；6 条 local 附件没有 `fileUrl/previewUrl`，但都有 `receipt.storageKey`。
- 8 条报销票据附件全部被 finance 报销单引用；4 条会议录音不被 finance 引用，应作为文件中心/会议纪要附件处理。
- `auditItems` 有 24 条，模块分布：消息中心 11、附件中心 8、报销审批 4、财务导入 1。
- 建议：附件入 `FileRecord` 时使用 `receipt.storageKey` 或稳定对象键作为正式定位，不要把带签名参数的临时 COS URL 作为唯一长期地址。

## 交叉引用检查

| 检查项 | 结果 |
| --- | --- |
| finance 引用的附件数 | 8 |
| finance 附件在 platform 中存在 | 8 / 8 |
| finance 附件缺失 | 0 |
| finance 引用的 OCR 任务数 | 8 |
| finance OCR 在 ocr-tasks 中存在 | 8 / 8 |
| finance OCR 缺失 | 0 |
| OCR 附件在 platform 中存在 | 8 / 22 unique attachmentIds |
| OCR 附件缺失 | 14 个历史/孤立附件 ID |
| OCR claimId 在 finance 中存在 | 4 个当前报销单 |
| OCR claimId 缺失于 finance | 14 个历史/孤立 claimId |

## 必须同步与可归档划分

必须同步候选：

- `finance.expenseClaims` 4 条及其 8 个附件、8 个 OCR 任务，前提是业务确认这些 Phase2 报销测试单要保留为正式流程数据。
- `platform.attachments` 中的 8 条报销票据附件，需和报销单、OCR 任务形成三方链路。
- `platform.attachments` 中 4 条会议录音，若会议纪要模块继续多人协作，应进入 `FileRecord`。
- `schedule.snapshot` 可跟 `AttendancePeriod` 同步，保持考勤锁定状态可见。

可作为附件/审计归档：

- `ocr-tasks.json` 中未被当前 finance 引用的 20 条 OCR 任务，先做来源归档，不直接绑定当前报销单。
- `platform.messages` 13 条周报消息，先和周报/通知迁移结果去重，再决定是否导入 `Notification`。
- `platform.auditItems` 24 条可进 `AuditLog` 或保留为 JSON 审计归档。
- `schedule.attachments` 的 missing 缺件提示不应伪造文件记录。
- `finance` 的空数组区块暂不迁移；`expenseApprovalPolicy` 作为配置迁移候选。

## 风险排序

1. 高：finance 报销单标题均含 Phase2 测试语义，虽然链路完整，但必须确认是否是真实正式报销数据，避免把测试付款指令导入正式流程。
2. 高：platform 里 6 条 local 附件没有 `fileUrl/previewUrl`；导入 `FileRecord` 前必须确认 `receipt.storageKey` 能否映射到可访问对象或本地文件。
3. 高：OCR 有 20 条未被当前 finance 引用，且 14 个 `claimId` 不在当前 finance 文件中；需要先定义历史 OCR 的归档策略，避免丢历史证据或错绑。
4. 中：COS 附件含签名 URL；正式库应保存稳定对象键和元数据，按需签发访问 URL。
5. 中：platform 周报消息可能与 `WeeklyReportPayload` 或通知系统重复；导入 `Notification` 前需按 `to/title/receivedAt` 去重。
6. 低：schedule 当前是锁定空快照，业务复杂度低，可随考勤周期表轻量归档。

## 建议执行顺序

1. 业务确认：4 条 `pending_review` 报销单是否保留为正式数据，还是仅做测试归档。
2. Schema 设计：补齐报销申请表、OCR 任务表或通用 `payloadJson` 过渡表；附件优先复用 `FileRecord`。
3. 附件校验：验证 12 条 platform 附件的 `receipt.storageKey`、COS/local 可访问性、上传人映射。
4. 只读桥：API 先支持 DB-first + JSON fallback，不改变前端路径。
5. 回填 dry-run v2：按确认后的正式/归档范围重新输出候选行、去重键和失败清单。
6. 生产执行：另起确认窗口，备份后再生成/执行 SQL；本次不包含该步骤。
