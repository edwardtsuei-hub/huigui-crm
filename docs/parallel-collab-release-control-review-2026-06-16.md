# 大爱归心 D 线：发布、回滚与验收总控复核

日期：2026-06-16
工作流：D，发布、回滚与验收总控复核
当前状态：`blocked`

## 结论

本次只读复核已完成。`parallel-collab-release-control-2026-06-16.md` 的安全边界、数据库基线、回滚原则和数据库字段 SQL 基本正确，但当前不得进入发布流程。

阻断原因：本地 `docs/parallel-collab-api-db-first-2026-06-16.md` 不存在。按本次复核规则，API DB-first 交接状态必须标为 `blocked`，不能进入发布。

本次未部署、未重启服务、未写数据库、未改代码、未读取或打印 `.env` 明文。

## 已读取文件

- `docs/parallel-collaboration-control-2026-06-16.md`
- `docs/employee-data-production-migration-record-2026-06-16.md`
- `docs/parallel-collab-release-control-2026-06-16.md`

## API DB-first 交接文件状态

| 文件 | 状态 | 结论 |
| --- | --- | --- |
| `docs/parallel-collab-api-db-first-2026-06-16.md` | 不存在 | API DB-first blocked，不得进入发布 |

相关证据：

- 总控文档中 A 线停止点要求写入 `/opt/huigui-crm/docs/parallel-collab-api-db-first-2026-06-16.md`。
- release-control runbook 的发布前检查包含 `test -f docs/parallel-collab-api-db-first-2026-06-16.md`，该门禁方向正确。
- 但 release-control runbook 同时写明 “A 线已完成 API DB-first 桥上线并通过只读验收” 和 “A 线交接文档已存在”，与当前本地文件状态不一致。

## 数据库字段名复核

| 检查项 | runbook 写法 | schema / migration 证据 | 结论 |
| --- | --- | --- | --- |
| WeeklyReportPayload 状态字段 | `migrationStatus` | `prisma/schema.prisma` 中 `WeeklyReportPayload.migrationStatus` 存在；migration SQL 中 `migrationStatus` enum 存在 | 正确 |
| RosterShift 关联字段 | `rosterWeekId` | `prisma/schema.prisma` 中 `RosterShift.rosterWeekId` 存在，并关联 `RosterWeek.id`；migration SQL 外键为 `RosterShift_rosterWeekId_fkey` | 正确 |

runbook 中以下 SQL 字段名准确：

```sql
WHERE migrationStatus = "IMPORTED"
WHERE migrationStatus = "NEEDS_REVIEW"
LEFT JOIN RosterWeek rw ON rw.id = rs.rosterWeekId
```

## Runbook 准确性复核

### 仍准确的部分

- 发布、回滚、验收边界明确：不主动部署、不改代码、不写生产数据库、不读取 `.env` 明文。
- 生产基线与迁移记录一致：`WeeklyReportPayload=6`、`RosterWeek=6`、`RosterShift=210`、orphan `RosterShift=0`。
- 发布前要求确认备份目录存在，方向正确。
- 发布前检查包含 API DB-first 交接文件存在性检查，方向正确。
- 数据库只读计数 SQL 使用的关键字段名正确。
- P1 DB-first 接口验收要求以 A 线交接文档为准，不臆造路径，方向正确。
- 回滚原则正确：默认只回滚 API，不删除新表数据，不恢复整库备份，除非用户明确判断。

### 需要修正或标注的部分

- 当前本地仓库缺少 `docs/parallel-collab-api-db-first-2026-06-16.md`，因此 runbook 中 “A 线已完成” 和 “交接文档已存在” 的表述在当前上下文下不准确。
- 当前停止点应改为：等待 API DB-first 交接文件补齐并通过检查；补齐前 D 线不得进入发布。
- `记录发布前版本` 中使用 `docker compose ps`，历史复核中生产 `.env` 权限可能阻断 compose 读取；建议在 runbook 中补充只读 fallback：直接使用 `docker ps` / `docker inspect`，避免读取或打印 `.env`。
- 建议把 “建议将当前 API 镜像打只读回滚标签” 标成需用户确认的可写 Docker 操作；它会写入 Docker 本地镜像标签，不应归类为纯只读检查。

## 发布门禁判断

- API DB-first 交接文件：缺失。
- 发布允许状态：不允许。
- 当前阻断级别：`blocked`。
- 触发条件：`docs/parallel-collab-api-db-first-2026-06-16.md` 不存在。
- 解除条件：A 线补齐 API DB-first 交接记录，并明确 build/验收、接口路径、DB-first 结果、fallback 证明、是否部署。

## 本次改动文件

- `docs/parallel-collab-release-control-review-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-release-control-review.json`

## 停止点

D 线 release-control runbook 复核已完成。当前不得进入发布；下一步应由 A 线补齐 `parallel-collab-api-db-first-2026-06-16.md` 或由主线明确提供等价交接证据后，再重新执行 D 线发布前检查。
