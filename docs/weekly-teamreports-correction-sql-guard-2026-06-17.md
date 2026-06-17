# Weekly teamReports 修正 SQL 静态守卫

日期：2026-06-17
状态：`guard_passed_not_executed`

## 目标

在用户授权任何 `ROLLBACK` 事务试跑之前，先用本地静态守卫确认周报修正 SQL 草案仍然符合安全结构。

本轮新增：

- `scripts/migrations/employee-data/weekly-teamreports-correction-sql-guard.mjs`
- `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-guard-result.json`
- `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-guard-result.md`

## 安全边界

- 只读取本地 SQL 草案和计划 JSON。
- 不连接数据库。
- 不执行 SQL。
- 不写生产数据库。
- 不生成生产 SQL。
- 不修改 schema、migration、API、前端或业务代码。
- 不部署、不重启、不打 rollback tag。
- 不改变 `weekly-teamreports-correction-apply-draft.sql` 或 `weekly-teamreports-correction-rollback-draft.sql`。

## 检查范围

静态守卫同时检查 apply draft 与 rollback draft：

| 检查项 | 要求 |
| --- | --- |
| final statement | 必须为 `ROLLBACK` |
| transaction | 必须且只能有一个 `START TRANSACTION` |
| rollback | 必须且只能有一个可执行 `ROLLBACK` |
| commit | 不允许可执行 `COMMIT` |
| update count | 必须等于计划 JSON 中的 `10` |
| update tables | 只能是 `WeeklyReport`、`WeeklyReportReviewItem`、`WeeklyReportPlanItem` |
| affected rows | 每条 UPDATE 后必须有对应 `ROW_COUNT()` SELECT |
| precheck / postcheck | 每条 UPDATE 必须有对应 precheck 与 postcheck |
| SHA guard | 每条 UPDATE 必须有对应字段 SHA guard |
| payload guard | 每条 UPDATE 必须有 `WeeklyReportPayload` direct link guard |
| child guard | 子表 UPDATE 必须有 `reportId` guard |
| operation match | 每个计划操作都必须在 SQL 中找到完整 guard |

## 当前校验结果

命令：

```bash
node scripts/migrations/employee-data/weekly-teamreports-correction-sql-guard.mjs \
  --apply-sql output/employee-data-migration/2026-06-16/weekly-teamreports-correction-apply-draft.sql \
  --rollback-sql output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rollback-draft.sql \
  --plan output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-draft.json \
  --out output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-guard-result.json \
  --markdown-out output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-guard-result.md
```

结果：

| 指标 | 值 |
| --- | ---: |
| draftsChecked | 2 |
| failedChecks | 0 |
| applyStatus | passed |
| rollbackStatus | passed |

apply draft：

- statements：51
- `START TRANSACTION`：1
- `ROLLBACK`：1
- `COMMIT`：0
- `UPDATE`：10
- `ROW_COUNT()` SELECT：10
- precheck SELECT：10
- postcheck SELECT：10
- payload guard：10
- SHA guard：30
- child `reportId` guard：4

rollback draft：

- statements：51
- `START TRANSACTION`：1
- `ROLLBACK`：1
- `COMMIT`：0
- `UPDATE`：10
- `ROW_COUNT()` SELECT：10
- precheck SELECT：10
- postcheck SELECT：10
- payload guard：10
- SHA guard：30
- child `reportId` guard：4

## 反向烟测

已用临时副本将 apply draft 最后一行 `ROLLBACK;` 替换为 `COMMIT;`。

结果：

- `applyStatus=blocked`
- `rollbackStatus=passed`
- `failedChecks=4`
- exit code：`2`

说明守卫能拦截误把草案变成可提交写库 SQL 的情况。

## 使用位置

在进入用户授权的 `ROLLBACK` 事务试跑之前，必须先跑此守卫。

若守卫结果不是 `passed`：

- 不执行 SQL。
- 不进入事务试跑。
- 不允许把任何 `ROLLBACK` 改成 `COMMIT`。
- 先回到 SQL 草案审查阶段。

## 当前结论

当前 apply / rollback 草案通过静态安全守卫，可作为下一步 `ROLLBACK` 事务试跑前的必要门禁材料之一。

这不代表已经授权执行 SQL，也不代表允许真实写库。真实执行仍必须保持：

- 用户先明确授权 `ROLLBACK` 事务试跑。
- 试跑通过后，用户第二次明确授权真实 `COMMIT`。
- `deploymentAllowed=false` 继续保持，直到正式发布决策重新打开。
