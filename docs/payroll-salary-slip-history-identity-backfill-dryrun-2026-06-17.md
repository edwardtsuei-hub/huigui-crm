# Payroll 历史薪资身份回填 dry-run 结果

日期：2026-06-17
状态：`dry_run_completed_scheme_a_applied`
本地证据目录：`output/payroll/history-identity-backfill-dryrun-20260617-232715`

## 结论

本轮先做生产只读导出和本地 dry-run。2026-06-18 已按用户授权完成方案 A 真实回填：只更新 1 条历史 `SalarySlip` 的 `userId / wecomUserId / loginAccount`，不回填 `publishBatchId`，不更新通知记录。

结果：

- 使用者身分索引：24 条。
- 历史薪资条：1 条。
- 历史通知记录：1 条。
- 薪资条身份字段：1 条为 `auto_update_candidate`。
- 人工身份冲突：0 条。
- 通知记录 `publishBatchId` 缺口：1 条。
- 薪资条 `publishBatchId` 缺口：1 条。
- 受影响月份：`2026-05`。
- 发布批次自动推断：无候选，需要人工指定。

身份字段 dry-run 可以为 1 条历史薪资条生成候选更新 SQL；但该 SQL 只用于审查，默认以 `ROLLBACK` 结束，不能直接执行。

旧通知记录和旧薪资条的 `publishBatchId` 仍需要人工确认应归属哪个发布批次；本轮补查 `PayrollDraftBatch` 后，没有找到可自动推断的同月份候选 `publishBatchId`，因此没有生成发布批次写入 SQL。

方案 A 执行包已准备完成，并已执行生产只读 before-check：目标 `SalarySlip` 的 `userId / wecomUserId / loginAccount` 仍为 `NULL`，匹配使用者存在。随后用户已授权方案 A，真实回填已完成。

## 写库状态

- 生产写库：已执行方案 A。
- 历史薪资身份字段回填：已完成 1 条 `SalarySlip`。
- 旧通知记录 `publishBatchId` 回填：未执行。
- 企业微信通知：未发送。
- 部署 / 重启：未执行。

## 证据文件

以下证据文件保留在本机工作区。raw TSV/SQL 含使用者身份、账号或历史通知明细，不纳入 PR；PR 只记录摘要、SHA256 和授权边界。

| 文件 | 用途 |
| --- | --- |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/users.tsv` | 生产只读导出的使用者身分索引 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-slips.tsv` | 生产只读导出的历史薪资条 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-notify-logs.tsv` | 生产只读导出的历史通知记录 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-identity-backfill-plan.json` | 身份字段 dry-run 机器可读计划 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-identity-backfill-plan.md` | 身份字段 dry-run 审查摘要 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-identity-backfill-plan.sql` | 审查用 SQL，默认 `ROLLBACK` |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-identity-backfill-plan.sql.sha256` | SQL SHA256 指纹 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-notify-log-publish-batch-review.json` | 通知记录发布批次缺口审查 JSON |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-notify-log-publish-batch-review.md` | 通知记录发布批次缺口审查摘要 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/payroll-draft-batches.tsv` | 生产只读导出的草稿批次 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/publish-batch-inference-review.json` | 发布批次归属推断 JSON |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/publish-batch-inference-review.md` | 发布批次归属推断摘要 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-execution-package.md` | 方案 A 执行包摘要 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-before-check.sql` | 方案 A 生产只读前置核对 SQL |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-before-check-result.tsv` | 方案 A 生产只读前置核对结果 |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-review-transaction.sql` | 方案 A 审查交易 SQL，默认 `ROLLBACK` |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-guarded-rollback.sql` | 方案 A 条件回滚模板，默认 `ROLLBACK` |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-postcheck.sql` | 方案 A 授权写入后的只读验收 SQL |
| `output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-execution-manifest.json` | 方案 A 执行包 manifest |
| `output/payroll/history-identity-backfill-scheme-a-apply-20260618-053755/scheme-a-apply-result.md` | 方案 A 真实执行结果摘要 |
| `docs/payroll-salary-slip-history-backfill-result-2026-06-18.md` | 方案 A 结果文档 |

SQL SHA256：

```text
c0ebb809bf4253e2067b3e87b7a2c390c88dc3618dba74167d0f270f29c62ca0
```

方案 A before-check 结果 SHA256：

```text
92b9c932856a10932a2706f5161676940a1aa2f64b2fb9f98da8d2eda18a1c23
```

## 人工复核要求

方案 A 身份字段已回填完成。任何后续 `publishBatchId` 真实回填前，必须人工确认：

- `2026-05` 缺失的薪资条 `publishBatchId` 应补成哪个发布批次；当前无自动候选。
- `2026-05` 缺失的通知记录 `publishBatchId` 应补成哪个发布批次；当前无自动候选。
- 是否需要先在 staging / 测试库执行 `publishBatchId` SQL 并重新跑 payroll DB verify。

## 下一步授权边界

如要进入真实回填，必须另行授权，且授权范围应明确区分：

1. 是否允许回填历史薪资条 `publishBatchId`。
2. 是否允许回填历史通知记录 `publishBatchId`。
3. `2026-05` 应使用哪个目标 `publishBatchId`。
4. 是否要求先执行 staging 写入演练。

在上述授权前，当前状态只能视为 dry-run 完成，不能视为历史数据回填完成。
