# 大爱归心员工数据跨功能同步评估

日期：2026-06-16
范围：management.hui-health.com / `/opt/huigui-crm`
状态：只读评估记录。未执行数据库迁移，未写入生产数据。

## 结论

班表和周报不是唯一需要同步的员工数据。当前“员工启动区”至少还有 `platform`、`schedule`、`finance`、`daochong`、`courses`、`ocr-tasks` 这些服务器 JSON 工作区。它们可以继续使用，但多人协作、一致权限、跨设备查看、后续统计都依赖数据库化或明确的同步桥。

建议不要一次性全迁。先迁移班表、周报、考勤周期；同时把财务、OCR、附件、平台消息纳入第二批同步设计；道冲客户/预约/课程可以作为第三批。

## 服务器端证据

员工启动区本地 JSON 文件：

| 文件 | 大小 | 修改时间 | 判断 |
| --- | ---: | --- | --- |
| `courses.json` | 5281 | 2026-05-30 12:25 | 课程/报名/通知，本地文件工作区 |
| `daochong.json` | 4450 | 2026-05-30 12:25 | 道冲客户/预约/付款，本地文件工作区 |
| `finance.json` | 8165 | 2026-06-13 06:28 | 费用、结算、审批策略，本地文件工作区 |
| `ocr-tasks.json` | 38516 | 2026-06-13 06:28 | OCR 任务结果，本地文件工作区 |
| `platform.json` | 53387 | 2026-06-15 11:33 | 平台消息、附件、审计项，本地文件工作区 |
| `roster.json` | 473922 | 2026-06-14 08:01 | 班表草稿/发布数据，本地文件工作区 |
| `schedule.json` | 1735 | 2026-05-30 12:24 | 考勤周期/请假/附件，本地文件工作区 |

API 代码证据：

- `apps/api/src/employee-launch/employee-launch.service.ts:343-350` 定义了 `employee-launch-contract` 和 `employee-launch-weekly` 本地存储目录。
- `apps/api/src/employee-launch/employee-launch.service.ts:362-396` 从本地 JSON 读取 `platform`、`schedule`、`roster`、`finance`、`daochong`、`courses`。
- `apps/api/src/employee-launch/employee-launch.service.ts:399-423` 将 `platform`、`schedule`、`roster` 写回本地 JSON。
- `apps/api/src/employee-launch/employee-launch.service.ts:3305-3359` 的 `readContractState` / `commitContractState` 直接读写 JSON 文件。
- `apps/api/src/employee-launch/employee-launch.service.ts:3498-3513` 的 OCR 任务也直接读写 `ocr-tasks.json`。

JSON 顶层结构摘要：

- `courses.json`：`sessions:1`、`enrollments:2`、`noticeReceipts:2`、`activity:11`
- `daochong.json`：`customers:2`、`appointments:1`、`payments:2`、`rechargeTransactions:2`、`activity:3`
- `finance.json`：`expenseClaims:4`，另含考勤归档、课程结算、审批策略、内部报表、法务任务等结构
- `ocr-tasks.json`：多个 OCR 任务，字段含 `attachmentId`、`fileName`、`taskType`、`sourceModule`、`claimId`、`status`
- `platform.json`：`messages:13`、`attachments:12`、`auditItems:24`
- `roster.json`：含 `drafts`、`published`、`draftsByWeek`、`publishedByWeek`
- `schedule.json`：含 `snapshot`、`attachments:1`、`auditTrail:4`

## 功能分层

### 第一批：应与当前班表/周报迁移一起打通

1. 班表 / 排班
   - 当前来源：`roster.json`，以及前端旧缓存 `bearhug.weeklyRoster.v1`
   - 已准备：`RosterWeek`、`RosterShift`、`RosterAuditLog` schema 草案和只读回填计划
   - 原因：用户已经遇到“大家看不到彼此”的问题，这是核心多人协作数据

2. 周报
   - 当前来源：数据库已有 `WeeklyReport` 等表，但旧员工工作区仍有 `employee-launch-weekly/*.json`
   - 已准备：`WeeklyReportPayload` schema 草案和只读回填计划
   - 原因：周报已经一半在数据库、一半在本地文件，必须先统一归属和可见性

3. 考勤周期 / 请假 / 归档
   - 当前来源：`schedule.json` 和 `finance.json.attendanceArchive`
   - 已准备：`AttendancePeriod` schema 草案
   - 原因：班表、考勤、薪资/财务结算会互相引用，不应拆开太久

### 第二批：建议同步桥先跟上，正式迁移可稍后

4. 财务工作区
   - 当前来源：`finance.json`
   - 当前 DB 已有 `FinanceAccount`、`SalarySlip`、`PayrollDraftBatch`、`SalaryNotifyLog` 等表，但 employee-launch finance 仍是文件工作区
   - 建议：先保留 JSON 只读 fallback，新建 API 同步桥，把费用申请、课程结算、审批策略逐步落 DB
   - 风险：如果只迁班表/周报，费用申请和考勤归档仍可能留在单机文件逻辑里

