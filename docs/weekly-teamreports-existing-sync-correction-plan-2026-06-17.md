# Weekly teamReports 既有同步修正方案 dry-run

日期：2026-06-17
状态：`correction_plan_dry_run_only`
范围：基于 PR #12 的既有同步验收结果，制定差异修正方案。

## 安全边界

- 本轮只生成修正方案。
- 未写数据库。
- 未执行 `--apply`。
- 未生成可执行 `UPDATE` SQL。
- 未生成写库脚本。
- 未改 schema、migration、API、前端。
- 未部署、未重启、未打 rollback tag。
- `deploymentAllowed=false` 继续保持。

## 修正目标

让生产库中已存在的 6 条正式周报向 v3 目标靠齐，同时避免前端摘要与详情页不一致。

本阶段只规划 3 条内容修正候选：

1. `Han / 2026-05-25`
2. `ChengCheng / 2026-06-08`
3. `lisali / 2026-06-08`

暂不修：

- `greatchef / 2026-05-25` 的额外 `需要配合` reviewItem：先保留，等待业务/D 线确认是否作为历史同步产物。
- `lisali / 2026-05-25` 和 `lisali / 2026-06-01` 的前缀差异：语义可接受，暂不动。
- 2 条缺原文候选：仍不纳入正式修正。
- 主管关系：另做来源复核。

## 修正候选 1：Han / 2026-05-25

目标记录：

- `WeeklyReport.id = wr_b3f18d418c27145ced5e627c`
- 相关 reviewItem：`wri_7f9a9b2dbc48b1a374f8281c`
- 相关 planItem：`wpi_4f5bf9170135688f49982adb`

问题：

- 父表 `completedSummary` 仍截断在 `提前安...`。
- 父表和 planItem 仍包含未补齐的 `4:上月考勤上交立猛 ...`。

修正方案：

- 父表 `completedSummary` 改为 v3 完整 4 项。
- 父表 `focusSummary` 改为 v3 已确认的前 3 项。
- reviewItem `description` 同步改为 v3 完整 4 项，可保留 `周报范围：熊抱大地 · 门店经营` 前缀。
- planItem `description` 同步改为 v3 已确认的前 3 项。
- 不写入 `4:上月考勤上交立猛 ...`。

## 修正候选 2：ChengCheng / 2026-06-08

目标记录：

- `WeeklyReport.id = wr_b361a1934ab724cd56c5da14`
- 相关 reviewItem：`wri_5d12854bc0e9ce932fc43ddf`
- 相关 planItem：`wpi_aab34de461e592a3df8daf1c`

问题：

- 父表 `completedSummary` 和 reviewItem `description` 中包含同周较早提交。
- 同周较早提交第 4 项仍有 `做出简易菜单供客...`。
- v3 目标要求父表正式正文只保留最新完整提交；较早提交仅作为证据 metadata。

修正方案：

- 父表 `completedSummary` 改为 2026-06-14 04:36 最新完整提交。
- reviewItem `description` 同步改为最新完整提交，可保留 `周报范围：道冲元气 · 经营与预约回访` 前缀。
- 父表 `focusSummary` 和 planItem `description` 保留 `4、周三开会做课程总结和家庭振动师推广计划`。
- 同周较早提交不写入正式正文；另由证据归档方案保留。

## 修正候选 3：lisali / 2026-06-08

目标记录：

- `WeeklyReport.id = wr_6bf6e9ba0d49a18000a3fb7a`
- 相关 reviewItem：`wri_c0dc353f8490b81a8c2f2314`
- 相关 planItem：`wpi_30251efba4234d81299d5bf2`

问题：

- 父表和 reviewItem 仍包含 `由申厨和陈师傅负...`。
- 同周较早提交仍包含 `负责交流培训，...`。
- v3 目标要求保守补齐到 `由申厨和陈师傅负责交流培训`，并明确尾部不自动补写。

修正方案：

- 父表 `completedSummary` 改为 v3 的“最新提交 + 同周较早提交 + 缺失说明”结构。
- reviewItem `description` 同步改为同样结构，可保留 `周报范围：熊抱大地 · 经营回顾` 前缀。
- 父表 `focusSummary` 和 planItem `description` 保留 `1. 下周五之前确认新菜单`。
- 不补写 `负责交流培训` 后逗号尾部。

## 追溯和回滚要求

未来如果进入真实修正，必须先另开执行包，并满足：

1. 备份 3 条父表记录当前文本。
2. 备份 3 条 reviewItem 和 3 条 planItem 当前文本。
3. 修正包必须包含 before/after 指纹。
4. postcheck 必须同时核对父表和子表。
5. rollback 必须能把 3 条父表、3 条 reviewItem、3 条 planItem 恢复到 before 文本。

本阶段不生成任何 `UPDATE` 或 rollback SQL。

## 必须先跑的 SELECT-only precheck

见：

`output/employee-data-migration/2026-06-16/weekly-teamreports-existing-sync-correction-plan.precheck.sql`

precheck 目标：

- 确认 3 条父表记录仍存在。
- 确认 3 条 reviewItem 和 3 条 planItem 仍存在。
- 确认这些记录没有新增 payload 关联。
- 确认 payload 门禁仍为 `13 / 3 / 3`，`shared/shared/draft=13`。

## 本轮只读 precheck 结果

已执行 SELECT-only precheck，结果满足修正方案 dry-run 的前置条件：

- 3 条父表记录均存在：
  - `wr_b3f18d418c27145ced5e627c`
  - `wr_b361a1934ab724cd56c5da14`
  - `wr_6bf6e9ba0d49a18000a3fb7a`
- 3 条 reviewItem 均存在。
- 3 条 planItem 均存在。
- 3 条目标周报 direct payload links 均为 0。
- `WeeklyReportPayload` 分组仍为：
  - `api_db_first_bridge / IMPORTED = 13`
  - `legacy_weekly_workspace / IMPORTED = 3`
  - `legacy_weekly_workspace / NEEDS_REVIEW = 3`
- `shared/shared/draft = 13`

## 停止条件

出现任一情况停止：

- 任一目标父表记录不存在。
- 任一目标子表记录不存在或数量变化。
- 任一目标记录已有新的 payload 关联。
- 生产门禁变动。
- 用户未明确授权真实修正。
- D 线不同意从 dry-run 进入修正执行包。

## 下一步

请 D 线复核本 dry-run 方案。若通过，下一阶段也只能生成“修正执行包 dry-run / before-after 指纹”，仍不能直接写库。
