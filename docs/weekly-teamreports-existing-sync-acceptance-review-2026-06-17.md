# Weekly teamReports 既有同步验收 / 差异复核

日期：2026-06-17
状态：`needs_correction_plan`
范围：PR #11 合并后，针对生产库中已存在的 6 条 v3 目标周报做只读验收。

## 安全边界

- 本轮只读验收。
- 未写数据库。
- 未执行 `--apply`。
- 未生成生产写入 SQL。
- 未生成修正 SQL。
- 未改 schema、migration、API、前端。
- 未部署、未重启、未打 rollback tag。
- `deploymentAllowed=false` 继续保持。

## 输入依据

- v3 目标：`output/employee-data-migration/2026-06-16/weekly-teamreports-formal-sync-dryrun-v3.json`
- 阻断型 write-plan：`output/employee-data-migration/2026-06-16/weekly-teamreports-formal-sync-v3-write-plan.json`
- 生产只读 precheck：
  - 6 条 `WeeklyReport` 父记录已存在。
  - 7 条 `WeeklyReportReviewItem` 已存在。
  - 6 条 `WeeklyReportPlanItem` 已存在。
  - `WeeklyReportPayload` direct links = 0。

## 总结论

结构层面：6 条正式周报已存在，且均为 `SUBMITTED / REAL / REAL`。

内容层面：尚未达到 v3 目标口径，不能标记为 100 分完成。

主要差异：

1. `Han / 2026-05-25` 仍保留省略号，且仍写入了 v3 要排除的 `4:上月考勤上交立猛 ...`。
2. `ChengCheng / 2026-06-08` 父表正文仍包含缺尾部的同周较早提交，v3 目标是只写最新完整提交，把较早提交作为 metadata。
3. `lisali / 2026-06-08` 父表正文仍有 `负...` 和 `负责交流培训，...`，未按 v3 保守补齐到 `负责交流培训` 并加缺失说明。
4. 生产库已生成子表记录，且 `greatchef / 2026-05-25` 有额外 `需要配合` reviewItem；这和 PR #10 第一阶段“只规划父记录”的边界不一致，需要单独验收子表来源。
5. `Han -> lisali`、`greatchef -> lisali` 主管关系已经存在，需要来源复核。

## 结构验收

| 检查项 | 结果 |
| --- | --- |
| 目标父记录 | 6 / 6 已存在 |
| `status` | 6 / 6 为 `SUBMITTED` |
| `dataScope` | 6 / 6 为 `REAL` |
| `partitionKey` | 6 / 6 为 `REAL` |
| reviewItems | 共 7 条 |
| planItems | 共 6 条 |
| payload direct links | 0 |
| payload 分组门禁 | 稳定：`13 / 3 / 3` |
| `shared/shared/draft` | 13 |
| distinct `sourceSha16` | 13 |

## 逐条差异

### 1. Han / 阿蕊 / 2026-05-25

结构：通过。

内容：未通过。

生产现状：

- `completedSummary` 仍为截断版本，结尾含 `提前安...`。
- `focusSummary` 仍包含 `4:上月考勤上交立猛 ...`。
- 子表 planItem 同样包含 `4:上月考勤上交立猛 ...`。

v3 目标：

- `completedSummary` 使用完整 4 项。
- `focusSummary` 只保留前 3 项。
- 不写入 `4:上月考勤上交立猛 ...`。

建议：进入修正计划候选。

### 2. greatchef / 申琦 / 2026-05-25

结构：基本通过。

内容：部分差异。

生产现状：

- 父表 `completedSummary` 与 v3 主体一致，但多了 `周报范围` 前缀。
- 父表 `focusSummary` 包含下周计划，也包含 `需要配合`。
- 子表有 2 条 reviewItem：`本周完成`、`需要配合`。

v3 目标：

- 父表只写 `completedSummary`、`focusSummary`。
- `supportRequest / 需要配合` 不作为父表字段写入。

建议：不急于修正；先由 D 线确认现有“需要配合”子表是否可接受为历史同步产物。

### 3. lisali / lisa / 2026-05-25

结构：通过。

内容：基本通过。

生产现状：

- `completedSummary` 多 `周报范围` 前缀。
- `focusSummary` 多 `下周计划：` 前缀。
- 正文主体与 v3 一致。

建议：可接受为历史同步产物，除非后续统一清理前缀。

### 4. lisali / lisa / 2026-06-01

结构：通过。

内容：基本通过。

生产现状：

- `completedSummary` 多 `周报范围` 前缀。
- `focusSummary` 多 `下周计划 / 需要配合：暂无`。
- `managerReviewComment` 与 v3 目标一致。

建议：可接受为历史同步产物，除非后续统一清理前缀。

### 5. ChengCheng / 程程 / 2026-06-08

结构：通过。

内容：未通过。

生产现状：

- 父表 `completedSummary` 包含最新提交，也包含同周较早提交。
- 同周较早提交仍有 `做出简易菜单供客...` 省略号。
- `focusSummary` 包含 `需要配合：暂无`。

v3 目标：

- 父表正文只写 2026-06-14 04:36 最新完整提交。
- 同周较早提交作为 metadata / 证据，不写入正式正文。

建议：进入修正计划候选。

### 6. lisali / lisa / 2026-06-08

结构：通过。

内容：未通过。

生产现状：

- 最新提交仍为 `由申厨和陈师傅负...`。
- 同周较早提交仍为 `负责交流培训，...`。
- 没有 v3 要求的缺失说明结构。

v3 目标：

- 最新提交和同周较早提交均保守补齐到 `由申厨和陈师傅负责交流培训`。
- 加上缺失说明：逗号后的尾部仍未找到完整原文，v3 不自动补写。

建议：进入修正计划候选。

## 子表验收

当前子表：

- `WeeklyReportReviewItem=7`
- `WeeklyReportPlanItem=6`

每条目标周报至少已有：

- 1 条 `本周完成` reviewItem。
- 1 条 `下周计划` planItem。

额外项：

- `greatchef / 2026-05-25` 有 1 条 `需要配合` reviewItem。

风险：

- 子表文本多处继承了父表旧文本，因此 Han、ChengCheng、lisali 2026-06-08 的子表也需要跟随修正或确认保留。
- 修正父表但不修正子表，会造成前端详情页与列表摘要不一致。

## 主管关系验收

当前生产库：

- `Han.managerUserId = employee-lisali-user`
- `greatchef.managerUserId = employee-lisali-user`

这两条在早前 v3 设计中被排除出 weekly teamReports 同步。因此需要单独复核其来源和审批，不应在本轮周报验收中默认为已批准。

## 下一步建议

进入“既有同步修正方案 dry-run”阶段，但仍不写库。

建议只读生成：

1. 父表文本修正候选：
   - Han / 2026-05-25
   - ChengCheng / 2026-06-08
   - lisali / 2026-06-08
2. 子表同步修正候选。
3. 主管关系来源复核报告。
4. payload 未关联原因复核。

禁止：

- 不直接更新生产库。
- 不生成可执行 `UPDATE` SQL。
- 不部署、不重启。
- 不打 rollback tag。

## D 线复核指令

请复核本验收报告：

1. 是否确认 6 条父记录结构已存在。
2. 是否确认内容仍有 3 条关键差异。
3. 是否确认子表已存在且需要纳入差异复核。
4. 是否确认主管关系已存在但需要来源复核。
5. 是否允许主线进入“既有同步修正方案 dry-run”阶段。
