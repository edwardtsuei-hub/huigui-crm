# 大爱归心员工数据迁移工程草案

生成时间：2026-06-16
范围：班表/排班/考勤与周报从本地 JSON 逐步迁到 MySQL
状态：工程草案。本文档不代表已执行 schema 变更、migration、回填或代码发布。

## 当前边界

本草案只记录建议设计。当前没有执行：

- Prisma schema 修改
- Prisma migration 生成
- 数据库写入
- 线上 API 切换
- JSON 文件删除

相关只读文档：

- `/opt/huigui-crm/docs/employee-data-migration-readonly-plan-2026-06-16.md`
- `/opt/huigui-crm/docs/weekly-userkey-mapping-report-2026-06-16.md`
- `/opt/huigui-crm/docs/roster-json-dryrun-report-2026-06-16.md`

## 设计原则

1. 先记录来源，再迁数据。
2. 先 dry-run，再 apply。
3. 先双读对比，再双写。
4. 先保证现有接口兼容，再切前端体验。
5. 本地 JSON 保留为回滚来源，不在第一阶段删除。
6. 权限继续沿用现有 `DataScope`、`RecordDataScope`、角色权限系统。

## Prisma schema 草案

注意：以下是草案，不应直接粘贴执行。正式落地前必须在本地或 staging 上跑 `prisma validate`、`prisma migrate diff` 和测试库回放。

### 新增枚举

```prisma
enum RosterWeekStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum RosterPeriodMode {
  WEEK
  MONTH
}

enum RosterMigrationStatus {
  DRY_RUN
  IMPORTED
  SKIPPED
  CONFLICT
}

enum WeeklyPayloadMigrationStatus {
  DRY_RUN
  IMPORTED
  SKIPPED
  CONFLICT
  NEEDS_REVIEW
}
```

### 班表主表

```prisma
model RosterWeek {
  id              String            @id @default(cuid())
  teamKey         String            @db.VarChar(80)
  teamLabel       String            @db.VarChar(120)
  weekKey         String            @db.VarChar(40)
  weekLabel       String?           @db.VarChar(80)
  periodMode      RosterPeriodMode  @default(WEEK)
  periodLabel     String?           @db.VarChar(80)
  status          RosterWeekStatus  @default(DRAFT)
  source          String            @default("legacy_roster_json") @db.VarChar(64)
  sourceSha16     String?           @db.VarChar(32)
  sourceUpdatedAt DateTime?
  actorName       String?           @db.VarChar(120)
  actorUserId     String?
  publishedAt     DateTime?
  version         Int               @default(1)
  rawSnapshot     Json?
  dataScope       RecordDataScope   @default(REAL)
  partitionKey    String            @default("REAL") @db.VarChar(64)
  testBatchId     String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  actor           User?             @relation(fields: [actorUserId], references: [id])
  testBatch       TestBatch?        @relation(fields: [testBatchId], references: [id])
  shifts          RosterShift[]
  auditLogs       RosterAuditLog[]

  @@unique([teamKey, weekKey, status, partitionKey])
  @@index([teamKey, weekKey])
  @@index([status])
  @@index([publishedAt])
  @@index([partitionKey])
  @@index([testBatchId])
}
```

### 班次明细

```prisma
model RosterShift {
  id               String      @id @default(cuid())
  rosterWeekId     String
  personExternalId String      @db.VarChar(160)
  personUserId     String?
  personName       String      @db.VarChar(120)
  role             String?     @db.VarChar(120)
  department       String?     @db.VarChar(120)
  teamKey          String      @db.VarChar(80)
  dayName          String      @db.VarChar(16)
  dateLabel        String      @db.VarChar(20)
  shiftLabel       String      @db.VarChar(40)
  startTime        String?     @db.VarChar(16)
  endTime          String?     @db.VarChar(16)
  isRest           Boolean     @default(false)
  notesJson        Json?
  sortOrder        Int         @default(0)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  rosterWeek       RosterWeek  @relation(fields: [rosterWeekId], references: [id], onDelete: Cascade)
  personUser       User?       @relation(fields: [personUserId], references: [id])

  @@unique([rosterWeekId, personExternalId, dayName])
  @@index([rosterWeekId])
  @@index([personExternalId])
  @@index([personUserId])
  @@index([teamKey])
}
```

