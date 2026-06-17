# Weekly teamReports 正式同步前执行 runbook

日期：2026-06-17
状态：`ready_for_d_line_review`
范围：基于 PR #9 合并后的 v3 dry-run，进入正式同步前执行方案阶段。

## 当前结论

本 runbook 只定义正式写入前的执行顺序、门禁、停止点和最小写入范围。它不是写库授权，也不是生产 SQL。

- 建议第一阶段正式同步范围：只创建 6 条 `WeeklyReport` 父记录。
- 暂不生成 `WeeklyReportReviewItem` / `WeeklyReportPlanItem` 子记录。
- 暂不更新 `WeeklyReportPayload` 关联。
- 暂不更新 `User.managerUserId`。
- 暂不处理 2 条缺原文候选。
- 不部署、不重启、不打 rollback tag。
- `deploymentAllowed=false` 继续保持。

## 输入依据

- PR #9 v3 dry-run：
  - `output/employee-data-migration/2026-06-16/weekly-teamreports-formal-sync-dryrun-v3.json`
  - `output/employee-data-migration/2026-06-16/weekly-teamreports-formal-sync-dryrun-v3.md`
  - `output/employee-data-migration/2026-06-16/weekly-teamreports-formal-sync-dryrun-v3.precheck.sql`
- schema 依据：
  - `WeeklyReport` 存在唯一键 `userId + weekStartDate + partitionKey`
  - `partitionKey='REAL'`
  - `dataScope=REAL`
- D 线最新门禁：
  - `/api/health=200`
  - `RosterWeek=6`
  - `RosterShift=210`
  - orphan `RosterShift=0`
  - `WeeklyReportPayload` 分组保持 `13 / 3 / 3`
  - `shared/shared/draft=13`
  - distinct `sourceSha16=13`

## 最小写入范围

第一阶段只建议写入 `WeeklyReport` 父记录，原因：

1. v3 候选文本已收敛到 6 条，可用 `completedSummary` / `focusSummary` / `supportRequest` / `managerReviewComment` 表达。
2. `WeeklyReportReviewItem` 和 `WeeklyReportPlanItem` 涉及拆行、排序、跨周 carry-over 和后续编辑保护，当前没有必要在第一阶段写入。
3. `WeeklyReportPayload` 当前已有独立迁移状态门禁，不在本次写入中改动，避免破坏已有 `sourceSha16` 基线。
4. 主管关系是组织数据变更，必须走单独审批，不混入周报同步。

## 将进入写入候选的 6 条

| row | owner | week | proposed id | status | 处理口径 |
| --- | --- | --- | --- | --- | --- |
| 1 | 阿蕊 / Han | 2026-05-25 ~ 2026-05-31 | `wr_b3f18d418c27145ced5e627c` | `SUBMITTED` | 使用已补齐正文；遗漏项只记说明，不写正文。 |
| 2 | 申琦 / greatchef | 2026-05-25 ~ 2026-05-31 | `wr_f6d96e2ecf408970676e6808` | `SUBMITTED` | 文本完整。 |
| 3 | lisa / lisali | 2026-05-25 ~ 2026-05-31 | `wr_3e8fad063c44a5bba1ee02f4` | `SUBMITTED` | 文本完整。 |
| 6 | lisa / lisali | 2026-06-01 ~ 2026-06-07 | `wr_c681a1d1666dd11fde497046` | `SUBMITTED` | 文本完整，保留主管点评。 |
| 7 | 程程 / ChengCheng | 2026-06-08 ~ 2026-06-14 | `wr_b361a1934ab724cd56c5da14` | `SUBMITTED` | 只写最新完整提交；较早提交缺尾部作为备注，不写正文。 |
| 8 | lisa / lisali | 2026-06-08 ~ 2026-06-14 | `wr_6bf6e9ba0d49a18000a3fb7a` | `SUBMITTED` | 保守补到“负责交流培训”，保留缺失说明。 |

建议写入字段：

- `id`
- `userId`
- `weekStartDate`
- `weekEndDate`
- `year`
- `month`
- `weekNumber`
- `status='SUBMITTED'`
- `completedSummary`
- `focusSummary`
- `submittedAt`
- `managerReviewComment`
- `dataScope='REAL'`
- `partitionKey='REAL'`

不建议本阶段写入：

- `managerReviewedAt`
- `managerReviewedById`
- `testBatchId`
- `WeeklyReportReviewItem`
- `WeeklyReportPlanItem`
- `WeeklyReportPayload.weeklyReportId`
- `User.managerUserId`

## 继续暂缓的 2 条

| row | owner | week | proposed id | 暂缓原因 |
| --- | --- | --- | --- | --- |
| 4 | 程程 / ChengCheng | 2026-06-01 ~ 2026-06-07 | `wr_fa07cbec542a9d71ea66f8a7` | `做出简易菜单供客...` 尾部仍缺。 |
| 5 | 申琦 / greatchef | 2026-06-01 ~ 2026-06-07 | `wr_ee35a6b8731ee3a02c2515df` | `6.黑胡椒...` 尾部仍缺。 |

