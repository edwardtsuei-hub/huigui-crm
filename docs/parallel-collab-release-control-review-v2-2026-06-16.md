# 大爱归心 D 线：发布、回滚与验收总控复核刷新 v2

日期：2026-06-16
工作流：D，发布、回滚与验收总控复核刷新
当前状态：`ready_for_readonly_release_check`

## 结论

本次基于最新事实重新复核。上一版因 `docs/parallel-collab-api-db-first-2026-06-16.md` 缺失而给出的 `blocked` 结论已刷新：A 线交接文档已经补齐，且 A 线 verification 记录显示线上 API DB-first 已核实、API 文件指纹与服务器一致、`/api/health` 正常。

新的门禁结论是：可以进入 D 线只读发布前检查，但不得直接允许部署。原因是 `WeeklyReportPayload` 已从迁移完成时的 6 条增长为 19 条，其中 `api_db_first_bridge / IMPORTED` 新增 13 条，均为 `sourceUserKey=shared`、`canonicalUserKey=shared`、`reportState=draft`，且 distinct `sourceSha16=13`。该 shared/shared payload 增长需要继续监控和复核。

本次未部署、未重启服务、未写生产数据库、未改 API/前端/schema 业务代码、未读取或打印 `.env` 明文。

## 已读取文件

- `docs/parallel-collaboration-control-2026-06-16.md`
- `docs/employee-data-production-migration-record-2026-06-16.md`
- `docs/parallel-collab-release-control-2026-06-16.md`
- `docs/parallel-collab-api-db-first-2026-06-16.md`
- `docs/parallel-collab-a-line-verification-2026-06-16.md`

## A 线交接状态刷新

| 检查项 | 旧结论 | 最新事实 | v2 结论 |
| --- | --- | --- | --- |
| API DB-first 交接文档 | 缺失，blocked | `docs/parallel-collab-api-db-first-2026-06-16.md` 已存在 | 不再因文档缺失 blocked |
| A 线上线状态 | 未能确认 | A 线 verification 记录显示已上线，服务器存在交接文档 | 已具备只读发布前检查入口 |
| API 文件指纹 | 未确认 | service/controller 指纹与服务器一致 | 通过 |
| Health | 未确认 | `/api/health` 正常 | 通过 |

## 最新生产计数基线

### 班表基线

| 指标 | 最新值 | 发布前检查建议 |
| --- | ---: | --- |
| `RosterWeek` | 6 | 继续作为硬性基线 |
| `RosterShift` | 210 | 继续作为硬性基线 |
| orphan `RosterShift` | 0 | 继续作为硬性基线 |

### 周报 payload 基线

`WeeklyReportPayload` 不应再以总数 `6` 作为硬性发布基线。应改为按 `source / migrationStatus` 分组验收：

| source | migrationStatus | 数量 | 判断 |
| --- | --- | ---: | --- |
| `legacy_weekly_workspace` | `IMPORTED` | 3 | 迁移基线，需保持 |
| `legacy_weekly_workspace` | `NEEDS_REVIEW` | 3 | 迁移基线，需保持 |
| `api_db_first_bridge` | `IMPORTED` | 13 | 新增风险项，需监控增长 |

额外风险分布：

| sourceUserKey | canonicalUserKey | reportState | source | migrationStatus | 数量 | distinct sourceSha16 |
| --- | --- | --- | --- | --- | ---: | ---: |
| `shared` | `shared` | `draft` | `api_db_first_bridge` | `IMPORTED` | 13 | 13 |

## Runbook 建议更新

### 1. 发布门禁

当前不再是 `blocked`，但也不能直接部署。建议 runbook 使用两段式门禁：

- `ready_for_readonly_release_check`：A 线交接文档已补齐，可以执行只读发布前检查。
- `deployment_allowed=false`：shared/shared payload 风险未闭环前，不直接进入部署。

### 2. WeeklyReportPayload 验收方式

旧 runbook 中以下位置应更新：