### 班表审计

```prisma
model RosterAuditLog {
  id           String      @id @default(cuid())
  rosterWeekId String?
  action       String      @db.VarChar(80)
  actorUserId  String?
  actorName    String?     @db.VarChar(120)
  beforeJson   Json?
  afterJson    Json?
  note         String?     @db.Text
  createdAt    DateTime    @default(now())

  rosterWeek   RosterWeek? @relation(fields: [rosterWeekId], references: [id], onDelete: SetNull)
  actor        User?       @relation(fields: [actorUserId], references: [id])

  @@index([rosterWeekId])
  @@index([actorUserId])
  @@index([createdAt])
}
```

### 考勤周期与异常

第一阶段可以不做完整考勤迁移；如果要同步 `schedule.json`，建议使用以下表：

```prisma
model AttendancePeriod {
  id                String          @id @default(cuid())
  periodKey         String          @db.VarChar(40)
  status            String          @db.VarChar(40)
  reviewState       String          @db.VarChar(40)
  makeupConfirmed   Boolean         @default(false)
  attendanceLocked  Boolean         @default(false)
  totalOpenItems    Int             @default(0)
  source            String          @default("legacy_schedule_json") @db.VarChar(64)
  sourceSha16       String?         @db.VarChar(32)
  rawSnapshot       Json?
  dataScope         RecordDataScope @default(REAL)
  partitionKey      String          @default("REAL") @db.VarChar(64)
  testBatchId       String?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@unique([periodKey, partitionKey])
  @@index([reviewState])
  @@index([attendanceLocked])
  @@index([partitionKey])
}
```

请假、补卡可作为第二阶段再拆：

- `LeaveRequest`
- `AttendanceMakeupRequest`

先把 `schedule.json` 作为 `AttendancePeriod.rawSnapshot` 归档即可。

### 周报旧 payload

现有 `WeeklyReport` 不建议直接塞所有旧 JSON。建议新增 payload 表：

```prisma
model WeeklyReportPayload {
  id              String                       @id @default(cuid())
  weeklyReportId  String?
  userId          String?
  source          String                       @default("legacy_weekly_workspace") @db.VarChar(80)
  sourceUserKey   String                       @db.VarChar(200)
  canonicalUserKey String?                     @db.VarChar(160)
  sourceFileName  String                       @db.VarChar(255)
  sourceSha16     String                       @db.VarChar(32)
  reportState     String?                      @db.VarChar(40)
  savedAt         DateTime?
  payloadJson     Json
  migrationStatus WeeklyPayloadMigrationStatus @default(DRY_RUN)
  migrationNote   String?                      @db.Text
  createdAt       DateTime                     @default(now())
  updatedAt       DateTime                     @updatedAt

  weeklyReport    WeeklyReport?                @relation(fields: [weeklyReportId], references: [id], onDelete: SetNull)
  user            User?                        @relation(fields: [userId], references: [id])

  @@unique([sourceFileName, sourceSha16])
  @@index([weeklyReportId])
  @@index([userId])
  @@index([sourceUserKey])
  @@index([canonicalUserKey])
  @@index([migrationStatus])
}
```

## dry-run 脚本草案

由于当前生产服务器缺少完整 TypeScript 构建依赖，dry-run 建议先用 Node `.mjs` 脚本，避免依赖 `tsc`。

建议目录：

```text
scripts/migrations/employee-data/
  roster-json-dryrun.mjs
  weekly-userkey-dryrun.mjs
  roster-backfill.mjs
  weekly-payload-backfill.mjs
```

建议输出目录：

```text
output/employee-data-migration/2026-06-16/
```

### weekly-userkey-dryrun.mjs

输入：

