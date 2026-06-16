# 大爱归心员工数据迁移只读方案

生成时间：2026-06-16
作者：Codex 协作节点
范围：management.hui-health.com 员工平台的班表/排班/考勤与周报数据源统一
状态：只读方案。本文档不代表已执行数据库迁移、业务代码改动或线上配置改动。

## 本次记录

本次只新增本文档，用于让另一台电脑的 Codex 或人工开发者了解现状与推荐迁移路径。

建议服务器路径：

`/opt/huigui-crm/docs/employee-data-migration-readonly-plan-2026-06-16.md`

## 只读检查结论

1. 数据库已打通。
   - `huigui-api` 正常运行。
   - `huigui-mysql` 正常运行且 healthy。
   - MySQL 可查询，`User` 有 24 条，`Role` 有 11 条。

2. 班表/排班/考勤尚未数据库化。
   - 数据库没有发现 `Roster`、`Schedule`、`Attendance`、`Leave`、`Shift` 等业务表。
   - 当前主要数据文件：
     - `/opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json`
     - `/opt/huigui-crm/storage/uploads/employee-launch-contract/schedule.json`
   - 当前接口仍由 `EmployeeLaunchService` 读写本地 JSON：
     - `GET /api/roster/workspace`
     - `PATCH /api/roster/workspace`
     - `GET /api/schedule/workspace`
   - 前端班表还存在浏览器本地缓存 key，例如 `bearhug.weeklyRoster.v1`。

3. 周报是半数据库化。
   - 数据库已有：
     - `WeeklyReport`
     - `WeeklyReportPlanItem`
     - `WeeklyReportReviewItem`
     - `WeeklyPublicDigest`
   - 当前线上库中 `WeeklyReport` 有 3 条真实记录。
   - 服务器本地仍有旧员工周报 workspace：
     - `/opt/huigui-crm/storage/uploads/employee-launch-weekly/*.json`
   - 本地周报 workspace 当前约 12 份，包含 `shared`、`lisali`、`da-ai-gui-xin.weekly-workspace.v1.*` 和 smoke/test key。

4. 线上同时存在两套路由。
   - 旧员工平台周报 workspace：
     - `GET /api/weekly/workspace/:userKey`
     - `PATCH /api/weekly/workspace/:userKey`
     - `POST /api/work-reports/weekly/current/draft`
     - `POST /api/work-reports/weekly/current/submit`
   - 数据库版工作管理周报：
     - `GET /api/work-management/weekly-reports`
     - `GET /api/work-management/weekly-reports/archive`
     - `GET /api/work-management/weekly-reports/team-closure`
     - `POST /api/work-management/weekly-reports/draft`
     - `PATCH /api/work-management/weekly-reports/:id`
     - `POST /api/work-management/weekly-reports/:id/submit`
     - `POST /api/work-management/weekly-reports/:id/review`

## 用户感知问题的判断

“大家看不到彼此”不是数据库完全没通，而是数据源和可见规则不统一。

班表：

- 主要源仍是服务器本地 JSON。
- 前端还会读写浏览器 localStorage。
- 如果某台设备没有正确同步，容易出现“我这里有、别人那里没有”。

周报：

- 提交/草稿动作已可写入数据库。
- 但旧员工平台页面仍按 `userKey` 读取本地 workspace。
- 数据库版周报列表有权限控制，普通员工默认只看自己；有部门、团队、管理权限的人才能看到团队范围内已提交/已审核的周报。

## 迁移目标

1. 班表、排班、考勤、请假统一进入 MySQL。
2. 周报以 `WeeklyReport` 数据库模型作为主数据源。
3. 本地 JSON 只保留为临时回滚/审计备份，不再作为线上主数据源。
4. 浏览器 localStorage 只允许作为未提交草稿或离线缓存，不允许覆盖数据库主数据。
5. 权限继续走现有账号、角色、数据范围逻辑，不用“所有人看所有人”替代权限控制。