- 生产基线表中 `WeeklyReportPayload=6` 的硬性描述。
- 发布前数据库只读计数中的总数等于 6 的判断。
- 发布后 P0 数据基线中 `WeeklyReportPayload=6` 的判断。
- 回滚后验收中 `WeeklyReportPayload=6` 的判断。
- P1 中 “周报 workspace GET 能读取 `WeeklyReportPayload` 中的 6 条 payload” 的表述。

建议改为：

```sql
SELECT source, migrationStatus, COUNT(*) AS count
FROM WeeklyReportPayload
GROUP BY source, migrationStatus
ORDER BY source, migrationStatus;
```

同时增加 shared/shared 风险监控：

```sql
SELECT sourceUserKey, canonicalUserKey, reportState, source, migrationStatus,
       COUNT(*) AS count,
       COUNT(DISTINCT sourceSha16) AS distinctSourceSha16
FROM WeeklyReportPayload
GROUP BY sourceUserKey, canonicalUserKey, reportState, source, migrationStatus
ORDER BY count DESC;
```

验收规则：

- `legacy_weekly_workspace / IMPORTED = 3` 必须保持。
- `legacy_weekly_workspace / NEEDS_REVIEW = 3` 必须保持。
- `RosterWeek=6`、`RosterShift=210`、orphan `RosterShift=0` 必须保持。
- `api_db_first_bridge / shared/shared/draft` 不得在只读窗口内继续异常增长。
- 若 shared/shared payload 在没有明确写入操作的情况下继续增长，应暂停发布判断并交给 A/D 复核幂等键和写入触发条件。

### 3. docker compose 与 .env 权限

runbook 仍可保留 `docker compose ps` / `docker compose logs` 作为常规命令，但应补充只读 fallback。历史复核中生产 `.env` 权限可能阻断 compose 读取，fallback 建议：

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker inspect huigui-api --format '{{.Image}} {{json .State}}'
docker logs --tail=200 huigui-api
```

数据库只读计数也可在 compose 受阻时使用容器环境变量，不读取 `.env` 明文：

```bash
docker exec huigui-mysql sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -N -B -e "SELECT 1;"'
```

### 4. rollback tag 动作分类

旧 runbook 中 “建议将当前 API 镜像打只读回滚标签” 涉及：

```bash
docker tag "$PRE_API_IMAGE" "$ROLLBACK_TAG"
```

该命令会写入 Docker 本地镜像标签，不属于纯只读检查。建议标记为：

- 需要用户确认。
- 仅在进入发布准备且需要镜像级回滚锚点时执行。
- 不应放入 “只读复核” 默认步骤。

## 当前风险点

`api_db_first_bridge` 产生 13 条 shared/shared draft payload，且 distinct `sourceSha16=13`。这可能说明 shared workspace 的保存或同步路径正在产生非幂等 payload。当前不能直接判定为故障，但必须作为发布前监控项。

发布前至少应再次只读复核：

1. `WeeklyReportPayload` 按 `source / migrationStatus` 分组是否仍为 `legacy 3/3 + bridge 13`。
2. shared/shared draft payload 数量是否仍为 13。
3. distinct `sourceSha16` 是否仍为 13。
4. 若发生增长，记录触发时间和相关 API 日志，不执行写入演练。

## 发布决策

- A 文档缺失阻断：已解除。
- runbook 进入发布前只读检查：允许。
- 直接部署：不允许。
- 当前状态：`ready_for_readonly_release_check`。
- 解除下一道门槛的条件：shared/shared payload 增长风险被解释清楚，或至少确认在只读窗口内不再增长，并由用户明确批准进入部署。

## 本次改动文件

- `docs/parallel-collab-release-control-review-v2-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-release-control-review-v2.json`

## 停止点

D 线 release-control 复核刷新已完成。下一步只允许进入发布前只读检查和 shared/shared payload 监控；不得直接部署、重启、写库或执行 rollback tag，除非用户明确确认。