```bash
node scripts/migrations/employee-data/weekly-userkey-dryrun.mjs \
  --weekly-dir /opt/huigui-crm/storage/uploads/employee-launch-weekly \
  --out output/employee-data-migration/2026-06-16/weekly-userkey-dryrun.json \
  --no-write
```

输出 JSON 结构：

```json
{
  "generatedAt": "2026-06-16T00:00:00.000Z",
  "mode": "dry-run",
  "sourceDir": "/opt/huigui-crm/storage/uploads/employee-launch-weekly",
  "summary": {
    "fileCount": 12,
    "autoMatchCandidates": 4,
    "sharedWorkspaces": 2,
    "testOrSmoke": 6,
    "conflicts": 1
  },
  "items": [
    {
      "sourceFileName": "b11e5bbc76f3de4d7b172430495c0686.json",
      "sourceSha16": "a7534321040aead8",
      "sourceUserKey": "lisali",
      "canonicalUserKey": "lisali",
      "bucket": "auto-match-candidate",
      "matchedUserId": "employee...",
      "matchedLoginAccount": "lisali",
      "existingWeeklyReportId": "cmqf...",
      "recommendedAction": "attach_payload_only",
      "reason": "weekly report already exists for current period"
    }
  ]
}
```

推荐动作枚举：

- `create_weekly_report`
- `attach_payload_only`
- `skip_test_data`
- `needs_manual_shared_split`
- `needs_manual_user_confirm`

### roster-json-dryrun.mjs

输入：

```bash
node scripts/migrations/employee-data/roster-json-dryrun.mjs \
  --roster-file /opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json \
  --bucket publishedByWeek \
  --out output/employee-data-migration/2026-06-16/roster-json-dryrun.json \
  --no-write
```

输出 JSON 结构：

```json
{
  "generatedAt": "2026-06-16T00:00:00.000Z",
  "mode": "dry-run",
  "sourceFile": "/opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json",
  "sourceSha16": "5058a37e1547dfdb",
  "bucket": "publishedByWeek",
  "summary": {
    "rosterWeeks": 6,
    "rosterShifts": 210,
    "notes": 1,
    "teams": ["bearhug-front", "bearhug-kitchen", "daochong"]
  },
  "weeks": [
    {
      "teamKey": "bearhug-front",
      "weekKey": "06/15-06/21",
      "status": "PUBLISHED",
      "rowCount": 5,
      "shiftCount": 35,
      "noteCount": 0,
      "recommendedAction": "create_or_update"
    }
  ],
  "warnings": [
    {
      "code": "ACTOR_UNMAPPED",
      "message": "actorName is text only and cannot be safely mapped to User.id"
    }
  ]
}
```

## apply 脚本安全规则

真实写库脚本必须满足：

1. 默认只 dry-run。
2. 真实写库必须显式传 `--apply`。
3. 必须传入源文件 sha16 或备份编号。
4. 必须先检测数据库连接。
5. 必须写 migration run 记录或输出完整审计日志。
6. 遇到冲突默认停止，不自动覆盖。

建议命令形态：

```bash
node scripts/migrations/employee-data/roster-backfill.mjs \
  --apply \
  --source-sha16 5058a37e1547dfdb \
  --bucket publishedByWeek \
  --confirm production-roster-publishedByWeek-20260616
```

```bash
node scripts/migrations/employee-data/weekly-payload-backfill.mjs \
  --apply \
  --weekly-dir /opt/huigui-crm/storage/uploads/employee-launch-weekly \
  --confirm production-weekly-payload-20260616
```

## API 切换草案

### 班表接口

现有接口保持不变：

- `GET /api/roster/workspace`
- `PATCH /api/roster/workspace`
- `POST /api/roster/workspace/reset`

内部实现分三期：

1. `json_only`：当前行为。
2. `dual_read_compare`：读 JSON 和数据库，返回 JSON，记录差异。
3. `db_primary`：读数据库，按旧 JSON 结构组装响应。

写入分三期：

1. `json_only`：当前行为。
2. `dual_write`：写 JSON 和数据库，任一失败则提示保存失败。
3. `db_only`：只写数据库，JSON 只保留归档。

### 周报接口