这 2 条不得进入本次正式同步写入包。

## 排除的主管关系

| member | proposed manager | 处理 |
| --- | --- | --- |
| Han / 阿蕊 | lisali / Lisa Li | 排除；另走组织关系变更审批。 |
| greatchef / 申琦 | lisali / Lisa Li | 排除；另走组织关系变更审批。 |

## 执行前门禁

进入任何真实写入前，必须全部满足：

1. PR 本身只包含 runbook / JSON，不包含写库脚本、生产 SQL、schema、migration、API 或前端改动。
2. D 线复核本 runbook 可进入“生成正式写入包”阶段。
3. 用户明确授权下一步生成正式写入包。
4. 正式写入包必须另开 PR，不得直接在本 PR 中补生产 SQL。
5. 写入包生成后，D 线再次只读复核：
   - `/api/health`
   - `RosterWeek=6`
   - `RosterShift=210`
   - orphan `RosterShift=0`
   - `WeeklyReportPayload` 分组
   - `shared/shared/draft=13`
   - distinct `sourceSha16=13`
6. 写入前必须确认目标 6 条不存在：
   - 按 `userId + weekStartDate + partitionKey='REAL'`
   - 按 proposed `id`
7. 任一候选已存在时，停止，回到只读复核，不做覆盖。

## 建议的下一阶段产物

如果 D 线复核通过且用户明确授权，下一阶段只允许生成：

- `weekly-teamreports-formal-sync-v3-write-plan.json`
- `weekly-teamreports-formal-sync-v3-write-plan.md`
- `weekly-teamreports-formal-sync-v3.precheck.sql`
- 可选：`weekly-teamreports-formal-sync-v3.rollback-plan.md`

下一阶段仍不应直接执行写库。是否生成可执行 SQL 或脚本，需要再次单独授权。

## 写入窗口建议

正式写库如果被授权，应采用短窗口：

1. 写入前 5 分钟冻结相关 weekly teamReports 同步操作。
2. 执行只读 precheck。
3. 备份目标表相关行：
   - `WeeklyReport`
   - 只读确认 `WeeklyReportReviewItem`
   - 只读确认 `WeeklyReportPlanItem`
4. 只插入 6 条 `WeeklyReport` 父记录。
5. 立即执行 postcheck。
6. 若 postcheck 失败，不继续扩展同步，按回滚计划处理。

## Postcheck

写入后必须验证：

- 6 条 proposed id 均存在。
- 6 条 `partitionKey='REAL'`。
- 6 条 `dataScope='REAL'`。
- 6 条 `status='SUBMITTED'`。
- 每条 `userId + weekStartDate + partitionKey` 唯一。
- `WeeklyReportReviewItem` 新增数为 0。
- `WeeklyReportPlanItem` 新增数为 0。
- `WeeklyReportPayload` 分组不应变化，除非另行授权。
- `shared/shared/draft` 不应增长。

## 回滚原则

由于第一阶段只建议插入 6 条 `WeeklyReport` 父记录，回滚原则是按 proposed id 精确删除这 6 条新记录。

前提：

- 必须确认这些 id 是本轮新插入。
- 必须确认没有后续用户编辑或子表引用。
- 如果已有用户编辑或子表引用，停止自动回滚，转人工处理。

本 runbook 不生成 `DELETE` SQL。真正回滚 SQL 只能在写入包阶段、经 D 线复核和用户确认后生成。

## 停止条件

出现任一情况立即停止：

- `/api/health` 非 200 或 `status!=ok`
- `RosterWeek / RosterShift / orphan` 门禁异常
- `WeeklyReportPayload shared/shared/draft` 从 13 增长
- 目标 6 条中任一条已存在
- 目标用户缺失或状态异常
- 发现 schema 与本 runbook 字段不一致
- 发现需要写 `WeeklyReportReviewItem` / `WeeklyReportPlanItem` 才能保持业务语义
- 发现本 PR 或下一阶段 PR 混入 payroll/schema/前端/API 无关改动

## 给 D 线的复核指令

请复核本 runbook：

1. 文件范围是否只有正式同步前 runbook 和 JSON。
2. 是否没有生产 SQL、写库脚本、schema、migration、API、前端改动。
3. 第一阶段只写 6 条 `WeeklyReport` 父记录的边界是否安全。
4. 2 条暂缓记录和 2 条主管关系是否明确排除。
5. precheck / postcheck / rollback 原则是否足以进入下一阶段“生成写入包”。
6. 继续保持 `deploymentAllowed=false`。

结论只需给出：是否允许主线进入“生成正式写入包 dry-run / write-plan”阶段。
