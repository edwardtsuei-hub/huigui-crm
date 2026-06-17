# Payroll salary slip 生产 schema migration 执行结果

日期：2026-06-17
状态：`production_schema_migration_completed_with_warnings`
本地收口目录：`output/payroll/production-schema-migration-20260617-231344`

## 结论

上一授权流程已执行并完成生产 schema migration `20260617110000_payroll_publish_batch_identity`。本次收口没有再次执行 `db:migrate:deploy`，只做只读确认、证据归档和文档口径更新。

当前生产 postcheck 结论：

- `_prisma_migrations` 记录目标 migration 已完成，`finishedAt=2026-06-17T15:04:24.177Z`，未 rollback。
- 6 个目标字段和 6 个目标索引均已存在。
- payroll DB verify 为 `passed_with_warnings`，无 blockers、无 failures。
- database 100 global precheck 为 `passed`，38 行、29 个 hard gates、0 mismatch。

本次收口未执行：

- 未重复执行生产 `db:migrate:deploy`。
- 未执行历史薪资身份回填。
- 未执行历史通知记录 `publishBatchId` 回填。
- 未发送企业微信通知。
- 未部署。
- 未重启线上服务。
- 未修改员工端压缩 release。

## 原生产执行证据

| 项目 | 结果 |
| --- | --- |
| 目标 migration | `20260617110000_payroll_publish_batch_identity` |
| 执行范围 | 3 条 `ALTER TABLE ... ADD COLUMN`，6 条 `CREATE INDEX` |
| 生产备份 | `/opt/huigui-crm/backups/huigui_crm_before_payroll_schema_20260617230204.sql.gz` |
| 备份 SHA256 | `c7decc1960dc11c280fa4461e5dbba7fdba82d5b6483897f11be4c8af7cf0d06` |
| 执行方式 | 使用本地最新 `prisma/` migration bundle 放入生产容器临时目录执行，避免使用生产服务器旧工作树 |
| 执行前 pending | 仅 1 条：`20260617110000_payroll_publish_batch_identity` |
| Prisma deploy | `All migrations have been successfully applied.` |

## 本次收口只读证据

| 检查项 | 结果 |
| --- | --- |
| 生产前置只读检查 | 目标 migration、6 个字段、6 个索引已存在，因此不重复执行 deploy |
| `_prisma_migrations` | `finished_at=2026-06-17 15:04:24.177`，`rolled_back_at=NULL`，`applied_steps_count=1` |
| `SalarySlip.publishBatchId` | 存在 |
| `SalarySlip.userId` | 存在 |
| `SalarySlip.wecomUserId` | 存在 |
| `SalarySlip.loginAccount` | 存在 |
| `SalaryNotifyLog.publishBatchId` | 存在 |
| `PayrollDraftBatch.publishBatchId` | 存在 |
| 目标索引 | 6/6 存在 |
| `verify:payroll-db` | `passed_with_warnings`，无 blockers，无 failures |
| database 100 global precheck | 38 行、29 个 hard gates、0 mismatch |

## Warning

以下 warning 来自迁移前旧数据，不代表 schema migration 失败：

- `salary_slips_with_incomplete_identity`：schema migration 收口时曾有 1 条旧薪资条身份字段不完整；2026-06-18 已通过方案 A 回填解决，当前 `identityIncomplete=0`。
- `salary_slips_missing_publish_batch_id`：生产已有 1 条旧薪资条缺 `publishBatchId`。
- 近期旧通知记录中存在 `publishBatchId=null` 的历史记录。

处理要求：

- 不能把本次 schema migration 视为历史数据回填完成。
- 历史薪资条和旧通知记录已完成只读导出和 dry-run；2026-06-18 已按用户授权完成方案 A 身份字段回填。`publishBatchId` 真实回填仍必须人工指定批次并单独授权。
- 生产导入和员工查看仍必须使用明确身份字段，不允许退回姓名授权。

## 后续历史回填 dry-run

本次 schema 收口后，已另行完成历史回填 dry-run。2026-06-18 已按用户授权完成方案 A 身份字段回填：

- 证据目录：`output/payroll/history-identity-backfill-dryrun-20260617-232715`
- 结果文档：`docs/payroll-salary-slip-history-identity-backfill-dryrun-2026-06-17.md`
- 使用者身分索引：24 条。
- 历史薪资条：1 条，身份字段为 `auto_update_candidate`，0 条人工身份冲突。
- 历史通知记录：1 条，缺 `publishBatchId`，受影响月份 `2026-05` 无可自动推断的发布批次候选。
- 草稿批次：1 条，未能提供 `2026-05` 的候选 `publishBatchId`。
- 审查 SQL 默认 `ROLLBACK`，SHA256：`c0ebb809bf4253e2067b3e87b7a2c390c88dc3618dba74167d0f270f29c62ca0`。
- 方案 A 执行结果：`docs/payroll-salary-slip-history-backfill-result-2026-06-18.md`。
- 方案 A 后 `identityIncomplete=0`，剩余 warning 为 `salary_slips_missing_publish_batch_id`。

## 证据文件

| 文件 | 用途 |
| --- | --- |
| `output/payroll/salary-slip-production-migration-deploy-transcript-20260617230204.txt` | 原 Prisma deploy transcript |
| `output/payroll/salary-slip-production-migration-status-after-20260617230204.txt` | 原迁移后 Prisma status |
| `output/payroll/salary-slip-production-post-migration-structure-check-20260617230204.tsv` | 原字段、索引和表计数结构检查 |
| `output/payroll/salary-slip-production-db-verify-20260617230204.md` | 原 payroll DB 只读验收报告 |
| `output/payroll/production-schema-migration-20260617-231344/precheck-before.tsv` | 本次收口前置只读检查 |
| `output/payroll/production-schema-migration-20260617-231344/migration-record.tsv` | 本次收口 `_prisma_migrations` 只读记录 |
| `output/payroll/production-schema-migration-20260617-231344/payroll-postcheck.md` | 本次收口 payroll DB 只读验收 |
| `output/payroll/production-schema-migration-20260617-231344/database-100-global-precheck-post-verify.md` | 本次收口 database 100 验收 |
| `output/payroll/salary-slip-production-migration-result-20260617230204.json` | 本收口结果机器可读版本 |

## 剩余事项

1. 恢复员工端 Vite 源码后再做上传入口、导入中心深链预填和上传后返回闭环。
2. 若要回填 `publishBatchId`，必须先指定 `2026-05` 的发布批次，并重新生成 dry-run 与授权。
3. 复核薪资维护权限账号，补齐 `FINANCE` 或 `action.payroll.publish`。
4. 企业微信通知仍需先走测试应用或 dry-run，不得直接真实发送。
5. 完整发布前仍需前端真实登录、上传、发布、通知、员工本人查看闭环验收。
