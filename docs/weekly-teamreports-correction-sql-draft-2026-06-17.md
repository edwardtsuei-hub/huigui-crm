# Weekly teamReports 修正 SQL 草案与回滚草案

日期：2026-06-17
状态：`sql_draft_only_not_executed`

## 本轮目标

基于 PR #14 的 before/after 指纹包，生成下一阶段审查用 SQL 草案：

- apply draft：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-apply-draft.sql`
- rollback draft：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rollback-draft.sql`
- machine-readable plan：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-draft.json`

## 安全边界

- 本轮只生成 SQL 草案，不执行。
- 未写数据库。
- 未部署、未重启、未打 rollback tag。
- 未改 schema、migration、API、前端或业务代码。
- apply / rollback SQL 草案末尾均保留 `ROLLBACK;`，不包含 `COMMIT;`。
- `deploymentAllowed=false` 继续保持。

## SQL 防护设计

每条 apply UPDATE 都必须同时满足：

- 目标 `id` 匹配。
- 子表额外校验 `reportId`。
- 当前字段 SHA256 等于 PR #14 记录的 before SHA。
- 目标周报没有 direct `WeeklyReportPayload` link。

每条 rollback UPDATE 都必须同时满足：

- 目标 `id` 匹配。
- 子表额外校验 `reportId`。
- 当前字段 SHA256 等于 PR #14 记录的 after SHA。
- 目标周报没有 direct `WeeklyReportPayload` link。

因此重复执行或数据漂移时，UPDATE 应变成 `affectedRows=0`，不会覆盖未知状态。

## 操作范围

| 指标 | 数量 |
| --- | ---: |
| 目标周报 | 3 |
| PR #14 字段操作 | 12 |
| 生成 UPDATE 的真实变更 | 10 |
| 跳过 no-op 字段 | 2 |
| apply UPDATE 草案 | 10 |
| rollback UPDATE 草案 | 10 |

跳过的 no-op 字段：

- ChengCheng `WeeklyReportPlanItem.description`：before/after SHA 已一致。
- lisali `WeeklyReportPlanItem.description`：before/after SHA 已一致。

## 执行前提

下一阶段若要进入真实执行窗口，必须先完成：

1. D 线复核本 PR 文件范围与 SQL 内容。
2. 在生产只读环境重新跑 PR #14 precheck。
3. 以事务方式试跑 apply draft，保持末尾 `ROLLBACK;`，确认 10 个 `affectedRows` 均为 1，postcheck 全部命中 after SHA。
4. 用户明确授权真实写库窗口。
5. 真实执行前再次确认 rollback draft 与 apply draft 同包保存。

未完成以上步骤前，不允许把 `ROLLBACK;` 改成 `COMMIT;`。
