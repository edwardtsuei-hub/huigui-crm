# Payroll 历史回填授权评审单

日期：2026-06-17
状态：`awaiting_user_authorization`
依据：`docs/payroll-salary-slip-history-identity-backfill-dryrun-2026-06-17.md`

## 背景

生产 schema migration 已完成，字段和索引已存在。后续只读 postcheck 发现历史旧数据仍有缺口：

- 1 条历史薪资条缺少身份字段。
- 1 条历史薪资条缺少 `publishBatchId`。
- 1 条历史通知记录缺少 `publishBatchId`。

本轮已完成只读导出和本地 dry-run，没有写生产库。

## Dry-run 结果

| 项目 | 结果 |
| --- | --- |
| 使用者身分索引 | 24 条 |
| 历史薪资条 | 1 条 |
| 历史通知记录 | 1 条 |
| 草稿批次 | 1 条 |
| 身份字段候选 | 1 条 `auto_update_candidate` |
| 身份人工冲突 | 0 条 |
| 受影响月份 | `2026-05` |
| `publishBatchId` 自动候选 | 无 |
| 生产写库 | 未执行 |

审查 SQL：

- 文件：`output/payroll/history-identity-backfill-dryrun-20260617-232715/salary-identity-backfill-plan.sql`
- 默认结尾：`ROLLBACK`
- SHA256：`c0ebb809bf4253e2067b3e87b7a2c390c88dc3618dba74167d0f270f29c62ca0`

方案 A 执行包：

- 文件：`output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-execution-package.md`
- before-check：已执行生产只读核对，目标薪资条三项身份字段仍为 `NULL`，匹配使用者存在。
- before-check 结果：`output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-before-check-result.tsv`
- before-check SHA256：`92b9c932856a10932a2706f5161676940a1aa2f64b2fb9f98da8d2eda18a1c23`
- review transaction：`output/payroll/history-identity-backfill-dryrun-20260617-232715/scheme-a-review-transaction.sql`，默认结尾仍为 `ROLLBACK`

## 可授权范围

### 方案 A：仅回填历史薪资条身份字段

范围：

- 只更新 1 条历史 `SalarySlip` 的 `userId / wecomUserId / loginAccount`。
- 不更新 `publishBatchId`。
- 不更新 `SalaryNotifyLog`。

优点：

- 已有 dry-run 唯一候选。
- 没有身份冲突。
- 不需要猜测 `2026-05` 的发布批次。
- 已完成生产只读 before-check，确认目标记录仍符合回填前置条件。

限制：

- `publishBatchId` warning 会继续存在。
- 旧通知记录仍无法按发布批次追溯。

### 方案 B：先人工指定 `2026-05` publishBatchId，再回填薪资条和通知记录批次

范围：

- 需要用户或业务负责人明确提供 `2026-05` 应补的 `publishBatchId`。
- 生成新的 dry-run SQL 后再复核。
- 可选择同时回填旧 `SalarySlip.publishBatchId` 和旧 `SalaryNotifyLog.publishBatchId`。

限制：

- 当前没有可自动推断的候选批次，不能由脚本自行决定。
- 必须先重新生成 SQL 和 SHA256。

### 方案 C：暂不回填

范围：

- 保持现状。
- 只保留 dry-run 证据。

限制：

- 生产 postcheck 仍会保留历史 warning。

## 不在本授权范围

- 不发送企业微信通知。
- 不修改员工端前端。
- 不部署。
- 不重启线上服务。
- 不修改 schema。
- 不对非 payroll 历史数据做回填。

## 建议

优先选择方案 A，先补唯一可确认的身份字段。`publishBatchId` 需要业务确认 `2026-05` 的真实发布批次后，再走方案 B 的新 dry-run 和授权。

当前已具备方案 A 的审查执行包，但仍没有生产写库授权。

## 授权口径

如同意方案 A，请明确回复：

```text
授权执行 payroll 历史薪资身份字段回填：方案 A，仅回填 1 条 SalarySlip 的 userId / wecomUserId / loginAccount，不回填 publishBatchId，不更新通知记录。
```

如同意方案 B，请明确回复，并补充 `2026-05` 的目标 `publishBatchId`：

```text
授权准备 payroll 历史 publishBatchId 回填 dry-run：方案 B，2026-05 publishBatchId=<目标批次号>，先生成 SQL 和 SHA256，不直接写生产。
```

如暂不回填，请明确回复：

```text
暂不执行 payroll 历史回填，保留 dry-run 证据。
```
