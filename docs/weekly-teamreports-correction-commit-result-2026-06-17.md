# Weekly teamReports 真实 COMMIT 结果

日期：2026-06-17
状态：`committed_postcheck_passed`

## 结论

已按用户第二次明确授权执行 weekly teamReports 真实 `COMMIT`。

本次执行只基于已经通过 ROLLBACK 事务试跑的 apply draft，并且只把临时执行文件最后一行从 `ROLLBACK;` 改为 `COMMIT;`。没有修改原始 ROLLBACK 草案。

执行后生产库 postcheck 通过，数据库 100 全局 precheck 已更新为周报修正后的 final SHA 口径，并重新通过 0 mismatch 验收。

## 执行边界

- 已执行：weekly teamReports 修正真实 `COMMIT`。
- 未部署。
- 未重启。
- 未打 rollback tag。
- 未修改 schema / migration / API / 前端。
- 未执行 payroll migration。

## 写入结果

| 项目 | 结果 |
| --- | ---: |
| transcript rows | 46 |
| apply precheck matches | 10 |
| affectedRows=1 | 10 |
| apply postcheck matches | 10 |
| post-commit global precheck rows | 38 |
| post-commit hard gates | 29 |
| post-commit mismatches | 0 |

## 提交后生产门禁

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
| weekly final SHA checks | 12 |

## 证据文件

- COMMIT 前 precheck：`output/employee-data-migration/2026-06-16/database-100-global-precheck-before-commit.tsv`
- COMMIT transcript：`output/employee-data-migration/2026-06-16/weekly-teamreports-correction-commit-transcript.tsv`
- 旧 before-SHA baseline 验证：`output/employee-data-migration/2026-06-16/database-100-global-precheck-after-commit-old-baseline-verify.json`
- final-SHA postcheck：`output/employee-data-migration/2026-06-16/database-100-global-precheck-after-commit-verify.json`
- 当前全局 precheck：`output/employee-data-migration/2026-06-16/database-100-global-precheck.sql`

## 当前状态

weekly teamReports 修正链路已完成真实写入并通过提交后校验。

仍需继续独立推进：

- payroll migration 测试库 / 生产窗口。
- `EmployeeLaunchEvidenceArchive` schema 设计和迁移窗口。
- B 线 Vite 源码恢复后再做前端修复。
- D 线发布判断仍需独立只读门禁，不因本次数据 COMMIT 自动放行部署。