## 建议表设计

### 班表

新增模型建议：

- `RosterWeek`
  - `id`
  - `teamKey`：如 `bearhug-front`、`bearhug-kitchen`、`daochong`
  - `teamLabel`
  - `weekKey`
  - `weekStartDate`
  - `weekEndDate`
  - `periodMode`：week/month
  - `status`：DRAFT/PUBLISHED/ARCHIVED
  - `version`
  - `actorUserId`
  - `publishedAt`
  - `dataScope`
  - `partitionKey`
  - `testBatchId`
  - `createdAt`
  - `updatedAt`

- `RosterShift`
  - `id`
  - `rosterWeekId`
  - `personExternalId`
  - `personName`
  - `role`
  - `department`
  - `teamKey`
  - `date`
  - `dayLabel`
  - `shiftCode`
  - `shiftLabel`
  - `startTime`
  - `endTime`
  - `isRest`
  - `notesJson`
  - `createdAt`
  - `updatedAt`

- `RosterAuditLog`
  - `id`
  - `rosterWeekId`
  - `action`
  - `actorUserId`
  - `beforeJson`
  - `afterJson`
  - `createdAt`

第一阶段可以把人员信息作为班表快照字段保存，不必立刻建设完整员工主数据表。这样可以减少迁移面。

### 考勤与请假

从当前 `schedule.json` 拆出：

- `AttendancePeriod`
  - 周期状态、复核状态、是否补卡确认、是否锁定。

- `LeaveRequest`
  - 请假记录、审批状态、证明材料状态、审批人、审批时间。

- `AttendanceMakeupRequest`
  - 缺卡/补卡记录、确认状态、确认人、确认时间。

如果第一期资源有限，可以先只迁班表 `RosterWeek/RosterShift`，考勤与请假作为第二阶段。

### 周报

现有 `WeeklyReport` 已可作为主表，但旧 workspace 的结构比现有字段更丰富。建议二选一：

方案 A：给 `WeeklyReport` 增加 `payloadJson` 字段。

- 优点：查询和详情最简单。
- 缺点：主表变重。

方案 B：新增 `WeeklyReportPayload`。

- `id`
- `weeklyReportId`
- `source`：legacy-workspace / work-management
- `payloadJson`
- `sourceUserKey`
- `sourceFileDigest`
- `createdAt`
- `updatedAt`

建议用方案 B，更利于回滚和审计。

## 推荐迁移顺序

### 阶段 0：冻结与备份

只读执行：

1. 记录当前 JSON 文件清单和 sha256。
2. 做一次数据库备份。
3. 记录当前 `WeeklyReport` 数量、用户数量、角色数量。
4. 不删除任何本地 JSON。

### 阶段 1：加表，不切流量

1. 新增 Prisma schema 和 migration。
2. 部署后只验证空表存在。
3. 原有页面仍读旧 JSON，不改变用户体验。

### 阶段 2：dry-run 回填

1. 写回填脚本，但先只 dry-run。
2. 输出统计：
   - 班表 team 数、week 数、shift 数。
   - 周报 workspace 数、可识别用户数、无法识别 userKey 数。
   - 重复/冲突项。
3. dry-run 报告确认后才允许真实写入。

### 阶段 3：真实回填

1. 把 `roster.json` 写入 `RosterWeek/RosterShift`。
2. 把旧周报 workspace 写入 `WeeklyReportPayload`，并尽量关联到 `WeeklyReport`。
3. 对已存在数据库周报，不直接覆盖；只补 payload 或生成冲突报告。

### 阶段 4：双读对比

1. API 同时读取数据库和旧 JSON。
2. 响应仍返回旧 JSON 结果。
3. 后台记录差异：
   - 班表行数是否一致。
   - 每人每天班次是否一致。
   - 周报状态、更新时间、提交人是否一致。

### 阶段 5：双写

