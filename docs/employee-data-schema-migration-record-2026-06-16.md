# 大爱归心员工数据 schema/migration 落地记录

生成时间：2026-06-16
状态：已新增 schema 草案和 migration 文件；未执行数据库迁移；未写入业务数据。

## 本次新增/修改

修改：

- `/opt/huigui-crm/prisma/schema.prisma`

新增：

- `/opt/huigui-crm/prisma/migrations/20260616103000_employee_data_migration_foundation/migration.sql`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/schema-this-turn.diff`

## 重要说明

`prisma/schema.prisma` 在本次操作开始前已经处于 Git modified 状态，线上工作树里也有大量既有未跟踪 migration 目录。

为了避免混淆，本次额外保存了“本轮专用 diff”：

```text
/opt/huigui-crm/output/employee-data-migration/2026-06-16/schema-this-turn.diff
```

该 diff 是用本次读取前后的 schema 文件直接比较得到，只包含本轮新增的员工数据迁移相关字段和模型。

## 新增 schema 内容

新增枚举：

- `RosterWeekStatus`
- `RosterPeriodMode`
- `WeeklyPayloadMigrationStatus`

新增模型：

- `RosterWeek`
- `RosterShift`
- `RosterAuditLog`
- `AttendancePeriod`
- `WeeklyReportPayload`

新增反向关系：

- `User.rosterWeeksActed`
- `User.rosterShifts`
- `User.rosterAuditLogs`
- `User.weeklyReportPayloads`
- `TestBatch.rosterWeeks`
- `TestBatch.attendancePeriods`
- `WeeklyReport.payloads`

## migration 文件内容

新增 migration 文件：

```text
/opt/huigui-crm/prisma/migrations/20260616103000_employee_data_migration_foundation/migration.sql
```

该 SQL 会创建：

- `RosterWeek`
- `RosterShift`
- `RosterAuditLog`
- `AttendancePeriod`
- `WeeklyReportPayload`

并添加对应索引、唯一键和外键。

## 校验结果

由于宿主机项目目录没有本地 Prisma CLI，本次使用 `huigui-api` 容器里的 Prisma CLI 做临时 schema 校验。

执行方式：

```bash
cd /opt/huigui-crm
sudo docker cp prisma/schema.prisma huigui-api:/tmp/schema-employee-data-migration.prisma
sudo docker exec huigui-api sh -lc "node_modules/.bin/prisma validate --schema /tmp/schema-employee-data-migration.prisma"
sudo docker exec huigui-api rm -f /tmp/schema-employee-data-migration.prisma
```

校验结果：

```text
Prisma schema loaded from ../tmp/schema-employee-data-migration.prisma
The schema at ../tmp/schema-employee-data-migration.prisma is valid
```

## 未执行事项

明确没有执行：

- `prisma migrate deploy`
- `prisma migrate dev`
- `prisma db push`
- 任意回填脚本
- 任意业务表写入
- 任意线上 API 切换

## 当前文件校验值

```text
schema.prisma
759628e83d9ded41bb4350af7ec918d0952e19f548fbe94f111e506fdc8589b8

migration.sql
1c4da864bc77aa9bac3195f422916530719986ea41fb5752866e856cf866d18f
```

## 下一步建议

下一步不要直接跑生产迁移。建议顺序：

1. 在测试库或 staging 执行 migration。
2. 用 `weekly-userkey-dryrun.mjs` 和 `roster-json-dryrun.mjs` 输出验证结果。
3. 写只读的 backfill apply 草案，但默认仍为 dry-run。
4. 用户确认后，才在生产执行数据库备份和 `prisma migrate deploy`。

## 给其他协作电脑

继续前请先阅读：

- `/opt/huigui-crm/docs/employee-data-migration-readonly-plan-2026-06-16.md`
- `/opt/huigui-crm/docs/weekly-userkey-mapping-report-2026-06-16.md`
- `/opt/huigui-crm/docs/roster-json-dryrun-report-2026-06-16.md`
- `/opt/huigui-crm/docs/employee-data-migration-engineering-draft-2026-06-16.md`
- `/opt/huigui-crm/docs/employee-data-dryrun-run-record-2026-06-16.md`
- `/opt/huigui-crm/docs/employee-data-schema-migration-record-2026-06-16.md`
