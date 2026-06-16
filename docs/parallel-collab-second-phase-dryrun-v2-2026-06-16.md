# 大爱归心第二批 finance / OCR / platform dry-run v2 方案

日期：2026-06-16
工作流：C，第二批数据同步 dry-run v2
状态：`ready_for_review`
范围：基于“4 条 Phase2 实票测试报销单只作为 `TEST` / 审计证据保留”的业务确认，重新分类 finance / OCR / platform 的候选动作。

## 安全边界

本轮只做 dry-run v2 方案和候选分类输出：

- 未读取 `.env` 明文。
- 未写生产数据库。
- 未生成可执行生产 SQL。
- 未修改 API、前端、Prisma 或迁移脚本。
- 未部署、未重启服务。
- 未删除、清空、回滚任何数据。
- schedule 本轮不推进；本轮只覆盖 finance / OCR / platform。

## 已读取资料

- `/opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md`
- `/opt/huigui-crm/docs/parallel-collab-second-phase-plan-2026-06-16.md`
- `/opt/huigui-crm/docs/parallel-collab-second-phase-dryrun-2026-06-16.md`
- `/opt/huigui-crm/storage/uploads/employee-launch-contract/finance.json`
- `/opt/huigui-crm/storage/uploads/employee-launch-contract/ocr-tasks.json`
- `/opt/huigui-crm/storage/uploads/employee-launch-contract/platform.json`
- `/opt/huigui-crm/prisma/schema.prisma` 中 `FileRecord`、`AuditLog`、`Notification`、`TestBatch` 模型

输出文件：