1. 班表保存时同时写数据库和旧 JSON。
2. 如果数据库写失败，前端提示失败，不允许只写本地 JSON。
3. 旧 JSON 继续作为回滚快照。

### 阶段 6：切主读源

1. `GET /api/roster/workspace` 改为读数据库。
2. `GET /api/schedule/workspace` 逐步改为读数据库。
3. 旧员工周报页面改用 `/api/work-management/weekly-reports` 或同等数据库接口。
4. localStorage 只保留未提交草稿，不再参与 published 数据合并。

### 阶段 7：观察与清理

1. 观察至少 7 到 14 天。
2. 保留旧 JSON 只读备份。
3. 确认无回滚需求后，再把旧 workspace 写入口关掉。

## 权限规则建议

班表：

- 普通员工可看已发布班表。
- 店长/部门负责人可编辑所属团队草稿。
- 管理员可编辑所有团队。
- 发布动作必须记审计日志。

周报：

- 本人可看自己的草稿、退回、已提交、已审核周报。
- 团队/部门负责人可看权限范围内员工的已提交/已审核周报。
- 拥有 review 权限的人可看退回状态并点评。
- 普通员工不默认看所有人的个人周报。
- 如果业务需要“大家看公开周报”，应走 `WeeklyPublicDigest` 或团队公开摘要，而不是开放个人原始周报。

## 验收标准

班表：

1. 同一团队同一周，数据库班表与旧 `roster.json` 行数一致。
2. 每个人每天班次一致。
3. 发布状态、更新时间、发布人一致。
4. 不同电脑/浏览器打开看到同一份已发布班表。
5. 清空浏览器 localStorage 后仍能看到正确班表。

周报：

1. 旧本地 workspace 均有备份和 digest。
2. 数据库版周报列表能看到本人周报。
3. 管理员/部门/团队账号能看到权限范围内团队周报。
4. 普通员工看不到不该看的个人周报。
5. 旧 `userKey` 如 `shared`、`lisali`、`da-ai-gui-xin.weekly-workspace.v1.*` 有明确映射或冲突报告。

回滚：

1. 切库后仍保留旧 JSON。
2. 有开关能让 API 临时回读旧 JSON。
3. 回滚不需要删除数据库数据。

## 主要风险

1. `userKey` 不统一。
   - 同一人可能出现 `lisali` 和 `da-ai-gui-xin.weekly-workspace.v1.lisali` 两种 key。
   - 需要做身份映射表或迁移映射清单。

2. `shared` workspace 混合多人内容。
   - 不能简单归到单一用户。
   - 应迁为团队摘要、共享草稿，或按条目拆分后人工确认。

3. 浏览器 localStorage 可能回写旧数据。
   - 切库前需要前端加版本号和迁移标记。
   - 切库后 published 数据必须禁止由 localStorage 覆盖。

4. 本地 JSON 并发写入风险。
   - 当前模式下多人同时保存可能互相覆盖。
   - 迁移期要尽快进入数据库双写。

5. 工作管理周报和员工平台周报体验不同。
   - 数据源合并时需要统一入口和导航，否则用户会以为“两个周报系统”。

## 建议下一步

1. 先补一份 `userKey -> User` 的只读映射报告。
2. 再补 `roster.json -> RosterWeek/RosterShift` 的 dry-run 转换报告。
3. 确认字段和权限后，再允许生成 Prisma migration。
4. migration 与回填脚本应先在 staging 或测试库执行。
5. 生产执行前必须有数据库备份和 JSON sha256 清单。

## 给其他协作电脑的提示

请优先阅读本文档，再继续开发。

继续前不要直接删除：

- `/opt/huigui-crm/storage/uploads/employee-launch-contract/*.json`
- `/opt/huigui-crm/storage/uploads/employee-launch-weekly/*.json`

建议下一位开发者先做只读报告：

- `userKey` 映射报告。
- `roster.json` dry-run 解析报告。
- 数据库 migration 草案。

任何真实迁移前，请先得到用户确认。
