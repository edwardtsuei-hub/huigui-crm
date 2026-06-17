# Payroll salary slip 生产迁移授权请求包

日期：2026-06-17
状态：`ready_for_explicit_production_migration_authorization_review`

## 当前角色

本文件是生产 schema migration 执行前的授权评审材料。后续用户已明确授权执行，生产 migration 已完成；当前执行后结论以 `docs/payroll-salary-slip-production-migration-result-2026-06-17.md` 为准。

## 结论

评审结论：`conditionally_approvable_for_schema_migration_only`。

执行前评审原文：当时可以进入“是否授权生产 schema migration”的人工决策，但本文件本身不授权执行。后续用户已明确授权并完成生产 schema migration。

允许请求的下一步授权语句：

```text
授权执行 payroll 生产 schema migration
```

执行前在用户明确授权前，继续禁止：

- 生产 `db:migrate:deploy`
- 生产数据回填
- 生产 SQL 手工执行
- 部署
- 重启
- rollback tag

## 本轮授权评审核对

| 检查项 | 结果 |
| --- | --- |
| 目标 migration | `20260617110000_payroll_publish_batch_identity` |
| SQL 范围 | 3 条 `ALTER TABLE ... ADD COLUMN`，6 条 `CREATE INDEX` |
| 破坏性语句 | 未发现 `DROP / DELETE / TRUNCATE / RENAME / MODIFY COLUMN` |
| 预检 | `npm run preflight:payroll` 无 failures；仅剩前端源码和 Docker 软阻塞 |
| 执行前生产快照 | 目标 migration 未应用；目标字段和索引仍缺失，符合迁移前状态 |
| 本机测试库 migration | 已在 `huigui_crm_test` 应用，字段和索引无缺失 |
| 本机 UAT read-back | 薪资条 4 条、通知记录 1 条均校验通过 |
| 审计包 | `status=ready`，`sourceMode=api_readback` |

执行前自动 readiness gate 显示 `ready_for_test_db_migration_authorization`，原因是该 gate 只读取静态预检和生产前 SELECT 快照，不读取后续完成的本机测试库 UAT 证据。因此本授权包以“测试库/UAT 证据已补齐后的人工授权评审材料”为准；它当时仍不自动授权生产执行。

## 已完成证据

| 项目 | 结果 |
| --- | --- |
| weekly teamReports 修正 | 已真实 `COMMIT`，postcheck 通过 |
| database 100 global precheck | 38 行，0 mismatch |
| payroll migration static guard | 通过，3 条 `ALTER TABLE`，6 条 `CREATE INDEX` |
| 执行前生产库 migration 快照 | migration 未应用，字段和索引仍缺失，符合迁移前状态 |
| 测试库 migration | 已在 `huigui_crm_test` 应用 |
| 测试库字段/索引验收 | 无缺失字段，无缺失索引 |
| 测试库 UAT API | `salary-slips/sync` 创建 4 条，通知日志 1 条 |
| UAT read-back | 薪资条 4 条、通知记录 1 条均回读并校验通过 |
| 审计包 | `status=ready`，`sourceMode=api_readback`，SHA256 已留档 |

## 可接受 warning

以下 warning 不阻断 schema migration，但必须在生产发布薪资批次时继续作为业务规则保留：

| Warning | 当前解释 | 生产要求 |
| --- | --- | --- |
| `salary_slips_with_incomplete_identity` | UAT 样例中“未绑定员工”有 `userId/loginAccount`，但缺 `wecomUserId`，因此被跳过企微通知 | 允许保存薪资条，但不得进入企微通知名单 |
| `duplicate_teacher_names_need_identity_review` | UAT 故意放入 2 条同名“程程”，用不同 `teacherId/userId/wecomUserId/loginAccount` 隔离 | 生产导入不得只靠姓名授权，必须使用明确身份字段 |
| `salary-slips/sync` 金额 warning | UAT 中一条复杂薪资合计不一致，接口返回 warning | 财务发布前必须复核 warning；schema migration 不因业务金额 warning 阻断 |

## 执行前授权后允许范围

执行前约定：如果用户明确授权，只允许执行生产 schema migration：

```bash
npm run db:migrate:deploy
```

目标 migration：

```text
20260617110000_payroll_publish_batch_identity
```

只允许新增字段和索引：

- `SalarySlip.publishBatchId`
- `SalarySlip.userId`
- `SalarySlip.wecomUserId`
- `SalarySlip.loginAccount`
- `SalaryNotifyLog.publishBatchId`
- `PayrollDraftBatch.publishBatchId`
- 6 个对应索引

不允许在同一授权中执行：

- `salary-identity-backfill-dryrun.mjs` 生成 SQL 的 `COMMIT`
- 历史薪资身份字段回填
- 生产 UAT API 写入
- 企业微信真实通知
- 前端发布或压缩包修改

本授权不解决员工端 Vite 源码缺失问题，也不放行前端 UI 修复；源码恢复前仍禁止 patch 压缩 release。

## 执行前授权后执行顺序

1. 生产库备份。
2. 生产迁移前重新跑 SELECT-only precheck，确认仍为迁移前状态。
3. 执行 `npm run db:migrate:deploy`。
4. 执行 `npm run verify:payroll-db` 指向生产库，只读验收字段、索引和 migration。
5. 重新跑 database 100 global precheck。
6. 输出生产 migration result 文档和 JSON。

## 停止点

必须立即停止并报告：

- 生产 precheck 显示 migration 已被应用。
- 生产 precheck 出现非预期字段或索引。
- `db:migrate:deploy` 尝试执行非目标 migration。
- migration 执行失败或部分失败。
- postcheck 缺字段、缺索引或 `_prisma_migrations` 未完成。
- database 100 global precheck 出现硬门禁 mismatch。

## 执行后仍不等于数据库 100 分的事项

- payroll 生产 schema migration 已完成，但历史数据回填未完成。
- payroll 历史身份回填仍只允许 dry-run，不允许真实 `COMMIT`。
- `EmployeeLaunchEvidenceArchive` 仍停在 schema draft，未进入 migration。
- B 线员工端 Vite 源码仍未恢复，前端上传入口 UI 不能安全修复。
- D 线发布判断仍需独立门禁；本请求包不放行部署。
