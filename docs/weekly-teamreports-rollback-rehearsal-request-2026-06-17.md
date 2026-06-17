# Weekly teamReports ROLLBACK 事务试跑授权请求包

生成时间：2026-06-17T13:35:46.179Z
状态：`ready_to_request_explicit_rollback_rehearsal_authorization`

## 结论

当前门禁允许向用户请求下一步明确授权，但本文件本身不授权执行 SQL。

如要进入下一步，用户需要明确说出：

`授权执行 weekly teamReports ROLLBACK 事务试跑`

这只代表允许执行保留 `ROLLBACK;` 的事务试跑，不代表允许 `COMMIT`。

## 当前门禁

| 项目 | 值 |
| --- | --- |
| canRequestRollbackRehearsalAuthorization | `true` |
| rollbackRehearsalAuthorizedByThisArtifact | `false` |
| commitAllowed | `false` |
| deploymentAllowed | `false` |
| productionWriteAllowed | `false` |

## 演练计划

- 重新执行全局只读 precheck。
- 重新执行 SQL 静态守卫。
- 在事务中执行 apply draft，但必须保留最后的 `ROLLBACK;`。
- 捕获试跑输出并用 rehearsal verifier 解析。
- 回滚后再次执行只读 precheck，证明生产数据回到 before SHA。

## 通过标准

- before SHA 全部吻合：12
- 目标周报 direct payload links：0
- apply affectedRows：10
- apply postcheck after SHA：10
- ROLLBACK 后 before SHA 再次吻合：12
- shared/shared draft：13
- distinct sourceSha16：13

## 仍然禁止

- COMMIT
- production write execution
- deployment
- restart
- rollback tag
- schema change
- migration
- API change
- frontend change
- mixing payroll/schema unrelated work into this lane

## 检查摘要

| 检查 | 结果 |
| --- | --- |
| globalPrecheck.status | `passed` |
| globalPrecheck.mismatches | `passed` |
| sqlGuard.status | `passed` |
| writeGate.status | `passed` |
| writeGate.noCommitOrDeployment | `passed` |
| authorization.status | `passed` |
| authorization.noExecutionYet | `passed` |

## 输入文件

- globalPrecheck: `output/employee-data-migration/2026-06-16/database-100-global-precheck-verify-result.json`
- sqlGuard: `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-guard-result.json`
- writeGate: `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-write-gate-result.json`
- authorization: `output/employee-data-migration/2026-06-16/weekly-teamreports-correction-execution-authorization.json`

## 安全声明

本文件和生成器只读取 JSON 产物并写出授权请求包，不连接数据库、不执行 SQL、不写生产库、不部署、不重启、不打 rollback tag。

