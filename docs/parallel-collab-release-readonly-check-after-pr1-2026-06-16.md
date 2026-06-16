# 大爱归心 D 线：PR #1 合并后只读发布前检查

日期：2026-06-16
工作流：D，发布、回滚与验收总控
状态：`ready_for_release_decision_with_gate`

## 结论

PR #1 合并到 main 后，本次只读发布前检查通过；`shared/shared` draft payload 未继续增长。

当前仍保持发布门禁：`deploymentAllowed=false`。本次未部署、未重启、未打 rollback tag、未写生产数据库、未改 API/前端/schema。

## 检查时间

- 远端检查时间：2026-06-16T22:56:55+08:00
- 本地记录时间：2026-06-16T22:57:09+08:00

## 运行态检查

| 检查项 | 结果 |
| --- | --- |
| `/api/health` | HTTP 200 |
| health body | `{\"status\":\"ok\",\"service\":\"huigui-api\",\"timestamp\":\"2026-06-16T14:56:55.511Z\"}` |
| `huigui-api` | Up 5 hours |
| `huigui-app` | Up 8 hours |
| `huigui-nginx` | Up 2 days |
| `huigui-mysql` | Up 3 weeks, healthy |

## DB 计数

| 指标 | 当前值 | 目标值 | 结果 |
| --- | ---: | ---: | --- |
| `RosterWeek` | 6 | 6 | 通过 |
| `RosterShift` | 210 | 210 | 通过 |
| orphan `RosterShift` | 0 | 0 | 通过 |
| `WeeklyReportPayload` total | 19 | 记录值 | 通过 |

## WeeklyReportPayload 分组

| source | migrationStatus | count |
| --- | --- | ---: |
| `api_db_first_bridge` | `IMPORTED` | 13 |
| `legacy_weekly_workspace` | `IMPORTED` | 3 |
| `legacy_weekly_workspace` | `NEEDS_REVIEW` | 3 |

## shared/shared 风险项

| sourceUserKey | canonicalUserKey | reportState | source | migrationStatus | count | distinct sourceSha16 |
| --- | --- | --- | --- | --- | ---: | ---: |
| `shared` | `shared` | `draft` | `api_db_first_bridge` | `IMPORTED` | 13 | 13 |

判断：

- `shared/shared draft` 数量仍为 13。
- distinct `sourceSha16` 仍为 13。
- 相比 v2 门禁基线未增长。
- 未触发 shared/shared 增长阻断。

## 发布门禁

- `releaseGateStatus`: `ready_for_release_decision_with_gate`
- `deploymentAllowed`: `false`
- 原因：本次只读检查通过，但 D 线仍按门禁保持“不得自动部署”。如需进入发布，必须由用户显式确认。

## 本次执行边界

- 未部署。
- 未重启服务。
- 未打 rollback tag。
- 未写生产数据库。
- 未改 API / 前端 / schema。
- 未读取或打印 `.env` 明文。

## 输出文件

- `docs/parallel-collab-release-readonly-check-after-pr1-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-release-readonly-check-after-pr1.json`

## 停止点

PR #1 合并后的只读发布前检查已完成。D 线继续保持发布门禁，等待主线或用户明确发布决策。