- `/opt/huigui-crm/docs/parallel-collab-second-phase-dryrun-v2-2026-06-16.md`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/parallel-collab-second-phase-dryrun-v2.json`

## 来源指纹

| 文件 | sha16 | 大小 |
| --- | --- | ---: |
| `finance.json` | `ca3fc6f74b4720b9` | 8165 |
| `ocr-tasks.json` | `f5778a33f59cbd49` | 38516 |
| `platform.json` | `9aaf13d5b6a98cb2` | 53387 |

## v2 结论

| 模块 | v2 处理 | 数量 | 是否进入正式报销 |
| --- | --- | ---: | --- |
| finance 报销单 | `TEST_AUDIT_EVIDENCE` | 4 | 否 |
| OCR finance 闭环任务 | 随 Phase2 报销单归入 `TEST` / 审计证据 | 8 | 否 |
| OCR 历史/孤立任务 | 历史 OCR 审计归档 | 20 | 否 |
| platform 报销票据附件 | 随 Phase2 报销单归入 `TEST` / 审计证据 | 8 | 否 |
| platform 会议录音附件 | 会议文件归档候选，需文件可达性确认 | 4 | 不适用 |
| platform 周报消息 | 暂缓，等待与周报通知链路去重 | 13 | 不适用 |
| platform auditItems | 审计归档候选，需用户映射 | 24 | 不适用 |

关键数字：

- `would_create_real_expense_claims = 0`
- `would_generate_executable_production_sql = 0`
- `would_write_database = 0`
- `finance TEST / 审计候选 = 4`
- `OCR TEST 闭环候选 = 8`
- `OCR 历史归档候选 = 20`
- `platform TEST 附件候选 = 8`
- `platform 会议附件候选 = 4`

## finance v2 分类

业务确认后，4 条 Phase2 报销单全部不进入正式报销，只保留为 `TEST` / 审计证据。

| legacyClaimId | 金额 | 状态 | v2 处置 | 幂等键 |
| --- | ---: | --- | --- | --- |
| `EX-MQBHZYOV-IM808` | 37.60 | `pending_review` | `TEST_AUDIT_EVIDENCE` | `finance.json:EX-MQBHZYOV-IM808:TEST_AUDIT_ONLY` |
| `EX-MQBGMQ6B-1TVDK` | 37.60 | `pending_review` | `TEST_AUDIT_EVIDENCE` | `finance.json:EX-MQBGMQ6B-1TVDK:TEST_AUDIT_ONLY` |
| `EX-MQBG4UCE-J375P` | 37.60 | `pending_review` | `TEST_AUDIT_EVIDENCE` | `finance.json:EX-MQBG4UCE-J375P:TEST_AUDIT_ONLY` |
| `EX-MQAXBSDG-WRNXA` | 37.60 | `pending_review` | `TEST_AUDIT_EVIDENCE` | `finance.json:EX-MQAXBSDG-WRNXA:TEST_AUDIT_ONLY` |

finance v2 建议：

- 不创建正式 `ExpenseClaim`。
- 不进入正式付款或审批流程。
- 若后续需要 DB-backed 留痕，只能进入 TEST 分区或专门的审计证据归档结构。
- 本轮不设计 schema、不写脚本、不生成 SQL。

## OCR v2 分类

OCR 总数 28 条，状态分布：

| 状态 | 数量 |
| --- | ---: |
| `confirmed` | 16 |
| `succeeded` | 10 |
| `failed` | 2 |

与 4 条 Phase2 报销单闭环的 8 条 OCR：

| OCR 任务 | claimId | attachmentId | v2 处置 |
| --- | --- | --- | --- |
| `ocr-mqaxbwxr-3kw78u` | `EX-MQAXBSDG-WRNXA` | `attachment-mqaxbvah-k2n0u3` | `TEST_AUDIT_EVIDENCE_WITH_PHASE2_CLAIM` |
| `ocr-mqaxbwyy-n6qhio` | `EX-MQAXBSDG-WRNXA` | `attachment-mqaxbvah-4yj32z` | `TEST_AUDIT_EVIDENCE_WITH_PHASE2_CLAIM` |
| `ocr-mqbg4wal-uat6iq` | `EX-MQBG4UCE-J375P` | `attachment-mqbg4vl4-kv4m5q` | `TEST_AUDIT_EVIDENCE_WITH_PHASE2_CLAIM` |
| `ocr-mqbg4wf2-xt01p2` | `EX-MQBG4UCE-J375P` | `attachment-mqbg4vl5-ei479c` | `TEST_AUDIT_EVIDENCE_WITH_PHASE2_CLAIM` |
| `ocr-mqbgmt13-w1ih9d` | `EX-MQBGMQ6B-1TVDK` | `attachment-mqbgmsbo-f4j4vj` | `TEST_AUDIT_EVIDENCE_WITH_PHASE2_CLAIM` |
| `ocr-mqbgmt27-yja64d` | `EX-MQBGMQ6B-1TVDK` | `attachment-mqbgmscf-b8xf87` | `TEST_AUDIT_EVIDENCE_WITH_PHASE2_CLAIM` |
| `ocr-mqbi02ef-fj1hqn` | `EX-MQBHZYOV-IM808` | `attachment-mqbi01nk-rbxkg4` | `TEST_AUDIT_EVIDENCE_WITH_PHASE2_CLAIM` |
| `ocr-mqbi02ei-h4nnio` | `EX-MQBHZYOV-IM808` | `attachment-mqbi029j-00xqvj` | `TEST_AUDIT_EVIDENCE_WITH_PHASE2_CLAIM` |

其余 20 条 OCR：

- v2 处置：`OCR_HISTORICAL_AUDIT_ARCHIVE`
- 不绑定当前 4 条 Phase2 报销单。
- 不进入正式报销链路。
- 后续如需补链，必须先确认历史 `claimId` 的业务归属。

## platform v2 分类

platform 总览：

| 类型 | 数量 | v2 处置 |
| --- | ---: | --- |
| attachments | 12 | 拆分为 TEST 报销票据 8 条 + 会议附件候选 4 条 |
| messages | 13 | 暂缓，等待周报通知链路去重 |
| auditItems | 24 | 审计归档候选，需用户映射 |

附件存储分布：

| storageProvider | 数量 | 处置 |
| --- | ---: | --- |
| `cos` | 6 | 有 `fileUrl` / `previewUrl`，但仍应保存 `storageKey`，不要保存签名 URL 作为长期唯一地址 |
| `local` | 6 | 无 `fileUrl` / `previewUrl`，需先解决文件可达性映射 |

8 条报销票据附件：

| 附件 | 存储 | URL 状态 | v2 处置 |
| --- | --- | --- | --- |
| `attachment-mqbi01nk-rbxkg4` | `cos` | 有 URL | TEST 审计证据候选，但需 storageKey 字段 |
| `attachment-mqbi029j-00xqvj` | `cos` | 有 URL | TEST 审计证据候选，但需 storageKey 字段 |
| `attachment-mqbgmsbo-f4j4vj` | `local` | 无 URL | 阻塞：需文件访问映射 |
| `attachment-mqbgmscf-b8xf87` | `local` | 无 URL | 阻塞：需文件访问映射 |
| `attachment-mqbg4vl4-kv4m5q` | `local` | 无 URL | 阻塞：需文件访问映射 |
| `attachment-mqbg4vl5-ei479c` | `local` | 无 URL | 阻塞：需文件访问映射 |
| `attachment-mqaxbvah-k2n0u3` | `local` | 无 URL | 阻塞：需文件访问映射 |
| `attachment-mqaxbvah-4yj32z` | `local` | 无 URL | 阻塞：需文件访问映射 |

4 条会议录音附件：

- v2 处置：`MEETING_FILE_ARCHIVE_CANDIDATE`
- 都是 COS 附件，有 `fileUrl` / `previewUrl`。
- 与 finance/OCR 无关，不进入报销证据链。
- 若要进 `FileRecord`，仍需确认上传人映射和长期 `storageKey` 字段。

只读文件可达性检查：

- 对 6 条 `enterprise-cloud://...blob...` 报销附件，用精确 blob key 在 `/opt/huigui-crm/storage` 下查找，未找到匹配文件。
- 因此这 6 条不能标记为可执行 FileRecord 导入，只能标记为 `BLOCKED_NEEDS_FILE_ACCESS_MAPPING`。

