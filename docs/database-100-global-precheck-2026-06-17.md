# 数据库 100 分全局 precheck

日期：2026-06-17
状态：`select_only_precheck_ready_final_sha_after_weekly_commit`

## 目标

把 PR #17 的「数据库 100 分状态总控矩阵」转成一份可重复执行的全局只读门禁：

`output/employee-data-migration/2026-06-16/database-100-global-precheck.sql`

这份 SQL 用于每次数据修正、归档 schema、薪资迁移或发布判断前的统一检查。

## 安全边界

- 只包含 `SELECT`。
- 不包含 `INSERT / UPDATE / DELETE / ALTER / CREATE / DROP / TRUNCATE`。
- 不包含 `COMMIT / ROLLBACK / START TRANSACTION`。
- 不写生产数据库。
- 不部署、不重启、不打 rollback tag。
- 不修改 schema、API、前端或业务代码。

## 覆盖范围

| 范围 | 检查内容 |
| --- | --- |
| 排班 | `RosterWeek=6`、`RosterShift=210`、orphan `RosterShift=0` |
| 周报 payload | total=19、分组 `13 / 3 / 3`、`shared/shared/draft=13`、distinct `sourceSha16=13` |
| 周报子表 | `WeeklyReportReviewItem` / `WeeklyReportPlanItem` orphan=0 |
| 周报修正 | 3 条目标周报 payload links=0，12 个 final SHA 仍吻合 |
| 证据归档 | `EmployeeLaunchEvidenceArchive` 当前尚未存在 |
| 附件 | `FileRecord=0`，并检查缺失的归档元数据列 |
| 消息 / 审计 | `Notification`、`AuditLog` 当前数量 |
| 薪资 | `SalarySlip` 身份列存在性与三张薪资表当前数量，当前作为观察项 |

## 使用方式

在生产只读检查中执行：

```bash
ssh root@49.232.57.98 "docker exec -i huigui-mysql sh -lc 'mysql --default-character-set=utf8mb4 -uroot -p\"\$MYSQL_ROOT_PASSWORD\" \"\$MYSQL_DATABASE\" -N'" \
  < output/employee-data-migration/2026-06-16/database-100-global-precheck.sql
```

输出列：

- `checkName`
- `actualValue`
- `expectedValue`

`expectedValue` 为 `NULL` 的项目只作为观测值，不作为阻断值。

薪资身份列当前仍属于独立薪资线迁移范围；在薪资 migration 进入测试库 / 生产窗口前，相关列存在性只做观察，不阻断周报修正后的全局门禁。

## 阻断规则

必须停止后续写库或发布判断的情况：

- 任一非 `NULL` 的 `expectedValue` 与 `actualValue` 不一致。
- 周报修正 12 个 final SHA 任一不吻合。
- 目标 3 条周报 direct payload links 大于 0。
- `shared/shared/draft` 或 distinct `sourceSha16` 增长。
- 排班 orphan 大于 0。
- 周报子表 orphan 大于 0。

当前不作为全局硬阻断、但需要继续追踪的情况：

- `SalarySlip.publishBatchId / userId / wecomUserId / loginAccount` 在生产库尚未存在。
- `EmployeeLaunchEvidenceArchive` 尚未落 schema。
- `FileRecord` 尚未具备 `storageKey / sourceFile / legacyAttachmentId`。

## 下一步

这份 precheck 合并后，后续可以作为：

1. 周报真实 COMMIT 后 final SHA 门禁。
2. 后续数据修正前的当前生产基线。
3. 证据归档 schema / migration dry-run 前门禁。
4. 薪资测试库迁移和生产判断前的基线检查。
5. 发布前总控只读检查。

weekly teamReports 修正已在用户二次明确授权后完成真实 `COMMIT`，本 precheck 已更新为提交后的 final SHA 口径。

## 本轮只读试跑结果

已在生产库只读执行一次，结果：

- hard gate mismatches：0
- 排班、周报 payload、周报子表 orphan、周报修正 final SHA 全部吻合。
- `EmployeeLaunchEvidenceArchive` 当前不存在，符合当前 schema draft 阶段预期。
- `FileRecord` 当前为 0，且缺少归档元数据列，符合当前 C 线阻断判断。
- 薪资身份列当前仍未进入生产库，作为薪资线观察项，不阻断周报修正后的全局门禁。
