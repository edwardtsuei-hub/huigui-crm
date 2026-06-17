# Payroll 历史薪资身份字段回填结果

日期：2026-06-18
状态：`scheme_a_completed_with_warnings`
执行证据目录：`output/payroll/history-identity-backfill-scheme-a-apply-20260618-053755`

## 结论

已按用户明确授权执行方案 A：

- 只回填 1 条历史 `SalarySlip` 的 `userId / wecomUserId / loginAccount`。
- 未回填 `publishBatchId`。
- 未更新 `SalaryNotifyLog`。
- 未发送企业微信通知。
- 未部署。
- 未重启线上服务。
- 未修改 schema。

本次生产写入影响行数：1。

## 授权范围

用户授权原文：

```text
授权执行 payroll 历史薪资身份字段回填：方案 A，仅回填 1 条 SalarySlip 的 userId / wecomUserId / loginAccount，不回填 publishBatchId，不更新通知记录。
```

实际执行范围与授权一致。

## 执行前核对

执行前只读 before-check 通过：

- 目标 `SalarySlip` 存在。
- `userId / wecomUserId / loginAccount` 仍为空。
- 匹配使用者存在。
- before-check 结果 SHA256：`92b9c932856a10932a2706f5161676940a1aa2f64b2fb9f98da8d2eda18a1c23`。

## 执行结果

授权执行 SQL：

- 文件：`output/payroll/history-identity-backfill-scheme-a-apply-20260618-053755/scheme-a-authorized-commit.sql`
- SHA256：`2389654fbad61008972f75f1c60a8c77ffe9b26008caa3e48e04206357ffd970`

执行结果：

- `affected_rows=1`
- 更新后目标 `SalarySlip` 已写入 `userId / wecomUserId / loginAccount`
- 目标 `SalarySlip.publishBatchId` 仍为空

## 验证结果

方案 A postcheck：

- `target_rows=1`
- `expected_identity_rows=1`
- `still_missing_publish_batch_id_rows=1`

Payroll DB verify：

- 状态：`passed_with_warnings`
- blockers：0
- failures：0
- warnings：`salary_slips_missing_publish_batch_id`
- incomplete salary identities：0
- missing publish batch ids：1

Database 100 global precheck：

- 状态：`passed`
- total rows：38
- hard gates：29
- observations：9
- mismatches：0
- malformed rows：0
- duplicate check names：0

## 证据文件

| 文件 | 用途 |
| --- | --- |
| `output/payroll/history-identity-backfill-scheme-a-apply-20260618-053755/before-check.tsv` | 执行前只读核对 |
| `output/payroll/history-identity-backfill-scheme-a-apply-20260618-053755/scheme-a-authorized-commit.sql` | 授权执行 SQL |
| `output/payroll/history-identity-backfill-scheme-a-apply-20260618-053755/apply-result.tsv` | 执行结果 |
| `output/payroll/history-identity-backfill-scheme-a-apply-20260618-053755/postcheck.tsv` | 方案 A postcheck |
| `output/payroll/history-identity-backfill-scheme-a-apply-20260618-053755/payroll-postcheck-after-scheme-a.md` | Payroll DB verify 结果 |
| `output/payroll/history-identity-backfill-scheme-a-apply-20260618-053755/database-100-global-precheck-after-scheme-a-verify.md` | Database 100 验证结果 |
| `output/payroll/history-identity-backfill-scheme-a-apply-20260618-053755/scheme-a-apply-result.md` | 本次执行包结果摘要 |

## 剩余事项

1. `2026-05` 的 `publishBatchId` 仍无自动候选，不能自动回填。
2. 旧 `SalarySlip.publishBatchId` 和旧 `SalaryNotifyLog.publishBatchId` 如需回填，必须先由业务人工指定目标批次。
3. 任何 `publishBatchId` 回填都需要新的 dry-run、SQL SHA256 和单独授权。