## 目标表 / 归档方式建议

本轮不做 schema，但 v2 分类给出后续可选落点：

| 数据 | 推荐后续落点 | 说明 |
| --- | --- | --- |
| 4 条 Phase2 报销单 | `TestBatch` 关联的审计归档，或新建 `ExpenseClaimAuditArchive` | 不进入正式 `ExpenseClaim` |
| 8 条 Phase2 OCR | `OcrTask` TEST 分区，或 OCR 审计归档 JSON | 随 Phase2 报销单归档 |
| 20 条历史 OCR | OCR 审计归档 | 不绑定当前报销单 |
| 8 条报销票据附件 | `FileRecord` TEST 分区候选，或附件审计归档 | 6 条 local 先阻塞 |
| 4 条会议录音 | `FileRecord` 会议资料候选 | 与报销无关 |
| 13 条周报消息 | 暂缓 | 需和周报/通知链路去重 |
| 24 条 auditItems | 审计归档 | 需 `actor` 到 `User.id` 映射后才能进 `AuditLog` |

## 阻塞点

1. `FileRecord` 当前必填 `fileUrl` 和 `uploaderUserId`，且没有明确 `storageKey` / `sourceFile` / `legacyAttachmentId` 字段；所以附件候选不能变成可执行导入。
2. 6 条 local / enterprise-cloud 报销附件没有 URL，并且精确 blob-key 搜索未在 `/opt/huigui-crm/storage` 下找到文件。
3. 20 条 OCR 是历史/孤立记录，不能误绑到当前 4 条 Phase2 报销单。
4. 13 条 platform 周报消息可能与当前周报通知链路重复，先暂缓。

## 非执行性下一步选项

只有用户再次明确要求时才继续：

1. 如果只保留文件证据，不做 DB：冻结三份 JSON 和来源指纹，写一份审计归档索引即可。
2. 如果要 DB-backed 审计：先设计 TEST / 审计证据表或 `FileRecord` 元数据扩展，但不使用正式报销表。
3. 如果要导入附件：先解决 `storageKey`、`fileUrl`、`uploaderUserId` 映射，再跑非 SQL dry-run v3。

## 停止点

dry-run v2 方案已完成。当前停止点：

- 不生成生产 SQL。
- 不写数据库。
- 不改代码。
- 不部署。
- 不启动 schema / API / 回填脚本。
- 等待用户下一步明确指令。
