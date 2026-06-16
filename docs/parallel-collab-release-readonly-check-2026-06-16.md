# 大爱归心 D 线：只读发布前复核记录

日期：2026-06-16
执行时间：2026-06-16 19:33:04 CST
工作流：D，发布、回滚与验收总控
状态：`readonly_check_passed_with_shared_monitoring`

## 结论

本轮已完成一次只读发布前复核。A 线交接文档仍存在，线上 `/api/health` 正常，班表硬基线保持不变，`WeeklyReportPayload` 分组计数与 D v2 记录一致，`shared/shared` bridge payload 未继续增长。

这只解除“能不能做只读发布前检查”的问题，不等于可以直接部署。当前仍不允许自动部署、重启、写库、回滚或创建 Docker rollback tag。

## 本轮边界

- 未部署。
- 未重启服务。
- 未写生产数据库。
- 未改 API、前端或 schema。
- 未读取或打印 `.env` 明文。
- 未创建 Docker rollback tag。
- 数据库检查通过 `huigui-mysql` 容器环境变量执行。

## 只读检查结果

| 项目 | 结果 |
| --- | --- |
| 服务器时间 | `2026-06-16 19:33:04 CST` |
| Git HEAD | `573e3da91614fcb7d0da6b32c971db290a7fa2c1` |
| A 线交接文档 | `present` |
| API health | `{"status":"ok","service":"huigui-api"}` |
| API image | `sha256:4806488c135889ce4dd622f83b60ba788e876564d8d128ca85510a32ac2ea1e0` |

容器状态：

| 容器 | 状态 |
| --- | --- |
| `huigui-api` | Up About an hour |
| `huigui-app` | Up 5 hours |
| `huigui-nginx` | Up 2 days |
| `huigui-mysql` | Up 3 weeks, healthy |

API 文件指纹：

| 文件 | SHA256 |
| --- | --- |
| `apps/api/src/employee-launch/employee-launch.service.ts` | `c07e0845d3e5daf464d489041f1ad009cdd652cd5d94f5c4707ba8958c6310e7` |
| `apps/api/src/employee-launch/employee-launch.controller.ts` | `90314cdfa46c22ebf5714d1e1ca090aa58a0674d8f2a41259adea1efcb5089bf` |

## 数据库只读计数

| 指标 | 当前值 | 判断 |
| --- | ---: | --- |
| `RosterWeek` | 6 | 通过 |
| `RosterShift` | 210 | 通过 |
| orphan `RosterShift` | 0 | 通过 |
| `WeeklyReportPayload` | 19 | 仅作当前总量记录，不作为旧硬基线 |

`WeeklyReportPayload` 分组：

| source | migrationStatus | 数量 | 判断 |
| --- | --- | ---: | --- |
| `api_db_first_bridge` | `IMPORTED` | 13 | 与 D v2 一致，继续监控 |
| `legacy_weekly_workspace` | `IMPORTED` | 3 | 通过 |
| `legacy_weekly_workspace` | `NEEDS_REVIEW` | 3 | 通过 |

`shared/shared` 风险分布：

| sourceUserKey | canonicalUserKey | reportState | source | migrationStatus | count | distinctSourceSha16 |
| --- | --- | --- | --- | --- | ---: | ---: |
| `shared` | `shared` | `draft` | `api_db_first_bridge` | `IMPORTED` | 13 | 13 |

结论：`shared/shared` bridge payload 相比 D v2 没有继续增长，但该幂等风险仍未解释清楚，所以只允许继续监控，不允许直接进入部署。

## Git 工作树观察

生产服务器 `git status --short` 仍显示大量历史 modified / untracked 文件。针对 A 线重点文件的 tracked diff 为空，但 `apps/api/src/employee-launch/` 在服务器 Git 状态中属于未跟踪目录，并包含多份历史备份文件。

因此：

- 不能把服务器 Git 工作树视为干净发布源。
- A 线状态仍应以交接文档、API 文件指纹、容器健康和只读数据验收为证据。
- 若后续真的要发布，应先明确采用哪个 release artifact / commit / 镜像，不应从当前脏工作树直接扩大部署。

## 发布判断

- `readonlyCheckAllowed=true`
- `readonlyCheckPassed=true`
- `deploymentAllowed=false`
- `rollbackAllowed=false`
- `rollbackTagAllowed=false`

## 停止点

D 线只读发布前检查已完成。本轮可以停止在“证据已刷新，数据未继续漂移”的状态。

下一步只建议做两类事：

1. 把本地 D 线 runbook 和本复核记录提交同步。
2. 继续推进 B 线 halfDay 前端显示修复方案或 C 线归档 schema 草案；任何生产发布动作仍需用户明确确认。
