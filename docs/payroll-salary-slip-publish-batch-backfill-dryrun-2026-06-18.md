# Payroll 历史 publishBatchId 回填 dry-run 结果

日期：2026-06-18
状态：`scheme_b_main_completed`
证据目录：`output/payroll/history-publish-batch-backfill-dryrun-20260618-055252`

## 结论

已按用户授权准备方案 B dry-run；dry-run 本身没有写生产库。后续用户已明确授权执行主方案 B，正式结果见：

```text
docs/payroll-salary-slip-publish-batch-backfill-result-2026-06-18.md
```

目标批次号：

```text
salary-publish-2026-05-codex-single-trial
```

主方案 B dry-run 范围：

- 更新 1 条历史 `SalarySlip.publishBatchId`。
- 更新 1 条历史 `SalaryNotifyLog.publishBatchId`。
- 不更新 `PayrollDraftBatch`。
- 不发送企业微信通知。
- 不部署。
- 不重启线上服务。
- 不修改 schema。

dry-run 执行结果：

- `SalarySlip` 预期影响行数：1。
- `SalaryNotifyLog` 预期影响行数：1。
- 主 dry-run SQL 以 `ROLLBACK` 结尾。
- dry-run 后再次只读确认，生产中三条相关记录的 `publishBatchId` 仍为空，说明没有留下写入。

## 可选扩展

同月份 `PayrollDraftBatch.publishBatchId` 也为空。已单独生成可选 dry-run：

- `PayrollDraftBatch` 预期影响行数：1。
- 可选 SQL 以 `ROLLBACK` 结尾。
- 该项不包含在主方案 B 写入范围内，若要一起写入，必须在后续生产授权中明确包含 `PayrollDraftBatch`。

## 证据文件

| 文件 | 用途 |
| --- | --- |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/current-salary-slips.tsv` | 方案 B 前 SalarySlip 当前状态 |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/current-salary-notify-logs.tsv` | 方案 B 前 SalaryNotifyLog 当前状态 |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/current-payroll-draft-batches.tsv` | 方案 B 前 PayrollDraftBatch 当前状态 |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/scheme-b-before-check.sql` | 方案 B 只读前置核对 SQL |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/scheme-b-before-check-result.tsv` | 方案 B 只读前置核对结果 |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/scheme-b-main-dry-run.sql` | 主方案 B dry-run SQL，默认 `ROLLBACK` |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/scheme-b-main-dry-run-result.tsv` | 主方案 B dry-run 结果 |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/scheme-b-optional-draft-batch-dry-run.sql` | 可选草稿批次 dry-run SQL，默认 `ROLLBACK` |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/scheme-b-optional-draft-batch-dry-run-result.tsv` | 可选草稿批次 dry-run 结果 |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/after-dry-run-current-state.tsv` | dry-run 后生产当前状态，只读确认 |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/scheme-b-dry-run-result.md` | 方案 B dry-run 总结 |
| `output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/scheme-b-dry-run-result.json` | 方案 B dry-run 机器可读结果 |

## SHA256

主方案 B dry-run SQL：

```text
2ca7e414220f54811398ad2cb47fa03bca94e007a7d0147149858e0ea5d71568
```

可选草稿批次 dry-run SQL：

```text
7cb40d8140697f159b52953560f01b0afb919cb2cec96b1ce1a1d64aa3e1dce5
```

dry-run 总结文件：

```text
output/payroll/history-publish-batch-backfill-dryrun-20260618-055252/scheme-b-dry-run-result.md
```

## 下一步授权边界

主方案 B 已完成真实写入，不包含可选草稿批次。

如果后续仍要把 `PayrollDraftBatch` 也补上 `publishBatchId`，需要新的明确授权。

已使用的主方案 B 授权边界：

```text
授权执行 payroll 历史 publishBatchId 回填：方案 B，仅回填 1 条 SalarySlip 和 1 条 SalaryNotifyLog 的 publishBatchId=salary-publish-2026-05-codex-single-trial，不更新 PayrollDraftBatch，不发送通知，不部署。
```

执行主方案 B，并包含草稿批次：

```text
授权执行 payroll 历史 publishBatchId 回填：方案 B，回填 1 条 SalarySlip、1 条 SalaryNotifyLog 和 1 条 PayrollDraftBatch 的 publishBatchId=salary-publish-2026-05-codex-single-trial，不发送通知，不部署。
```
