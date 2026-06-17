# Weekly teamReports 修正事务试跑输出验收器

日期：2026-06-17
状态：`verifier_ready_not_executed`

## 目标

在正式执行任何真实写库前，为下一步 `ROLLBACK` 事务试跑补齐机器验收工具。

本轮新增：

- `scripts/migrations/employee-data/weekly-teamreports-correction-rehearsal-verify.mjs`
- `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rehearsal-verify-result.json`
- `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rehearsal-verify-result.md`

## 安全边界

- 只解析已捕获的 MySQL `-N -B` TSV 输出。
- 不连接数据库。
- 不执行 SQL。
- 不写生产数据库。
- 不生成生产 SQL。
- 不修改 schema、migration、API、前端或业务代码。
- 不部署、不重启、不打 rollback tag。
- 不授权 `ROLLBACK` 事务试跑，也不授权真实 `COMMIT`。

## 验收范围

验收器用于解析未来执行 `weekly-teamreports-correction-apply-draft.sql` 的输出。

必须同时满足：

| 检查项 | 要求 |
| --- | --- |
| apply precheck | 10 条操作全部命中 before SHA |
| affectedRows | 10 条 `ROW_COUNT()` 全部为 `1` |
| apply postcheck | 10 条操作全部命中 after SHA |
| direct payload link | 3 条目标周报在更新前后都为 `0` |
| payload 分组 | `api_db_first_bridge / IMPORTED = 13`，`legacy / IMPORTED = 3`，`legacy / NEEDS_REVIEW = 3` |
| shared/shared | draft count 与 distinct `sourceSha16` 都保持 `13` |
| rollback 后 precheck | `database-100-global-precheck` 的所有 hard gate 全部匹配 |

任一条件失败，验收器返回 `blocked`，退出码为 `2`。

## 使用方式

授权执行 `ROLLBACK` 事务试跑后，建议将 MySQL 输出保存为 TSV：

```bash
mysql --default-character-set=utf8mb4 -N -B < weekly-teamreports-correction-apply-draft.sql \
  > /tmp/weekly-teamreports-correction-apply-rehearsal.tsv
```

事务试跑结束后，再重新跑一次全局只读 precheck：

```bash
mysql --default-character-set=utf8mb4 -N -B < database-100-global-precheck.sql \
  > /tmp/database-100-global-precheck-after-rehearsal.tsv
```

然后执行验收器：

```bash
node scripts/migrations/employee-data/weekly-teamreports-correction-rehearsal-verify.mjs \
  --input /tmp/weekly-teamreports-correction-apply-rehearsal.tsv \
  --plan output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-draft.json \
  --after-rollback-precheck /tmp/database-100-global-precheck-after-rehearsal.tsv
```

## 当前验证

由于用户尚未授权执行 `ROLLBACK` 事务试跑，本轮没有生产执行输出。

因此当前只做工具验证：

1. 使用按计划 JSON 生成的合成成功 transcript。
2. 使用现有 `database-100-global-precheck.tsv` 作为 rollback 后 hard gate 输入。
3. 确认验收器返回 `passed`。
4. 将其中一条 `affectedRows` 改为 `0` 做反向烟测。
5. 确认验收器返回 `blocked`，退出码为 `2`。

当前成功验证摘要：

| 指标 | 值 |
| --- | ---: |
| transcriptRows | 46 |
| expectedOperations | 10 |
| operationChecks | 30 |
| payloadLinkChecks | 3 |
| payloadGroupChecks | 3 |
| sharedScalarChecks | 1 |
| afterRollbackPrecheckProvided | true |
| afterRollbackPrecheckHardGates | 29 |
| failedChecks | 0 |

## 下一步位置

这个验收器应放在以下门禁顺序中：

1. SQL 静态守卫：确认草案仍是 `ROLLBACK` only、无 `COMMIT`。
2. 用户明确授权 `ROLLBACK` 事务试跑。
3. 执行 apply draft，保留末尾 `ROLLBACK;`。
4. 重新跑全局只读 precheck。
5. 使用本验收器解析事务试跑输出与 rollback 后 precheck。
6. 只有验收器 `passed` 后，才允许进入人工决策是否申请第二次真实 `COMMIT` 授权。

## 当前结论

事务试跑输出验收器已准备好，可作为下一步 `ROLLBACK` 事务试跑后的必要验收工具之一。

当前仍保持：

- `deploymentAllowed=false`
- 不写数据库
- 不部署
- 不重启
- 不打 rollback tag
