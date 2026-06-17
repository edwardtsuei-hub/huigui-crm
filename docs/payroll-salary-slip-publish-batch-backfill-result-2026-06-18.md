# Payroll 历史 publishBatchId 回填结果

日期：2026-06-18
状态：`scheme_b_main_completed`
目标批次：`salary-publish-2026-05-codex-single-trial`
执行证据目录：`output/payroll/history-publish-batch-backfill-apply-20260618-055925`

## 授权口径

用户已确认执行主方案 B：

```text
确认执行方案 B 主方案，用 1 个批次 salary-publish-2026-05-codex-single-trial，不纳入 PayrollDraftBatch
```

本次执行范围：

- 回填 1 条历史 `SalarySlip.publishBatchId`。
- 回填 1 条历史 `SalaryNotifyLog.publishBatchId`。
- 不更新 `PayrollDraftBatch`。
- 不发送企业微信通知。
- 不部署。
- 不重启线上服务。
- 不修改 schema。

## 执行结果

正式提交 SQL 由已复核的主方案 B dry-run SQL 转换而来，仅将结尾 `ROLLBACK` 改为 `COMMIT`，并保留原有条件保护。

| 项目 | 结果 |
| --- | --- |
| `SalarySlip` 影响行数 | 1 |
| `SalaryNotifyLog` 影响行数 | 1 |
| `PayrollDraftBatch` 影响行数 | 0，未纳入写入 |
| 提交 SQL SHA256 | `6c359ac064f6129a402ef2da26909d43f5dd21d7ffd56e7643210e30b9c5d536` |

## 回填后只读验收

| 检查项 | 结果 |
| --- | --- |
| 目标 `SalarySlip` 存在 | 1 |
| 目标 `SalarySlip` 已写入目标批次 | 1 |
| 目标 `SalaryNotifyLog` 存在 | 1 |
| 目标 `SalaryNotifyLog` 已写入目标批次 | 1 |
| `SalarySlip` 缺 `publishBatchId` 数 | 0 |
| `SalaryNotifyLog` 缺 `publishBatchId` 数 | 0 |
| 2026-05 `PayrollDraftBatch.publishBatchId` 仍为空 | 1 |

验收结论：

- 历史薪资条和历史通知记录已统一归属到 `salary-publish-2026-05-codex-single-trial`。
- 主方案 B 的历史批次缺口已收口。
- 草稿批次仍未写入 `publishBatchId`，符合本次授权边界。

## 证据文件

| 文件 | 用途 |
| --- | --- |
| `output/payroll/history-publish-batch-backfill-apply-20260618-055925/scheme-b-before-check-result.tsv` | 正式执行前只读核对 |
| `output/payroll/history-publish-batch-backfill-apply-20260618-055925/scheme-b-main-commit.sql` | 正式提交 SQL |
| `output/payroll/history-publish-batch-backfill-apply-20260618-055925/scheme-b-main-commit-result.tsv` | 正式提交结果 |
| `output/payroll/history-publish-batch-backfill-apply-20260618-055925/scheme-b-postcheck-result.tsv` | 正式提交后只读核对 |
| `output/payroll/history-publish-batch-backfill-apply-20260618-055925/payroll-draft-batch-unchanged-check.tsv` | 草稿批次未改核对 |
| `output/payroll/history-publish-batch-backfill-apply-20260618-055925/scheme-b-final-validation.tsv` | 最终汇总核对 |

## 备注

本机 `npm run verify:payroll-db` 在当前环境读取到 `mysql:3306`，该本机地址不可达，因此没有作为本次生产验收依据。本次结果以线上 MySQL 容器的只读 SQL postcheck 和最终汇总核对为准。
