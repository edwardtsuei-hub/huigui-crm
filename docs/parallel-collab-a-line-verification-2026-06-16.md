# A 线 DB-first 核实记录

日期：2026-06-16
执行时间：2026-06-16 19:05:58 CST
范围：只读核实 A 线 API DB-first 交接、代码指纹、线上健康状态和生产计数。
状态：`verified_with_followup_risk`

## 结论

A 线已完成并上线。服务器存在交接文档 `/opt/huigui-crm/docs/parallel-collab-api-db-first-2026-06-16.md`，本地 API 文件指纹与服务器上线后指纹一致，线上 `/api/health` 正常。

同时发现一个需要继续复核的风险点：`WeeklyReportPayload` 当前已从生产迁移完成时的 6 条增长为 19 条，其中新增的 13 条来自 `api_db_first_bridge`，且都是 `sourceUserKey=shared`、`canonicalUserKey=shared`、`reportState=draft`。这说明 A 线写桥已经生效，但 shared workspace 可能在反复生成不同 payload，需要 A/D 后续确认是否符合预期。

## 已核实事项

### 1. 交接文档

远端文档存在：

```text
/opt/huigui-crm/docs/parallel-collab-api-db-first-2026-06-16.md
```

文档结论为：

- 班表、周报 workspace 的线上 API 已改成 DB-first 读写桥。
- 外部接口路径保持不变。
- 优先读写 MySQL 新表，旧 JSON workspace 作为兼容和 fallback。
- 可通过 `EMPLOYEE_DATA_DB_BRIDGE_MODE=json-only` 或 `EMPLOYEE_DATA_DB_BRIDGE_DISABLED=1` 切回 JSON-only。

本轮已将该远端交接文档同步回本地：

```text
docs/parallel-collab-api-db-first-2026-06-16.md
```

### 2. API 文件指纹

本地文件 SHA256：

| 文件 | SHA256 |
| --- | --- |
| `apps/api/src/employee-launch/employee-launch.service.ts` | `c07e0845d3e5daf464d489041f1ad009cdd652cd5d94f5c4707ba8958c6310e7` |
| `apps/api/src/employee-launch/employee-launch.controller.ts` | `90314cdfa46c22ebf5714d1e1ca090aa58a0674d8f2a41259adea1efcb5089bf` |

服务器同路径文件 SHA256 与本地一致，也与 A 线交接文档记录一致。

### 3. 代码实现证据

本地 `employee-launch.service.ts` 已包含：

- `buildRosterWorkspaceDbFirst`
- `mergeRosterDbRowsIntoWorkspace`
- `upsertRosterWorkspaceToDb`
- `upsertRosterSnapshotToDb`
- `upsertRosterSnapshotShiftsToDb`
- `readWeeklyPayloadFromDb`
- `upsertWeeklyPayloadFromRecord`

关键行为：

- 班表 GET 查询 `RosterWeek`，聚合成旧 workspace 结构，并写入 `meta.persistence = "db-first"`。
- 班表 PATCH upsert `RosterWeek` / `RosterShift`，同时保留旧 JSON 写入。
- 周报 GET 优先查询 `WeeklyReportPayload`，缺数据时 fallback 到旧 JSON。
- 周报写入路径同步 upsert `WeeklyReportPayload`。

### 4. 线上服务状态

线上健康检查：

```json
{"status":"ok","service":"huigui-api"}
```

容器状态摘要：

| 容器 | 状态 |
| --- | --- |
| `huigui-api` | Up 42 minutes |
| `huigui-app` | Up 4 hours |
| `huigui-nginx` | Up 2 days |
| `huigui-mysql` | Up 3 weeks, healthy |

### 5. 生产数据库只读计数

本轮未读取 `.env` 明文，通过容器环境变量执行只读 SQL。

| 项目 | 当前数量 |
| --- | ---: |
| `WeeklyReportPayload` | 19 |
| `WeeklyReportPayload.IMPORTED` | 16 |
| `WeeklyReportPayload.NEEDS_REVIEW` | 3 |
| `RosterWeek` | 6 |
| `RosterShift` | 210 |
| orphan `RosterShift` | 0 |

来源分布：

| source | migrationStatus | 数量 |
| --- | --- | ---: |
| `api_db_first_bridge` | `IMPORTED` | 13 |
| `legacy_weekly_workspace` | `IMPORTED` | 3 |
| `legacy_weekly_workspace` | `NEEDS_REVIEW` | 3 |

重复分布：

| sourceUserKey | canonicalUserKey | source | migrationStatus | 数量 |
| --- | --- | --- | --- | ---: |
| `shared` | `shared` | `api_db_first_bridge` | `IMPORTED` | 13 |

`source=api_db_first_bridge` 且 `sourceUserKey=shared` 的 distinct `sourceSha16` 数量为 13。

## 风险与建议

1. A 线已可视为上线完成，不应再被标记为缺交接文档。
2. D 线发布 runbook 中如果继续使用生产迁移时的 `WeeklyReportPayload=6` 作为硬性不变基线，会误报。现在应改为：
   - `legacy_weekly_workspace` 基线仍为 6 条；
   - 总 `WeeklyReportPayload` 当前实测为 19 条；
   - 新增 `api_db_first_bridge` 行必须单独监控来源、userKey 和增长速度。
3. `shared/shared` 的 13 条 draft payload 需要后续复核。初步判断不是数据库结构迁移残留，而是 A 线写桥生效后由 shared workspace 写入产生。
4. 在确认 shared workspace 写入策略前，不建议执行生产写路径演练或清理旧 weekly JSON。

## 本轮未执行

- 未改 API 业务代码。
- 未写生产数据库。
- 未部署、未重启。
- 未读取或打印 `.env` 明文。
- 未提交或合并 GitHub PR。

## 下一步

1. 把 A 线交接文档和本核实记录提交到 GitHub 分支。
2. 交给 D 线更新 runbook：`WeeklyReportPayload` 计数从固定 6 改成按来源分组验收。
3. 交给 A/D 后续复核 `shared/shared` payload 是否应改成稳定幂等键，避免同一 shared 草稿持续新增。
