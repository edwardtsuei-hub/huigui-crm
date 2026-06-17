# Weekly teamReports 正式同步 v3 write-plan

日期：2026-06-17
状态：`blocked_existing_rows_precheck`
范围：基于 PR #10 合并后的 runbook，生成正式写入包 dry-run / write-plan。

## 安全边界

- 本文件只是写入计划，不是写库授权。
- 本轮未执行 `--apply`。
- 未写生产数据库。
- 未生成可执行生产写入 SQL。
- 未生成写库脚本。
- 未修改 `prisma/schema.prisma`。
- 未生成 migration。
- 未修改 API、前端或部署配置。
- 未部署、未重启、未打 rollback tag。
- `deploymentAllowed=false` 继续保持。

## 只读 precheck 结果

本轮生成 write-plan 后，已执行 SELECT-only precheck。结果触发停止条件：

- 4 个目标账号均存在且为 `ACTIVE`。
- 6 个 proposed id 已全部存在于生产 `WeeklyReport`。
- 6 个 `userId + weekStartDate + partitionKey='REAL'` 自然键也已存在。
- 目标记录已有子表：
  - `WeeklyReportReviewItem=7`
  - `WeeklyReportPlanItem=6`
- 目标记录没有 `WeeklyReportPayload` 直接关联。
- `Han` 和 `greatchef` 当前 `managerUserId` 已是 `employee-lisali-user`。
- payload 门禁仍稳定：
  - `api_db_first_bridge / IMPORTED = 13`
  - `legacy_weekly_workspace / IMPORTED = 3`
  - `legacy_weekly_workspace / NEEDS_REVIEW = 3`
  - `shared/shared/draft=13`
  - distinct `sourceSha16=13`

结论：不得继续生成“创建 6 条父记录”的正式写入包。本阶段应停止在 write-plan，并转为“既有同步结果验收 / 差异复核”。

## 本轮输出

- 人读 write-plan：`docs/weekly-teamreports-formal-sync-v3-write-plan-2026-06-17.md`
- 机器可读 write-plan：`output/employee-data-migration/2026-06-16/weekly-teamreports-formal-sync-v3-write-plan.json`
- SELECT-only precheck：`output/employee-data-migration/2026-06-16/weekly-teamreports-formal-sync-v3-write-plan.precheck.sql`
- 回滚原则文档：`docs/weekly-teamreports-formal-sync-v3-rollback-plan-2026-06-17.md`
- 只读 precheck 结果：`docs/weekly-teamreports-formal-sync-v3-precheck-result-2026-06-17.md`

## 写入边界

原计划第一阶段只规划创建 6 条 `WeeklyReport` 父记录。但只读 precheck 已确认这 6 条父记录全部存在，所以本阶段不再允许生成创建型写入包。

不进入本阶段：

- `WeeklyReportReviewItem`
- `WeeklyReportPlanItem`
- `WeeklyReportPayload`
- `User.managerUserId`
- 2 条缺原文候选
- 任何前端、API、schema、migration 变更

## 字段边界修正

当前 `WeeklyReport` schema 没有独立 `supportRequest` 字段。因此 v3 dry-run 中的 `supportRequest` 只能作为源证据保留在 write-plan JSON 中，不写入 `WeeklyReport` 父表。

后续如果需要保留“需要协调 / 需要配合”正文，有两个安全选项：

1. 另开子表/备注字段设计，先做 schema draft。
2. 业务明确批准后，把需要协调内容人工合入 `focusSummary`，但这不属于当前第一阶段。

本阶段选择：不写 `supportRequest`。

## v3 目标 6 条已存在

| row | owner | proposed id | weekStartDate UTC | weekEndDate UTC | status |
| --- | --- | --- | --- | --- | --- |
| 1 | 阿蕊 / Han | `wr_b3f18d418c27145ced5e627c` | `2026-05-24T16:00:00.000Z` | `2026-05-30T16:00:00.000Z` | `SUBMITTED` |
| 2 | 申琦 / greatchef | `wr_f6d96e2ecf408970676e6808` | `2026-05-24T16:00:00.000Z` | `2026-05-30T16:00:00.000Z` | `SUBMITTED` |
| 3 | lisa / lisali | `wr_3e8fad063c44a5bba1ee02f4` | `2026-05-24T16:00:00.000Z` | `2026-05-30T16:00:00.000Z` | `SUBMITTED` |
| 6 | lisa / lisali | `wr_c681a1d1666dd11fde497046` | `2026-05-31T16:00:00.000Z` | `2026-06-06T16:00:00.000Z` | `SUBMITTED` |
| 7 | 程程 / ChengCheng | `wr_b361a1934ab724cd56c5da14` | `2026-06-07T16:00:00.000Z` | `2026-06-13T16:00:00.000Z` | `SUBMITTED` |
| 8 | lisa / lisali | `wr_6bf6e9ba0d49a18000a3fb7a` | `2026-06-07T16:00:00.000Z` | `2026-06-13T16:00:00.000Z` | `SUBMITTED` |

