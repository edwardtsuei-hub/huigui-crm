# 大爱归心员工数据生产迁移执行记录

日期：2026-06-16
系统：management.hui-health.com / `/opt/huigui-crm`
执行账号：`claude_ops`
范围：员工数据迁移第一批，包含数据库结构迁移、周报 legacy payload 回填、班表 JSON 回填。

## 执行结论

本次生产迁移已完成。

- 数据库结构迁移成功。
- 新增 5 张基础表：`RosterWeek`、`RosterShift`、`RosterAuditLog`、`AttendancePeriod`、`WeeklyReportPayload`。
- 周报 legacy payload 已回填 6 条。
- 班表已回填 6 个周记录、210 个班次。
- 回填后没有孤儿班次。
- API 健康检查正常。
- Docker 服务状态正常。

## 备份

迁移前备份目录：

`/opt/huigui-backups/employee-data-migration-20260616-113142`

备份内容和校验：

| 文件 | SHA256 |
| --- | --- |
| `mysql.sql.gz` | `67de2677b65156680c0f2f80f664ebc68053c3621f76bb78ece170fd0fc2914d` |
| `employee-launch-json.tgz` | `93549bd50ede5f6918956017153de85122cd10c69aee421ef11400f66b982558` |
| `schema.prisma` | `759628e83d9ded41bb4350af7ec918d0952e19f548fbe94f111e506fdc8589b8` |
| `employee-data-migration.sql` | `1c4da864bc77aa9bac3195f422916530719986ea41fb5752866e856cf866d18f` |

## 结构迁移

执行方式：

- 将已校验的 host schema 和 migrations 复制到 API 容器临时目录 `/tmp/employee-data-prisma`。
- 使用 Prisma CLI 执行 `migrate deploy`。
- 未执行 `db push`。
- 未重启服务。

迁移文件：

`/opt/huigui-crm/prisma/migrations/20260616103000_employee_data_migration_foundation/migration.sql`

迁移结果：

- Prisma 返回：`All migrations have been successfully applied.`
- `_prisma_migrations` 记录：
  - `migration_name`: `20260616103000_employee_data_migration_foundation`
  - `finished_at`: `2026-06-16 03:33:34.120`
  - `rolled_back_at`: `NULL`

## 数据回填

原始演练 SQL 保留不动：

- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/weekly-payload-backfill-plan.sql`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/roster-backfill-plan.sql`

生产执行 SQL：

| 文件 | SHA256 | 插入目标 |
| --- | --- | --- |
| `weekly-payload-backfill-execute-20260616-1136.sql` | `e9640f045398184be8790dfb391b8026787e150b60c9c96f2d85be0c0b1dff6c` | `WeeklyReportPayload` 6 条 |
| `roster-backfill-execute-20260616-1136.sql` | `7957aa46286dfd0f61401ac4b65da4b741fdc206d306fd610b0a7d994b6248a8` | `RosterWeek` 6 条，`RosterShift` 210 条 |

回填安全检查：

- 生产执行 SQL 是从 dry-run SQL 复制生成，只将结尾 `ROLLBACK` 改为 `COMMIT`。
- 回填 SQL 检查未发现 `DROP`、`TRUNCATE`、`DELETE`、`ALTER`。
- `roster` 回填使用 `ON DUPLICATE KEY UPDATE`，方便重复执行修正。
- `weekly payload` 本次在空表执行，生成了 6 条 payload 归档。

## 回填后验收

数据库计数：

| 项目 | 数量 |
| --- | ---: |
| `WeeklyReportPayload` | 6 |
| `WeeklyReportPayload.IMPORTED` | 3 |
| `WeeklyReportPayload.NEEDS_REVIEW` | 3 |
| `RosterWeek` | 6 |
| `RosterShift` | 210 |
| `RosterAuditLog` | 0 |
| `AttendancePeriod` | 0 |
| `User` | 24 |
| `WeeklyReport` | 3 |
| `SalarySlip` | 1 |
| `PayrollDraftBatch` | 1 |
| orphan `RosterShift` | 0 |

班表分布：

| 团队 | 状态 | 周记录 |
| --- | --- | ---: |
| `bearhug-front` | `PUBLISHED` | 1 |
| `bearhug-kitchen` | `PUBLISHED` | 3 |
| `daochong` | `PUBLISHED` | 2 |

班次数量：

| 团队 | 班次 |
| --- | ---: |
| `bearhug-front` | 35 |
| `bearhug-kitchen` | 105 |
| `daochong` | 70 |

API 健康检查：

```json
{"status":"ok","service":"huigui-api"}
```

Docker 状态：

- `huigui-api`: Up
- `huigui-app`: Up
- `huigui-mysql`: Up / healthy
- `huigui-nginx`: Up

## 尚未完成的部分

本次只完成数据库结构和第一批历史数据回填。以下工作还没有做：

1. API 读取逻辑尚未切为 DB-first，当前线上页面可能仍先读旧 JSON。
2. 前端 localStorage 正式数据恢复逻辑尚未清理。
3. `AttendancePeriod` 表已创建，但 `schedule.json` 的考勤周期还没有回填。
4. `finance.json`、`ocr-tasks.json`、`platform.json` 尚未进入正式回填。
5. `daochong.json`、`courses.json` 尚未迁移。

## 建议下一步

1. 修改 API：班表、周报 payload 读取改成 DB-first，JSON 只作为 fallback。
2. 补一个 `schedule.json` 到 `AttendancePeriod` 的小回填。
3. 做 finance / OCR / platform 的只读 dry-run，避免这些功能继续本地化。
4. 等线上验收后，再冻结旧 JSON 正式写入路径。

## 安全边界

- 未读取 `.env` 明文。
- 未删除任何生产数据。
- 未清空任何表。
- 未执行 `db push`。
- 未重启 Docker 服务。
- 已保留迁移前数据库和 JSON 备份。