5. OCR 任务
   - 当前来源：`ocr-tasks.json`
   - 建议：建立 OCR 任务表或挂到文件/费用申请记录，至少保存 `sourceModule`、`claimId`、`attachmentId`、`status`
   - 原因：OCR 经常服务于报销、付款、附件识别；如果结果留在 JSON，跨设备和追踪会不稳定

6. 平台消息 / 附件 / 审计项
   - 当前来源：`platform.json`
   - 当前 DB 已有 `FileRecord`、`FileFolder`、`AuditLog`、`Notification`
   - 建议：消息进 `Notification` 或专门消息表；附件进 `FileRecord`；审计项进 `AuditLog` 或员工模块审计表
   - 原因：这是多人协作时最容易造成“我看不到你刚上传/刚审核”的一类数据

### 第三批：等核心人事链路稳定后迁移

7. 道冲客户 / 预约 / 付款
   - 当前来源：`daochong.json`
   - 当前结构：客户、预约、付款、充值记录
   - 建议：作为服务运营模块单独设计表，不要和班表迁移混在一个执行窗口

8. 课程 / 报名 / 通知回执
   - 当前来源：`courses.json`
   - 当前结构：课程场次、报名、通知回执、活动记录
   - 建议：第二轮或第三轮迁移，优先保留只读导出和回填脚本

### 暂不作为正式数据迁移对象

9. 前端 localStorage 的 UI 状态和解析缓存
   - 例：`.parsed`、`.change`、移动端 UI 偏好、草稿标记
   - 建议：只保留为临时草稿/离线缓存，正式发布数据必须以 API/数据库为准
   - 原因：浏览器缓存不能承担多人协作的正式数据源角色

## 和其他功能能否一起用

可以一起用，但要区分“现在能打开”和“多人协作可靠”：

- 已经 DB-backed 的主系统功能，例如用户、权限、任务、通知、文件中心、薪资、周报主表、月度目标、客户/订单/报价/产品等，可以继续作为正式系统功能使用。
- 员工启动区的 JSON 工作区也能继续打开，但它们更像过渡状态，不适合作为长期多人协作的唯一数据源。
- 现阶段最容易出现互相看不到的是：班表、员工工作区周报 payload、平台附件/审计项、OCR 任务、费用申请、课程/道冲运营记录。

## 同步设计原则

1. 数据库是正式数据源
   - 发布后的班表、周报、考勤、费用申请、附件、OCR 状态都应以数据库为准。

2. JSON 只能作为迁移前备份或只读 fallback
   - 回填成功并经过验收后，JSON 不应继续接受正式写入。

3. localStorage 只能作为草稿或 UI 缓存
   - 页面刷新、换电脑、多人查看时，必须从 API 拉取正式数据。

4. 每个迁移模块都要保留来源指纹
   - 记录 `sourceFile`、`sourceKey`、`legacyId`、`importedAt`、`importedBy`，方便追溯和重复导入保护。

5. 先双读，再切写
   - 第一步：API 优先读 DB，缺失时读 JSON。
   - 第二步：写入同时落 DB，并记录 JSON 已冻结。
   - 第三步：前端关闭旧 localStorage 正式数据恢复逻辑，只保留草稿缓存。

## 推荐执行顺序

1. 只读阶段
   - 已完成：周报 key 对照、班表 JSON dry-run、schema 草案、回填 SQL 草案。
   - 新增：本报告作为跨功能同步评估。

2. Schema 阶段
   - 执行 `RosterWeek`、`RosterShift`、`RosterAuditLog`、`AttendancePeriod`、`WeeklyReportPayload` 的数据库迁移。
   - 迁移前再次备份数据库与 JSON 文件。

3. 回填阶段
   - 先导入班表和周报 payload。
   - schedule/attendance 只导入周期、归档、请假/审核状态，不改业务含义。

4. API 桥阶段
   - 班表、周报、考勤 API 改为 DB 优先。
   - Finance/OCR/Platform 先做只读同步桥，不急于删除旧 JSON。

5. 前端清理阶段
   - 明确 localStorage 白名单：只允许草稿、筛选器、UI 偏好。
   - 删除或禁用正式数据从 localStorage 恢复的逻辑。

6. 第二批迁移
   - finance + OCR + platform attachments/audit。

7. 第三批迁移
   - daochong + courses。

## 需要另一台电脑接力确认的问题

1. `finance.json.expenseClaims` 是否已经是实际报销流程的正式数据。
2. `platform.json.attachments` 是否对应已上传的文件中心记录，还是只有 JSON 索引。
3. `ocr-tasks.json` 中的 OCR 任务是否还有前端页面会继续轮询。
4. `daochong.json` 与主系统客户/订单/付款表是否已有一套新入口，避免重复迁移。
5. `courses.json` 是否只是演示数据，还是已经有真实报名/通知回执。

## 当前安全边界

- 未读取 `.env` 明文。
- 未执行数据库写入。
- 未执行 Prisma migration。
- 未改运行中的 Docker 服务。
- 本报告只记录只读发现和建议。