既有记录共同字段：

- `dataScope='REAL'`
- `partitionKey='REAL'`
- `managerReviewedAt` / `managerReviewedById` 需要在验收阶段只读核对。
- `testBatchId` 需要在验收阶段只读核对。

## 每条记录的正文策略

### 1. 阿蕊 / Han / 2026-05-25

- 写 `completedSummary`：已补齐 4 项。
- 写 `focusSummary`：只保留已找到原文的前 3 项。
- 不写：`4:上月考勤上交立猛 ...`

### 2. 申琦 / greatchef / 2026-05-25

- 写 `completedSummary`：完整本周工作内容。
- 写 `focusSummary`：完整下周工作计划 1-5 项。
- `supportRequest` 作为源证据保留在 JSON，不写入父表。

### 3. lisa / lisali / 2026-05-25

- 写 `completedSummary`：红豆沙、儿童节儿童餐、菜单 SOP、联营 list。
- 写 `focusSummary`：联营 PPT、番茄豆腐汤面、拍摄视频、配合申厨。

### 6. lisa / lisali / 2026-06-01

- 写 `completedSummary`：4 项完整工作。
- 写 `focusSummary`：万科商业沟通事项。
- 写 `managerReviewComment`：保留主管点评。

### 7. 程程 / ChengCheng / 2026-06-08

- 写 `completedSummary`：只写 2026-06-14 04:36 最新完整提交。
- 写 `focusSummary`：周三开会总结和推广计划。
- 不写入父表正文：2026-06-14 04:27 同周较早提交缺尾部内容。
- 同周较早提交只保留在 JSON 的 `sourceEvidenceNotes` 中。

### 8. lisa / lisali / 2026-06-08

- 写 `completedSummary`：保留“最新提交 + 同周较早提交 + 缺失说明”结构。
- 写 `focusSummary`：下周五之前确认新菜单。
- 写 `managerReviewComment`：保留主管点评。

## SELECT-only precheck

见：

`output/employee-data-migration/2026-06-16/weekly-teamreports-formal-sync-v3-write-plan.precheck.sql`

原进入写入前，precheck 必须满足：

- 4 个目标账号均存在。
- 6 个 proposed id 当前不存在。
- 6 个 `userId + weekStartDate + partitionKey='REAL'` 当前不存在。
- 6 个 proposed id 当前没有 `WeeklyReportReviewItem`。
- 6 个 proposed id 当前没有 `WeeklyReportPlanItem`。
- `WeeklyReportPayload` 分组仍为 `13 / 3 / 3`。
- `shared/shared/draft=13`。
- distinct `sourceSha16=13`。

实际结果：前两项不存在性检查失败，因为 6 个 proposed id 与自然键均已存在。因此停止。

## Postcheck 目标

如果后续转入既有同步验收，必须确认：

- 6 个 proposed id 均存在。
- 6 条均为 `SUBMITTED`。
- 6 条均为 `REAL / REAL`。
- 6 条自然唯一键无重复。
- `WeeklyReportReviewItem` 当前 7 条是否符合历史同步预期。
- `WeeklyReportPlanItem` 当前 6 条是否符合历史同步预期。
- `WeeklyReportPayload` 分组未变。
- `shared/shared/draft` 未增长。

## 停止条件

出现任一情况停止：

- 目标 id 已存在。
- 自然唯一键已存在。
- 用户缺失或状态异常。
- payload 门禁增长。
- schema 字段和本 plan 不一致。
- D 线发现本 PR 混入 payroll/schema/API/前端等无关改动。
- 用户未明确授权执行真实写入。

## 下一步

本 PR 只能交给 D 线复核。即使 D 线通过，也只代表“阻断型 write-plan / precheck 结果”可合并，不代表可以写库。

下一步建议不是写库，而是 D 线复核是否转入“既有 6 条正式周报验收 / 差异复核”。
