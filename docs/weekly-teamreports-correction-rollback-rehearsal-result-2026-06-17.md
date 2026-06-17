# Weekly teamReports ROLLBACK 事务试跑结果

日期：2026-06-17
状态：`rollback_rehearsal_passed_ready_for_commit_authorization_review`

## 结论

已按用户明确授权执行一次 weekly teamReports `ROLLBACK` 事务试跑。

本次只验证正式修正 SQL 在事务内是否能安全命中目标行，SQL 草案最后一行保持 `ROLLBACK;`，没有执行 `COMMIT`，没有留下生产数据变更。

当前总门禁已刷新为：

`ready_for_commit_authorization_review`

这只表示可以进入第二次真实 `COMMIT` 授权讨论，不代表已经允许写库。

## 执行边界

- 已执行：保留 `ROLLBACK;` 的事务试跑。
- 未执行：`COMMIT`。
- 未部署。
- 未重启。
- 未打 rollback tag。
- 未修改 schema / migration / API / 前端。
- 未执行 payroll migration。

## 试跑结果

| 项目 | 结果 |
| --- | ---: |
| transcript rows | 46 |
| expected operations | 10 |
| operation checks | 30 |
| affectedRows=1 | 10 |
| payload link checks | 3 |
| payload group checks | 3 |
| shared scalar checks | 1 |
| after rollback hard gates | 29 |
| failed checks | 0 |

## 回滚后生产只读门禁

| 门禁 | 当前值 |
| --- | ---: |
| `RosterWeek` | 6 |
| `RosterShift` | 210 |
| orphan `RosterShift` | 0 |
| `WeeklyReportPayload total` | 19 |
| `api_db_first_bridge / IMPORTED` | 13 |
| `legacy_weekly_workspace / IMPORTED` | 3 |
| `legacy_weekly_workspace / NEEDS_REVIEW` | 3 |
| `shared/shared/draft` | 13 |
| distinct `sourceSha16` | 13 |
| `weeklyCorrection.targetPayloadLinks` | 0 |

全局 precheck 结果：

- totalRows：38
- hardGates：29
- observations：9
- mismatches：0
- malformedRows：0
- duplicateCheckNames：0

## 证据文件

- 事务前 precheck：`output/employee-data-migration/2026-06-16/database-100-global-precheck-before-rollback-rehearsal.tsv`
- 事务前 precheck 校验：`output/employee-data-migration/2026-06-16/database-100-global-precheck-before-rollback-rehearsal-verify.json`
- 试跑 transcript：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rollback-rehearsal-transcript.tsv`
- 事务后 precheck：`output/employee-data-migration/2026-06-16/database-100-global-precheck-after-rollback-rehearsal.tsv`
- 事务后 precheck 校验：`output/employee-data-migration/2026-06-16/database-100-global-precheck-after-rollback-rehearsal-verify.json`
- 试跑验收：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rehearsal-verify-result.json`
- 总门禁：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-write-gate-result.json`

## 下一步

如要进入真实写库，必须再次明确授权真实 `COMMIT`。在第二次授权前，继续保持：

- `commitAllowed=false`
- `deploymentAllowed=false`
- 不执行正式写库
- 不部署
- 不重启
- 不打 rollback tag