旧接口保持兼容：

- `GET /api/weekly/workspace/:userKey`
- `PATCH /api/weekly/workspace/:userKey`
- `POST /api/work-reports/weekly/current/draft`
- `POST /api/work-reports/weekly/current/submit`

推荐目标：

- 页面主数据改用 `/api/work-management/weekly-reports`
- 旧 workspace API 只作为草稿兼容层
- `shared` workspace 转成团队摘要或公开 digest，不再作为个人周报源

## 环境开关草案

默认值必须保持旧行为。

```text
EMPLOYEE_ROSTER_READ_SOURCE=legacy_json
EMPLOYEE_ROSTER_WRITE_MODE=legacy_only
EMPLOYEE_ROSTER_COMPARE_LOG=false

EMPLOYEE_WEEKLY_WORKSPACE_READ_SOURCE=legacy_json
EMPLOYEE_WEEKLY_WORKSPACE_WRITE_MODE=legacy_only
EMPLOYEE_WEEKLY_PAYLOAD_BACKFILL_ENABLED=false

EMPLOYEE_DATA_MIGRATION_STRICT=true
```

切换顺序：

1. `legacy_json / legacy_only`
2. `legacy_json / dual_write`
3. `dual_read_compare / dual_write`
4. `db_primary / dual_write`
5. `db_primary / db_only`

## 回滚草案

班表回滚：

```text
EMPLOYEE_ROSTER_READ_SOURCE=legacy_json
EMPLOYEE_ROSTER_WRITE_MODE=legacy_only
```

周报回滚：

```text
EMPLOYEE_WEEKLY_WORKSPACE_READ_SOURCE=legacy_json
EMPLOYEE_WEEKLY_WORKSPACE_WRITE_MODE=legacy_only
```

回滚时不删除数据库数据，只把读取源切回 JSON。

## 上线顺序建议

### 第 1 步：只读脚本

- 新增 dry-run 脚本。
- 输出 JSON 和 Markdown 报告。
- 不引入 Prisma 写库。

### 第 2 步：schema migration

- 在 staging 或测试库执行。
- 空表验证。
- Prisma Client 重新生成。

### 第 3 步：回填 payload 和 roster

- 先回填 `WeeklyReportPayload`。
- 再回填 `RosterWeek/RosterShift`。
- 只处理 `publishedByWeek`。

### 第 4 步：双读对比

- 班表先返回旧 JSON。
- 日志记录数据库组装结果和旧 JSON 的差异。
- 连续 3 到 7 天无严重差异后再切主读源。

### 第 5 步：前端去 localStorage 主数据化

- published 班表不再由 localStorage 覆盖。
- localStorage 只保存未提交草稿。
- 清空浏览器缓存后页面仍必须显示正确数据。

### 第 6 步：周报入口统一

- 员工周报入口尽量统一到数据库版 work-management。
- 旧 workspace 只作为草稿兼容或历史查看。

## 验收清单

班表：

- publishedByWeek 6 个周次全部入库。
- 210 条 published 班次全部入库。
- 道冲 06/08-06/14 的 1 条 note 不丢。
- 当前周三个团队各 5 人、35 班次。
- 换电脑、换浏览器、清空 localStorage 后看到一致班表。

周报：

- 12 个本地 workspace 都有 payload 记录或明确 skip 记录。
- `shared` 没有被误归到个人账号。
- `lisali` 现有数据库周报没有被覆盖。
- smoke/test 数据没有进入真实个人周报。
- 管理员/团队/普通员工的可见范围符合现有权限。

运维：

- 切换前有数据库备份。
- 源 JSON 有 sha256。
- 回滚开关可用。
- 健康检查能覆盖班表和周报关键接口。

## 给下一位协作者

下一步建议仍保持只读：

1. 写 dry-run 脚本草案到 `scripts/migrations/employee-data/`，但不要执行写库。
2. 用当前生产 JSON 跑 dry-run，只输出到 `output/employee-data-migration/`。
3. 把输出报告再放入 `docs/`。
4. 等用户确认后，才进入 Prisma migration。
