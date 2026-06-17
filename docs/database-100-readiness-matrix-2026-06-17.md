# 数据库 100 分状态总控矩阵

日期：2026-06-17
状态：`readiness_matrix_ready_for_review`

## 100 分定义

数据库达到 100 分，至少要同时满足：

1. 能稳定存储：每个功能有明确落表、唯一键、必填字段和异常阻断。
2. 能稳定同步：旧数据、新数据、API、前端、脚本使用同一口径。
3. 能稳定查询：员工端、管理端、财务端、审计端按权限和身份字段查询，不靠姓名或全量内存过滤。
4. 能追溯：每笔数据能追到来源、批次、操作者、原始指纹、同步时间。
5. 能回滚：正式修正前有 before 指纹，修正后有 after 指纹，回滚包和执行包同包保存。
6. 能重跑：脚本和 SQL 有幂等键或 SHA guard，重复执行不会产生重复或覆盖漂移数据。
7. 能隔离：`REAL / TEST / ARCHIVE / DEFERRED` 边界明确，测试证据不进入正式业务链路。
8. 能发布门禁：每次 PR、同步、修正、发布前后都有只读门禁与基线比对。

## 当前只读基线

生产只读检查时间：2026-06-17

| 项目 | 当前值 |
| --- | ---: |
| `RosterWeek` | 6 |
| `RosterShift` | 210 |
| orphan `RosterShift` | 0 |
| `WeeklyReport` | 10 |
| `WeeklyReportPayload` | 19 |
| `api_db_first_bridge / IMPORTED` | 13 |
| `legacy_weekly_workspace / IMPORTED` | 3 |
| `legacy_weekly_workspace / NEEDS_REVIEW` | 3 |
| `FileRecord` | 0 |
| `AuditLog` | 27 |
| `Notification` | 214 |
| `SalarySlip` | 1 |
| `SalaryNotifyLog` | 1 |
| `PayrollDraftBatch` | 1 |

发布门禁当前仍保持：`deploymentAllowed=false`。

## 总控矩阵

| 模块 | 当前阶段 | 已具备 | 主要缺口 | 下一步 |
| --- | --- | --- | --- | --- |
| 周报正式数据 | `waiting_for_explicit_rollback_rehearsal_authorization` | PR #14 指纹包、PR #15 apply/rollback SQL 草案、PR #16 授权门槛包；12 个 before SHA 当前仍吻合 | 尚未执行 ROLLBACK 事务试跑；尚未真实 COMMIT；3 条周报文本修正仍未落库 | 用户明确授权后，执行 apply draft 且保留 `ROLLBACK;`，验证 10 个 affectedRows 和 after SHA |
| 周报 payload 溯源 | `stable_gate` | `WeeklyReportPayload=19`，分组稳定为 `13 / 3 / 3`；`source / migrationStatus / sourceSha16` 可追踪 | 13 条 `shared/shared/draft` 仍是风险监控项，不进入部署允许 | 每次周报写入或发布前后继续只读检查 shared/shared 是否增长 |
| 排班数据 | `db_stable_ui_blocked` | `RosterWeek=6`、`RosterShift=210`、orphan=0；DB 结构稳定 | `/calendar/roster` Vite 源码或 sourcemap 未恢复，UI 半天班显示修复 blocked | 等 Vite 源码/构建目录/sourcemap 后做源码 patch，不改压缩包 |
| TEST / 审计证据归档 | `schema_draft_only` | C 线已给 `EmployeeLaunchEvidenceArchive` 草案，覆盖 81 条 evidence、幂等键、sourceSha16、blockedReasons | 尚未改 `prisma/schema.prisma`；未生成 migration；未 dry-run 入库；local 附件和 user 映射仍阻塞 | 用户授权后进入 Prisma schema 正式设计，先 migration draft，再 dry-run |
| 附件归档 / FileRecord | `blocked_metadata_mapping` | 当前 `FileRecord=0`，避免把不可达附件硬塞正式表；C 线建议先 evidence archive | `FileRecord` 缺 `storageKey/sourceFile/legacyAttachmentId`；`fileUrl/uploaderUserId` 必填；6 条 local 附件不可达 | 先落 evidence archive；完成文件可达性和上传人映射后再评估 FileRecord 晋级 |
| Notification / 消息 | `deferred_mapping` | 生产已有 `Notification=214`；13 条周报消息已被归入 deferred evidence 候选 | `Notification.userId` 映射和周报消息去重未完成 | 先冻结 source 指纹；补用户映射和去重规则后再考虑 Notification 晋级 |
| AuditLog / auditItems | `archive_pending_user_mapping` | 生产已有 `AuditLog=27`；24 条 auditItems 已归入 archive pending mapping | legacy actor 只是文本，不能伪造 `AuditLog.userId` | evidence archive 保存 `actorText`，完成 `mappedUserId` 后再晋级 |
| 薪资条 | `local_changes_pending_test_db` | 本地已有薪资发布批次、身份字段、通知保留、UAT 工具计划；生产三张薪资表已有少量数据 | 相关代码/schema/migration 仍在未提交工作区；测试库 migration、真实 DB verify、UAT API 闭环未完成；员工端 Vite 源码仍 blocked | 单独开薪资 PR 线，先测试库 migrate + verify + UAT dry-run，不混入周报线 |
| 发布 / 回滚门禁 | `active_gate` | `/api/health` 正常；容器运行；核心计数与 payload 分组稳定；SQL 草案默认 `ROLLBACK` | 还没有正式写库执行记录；rollback tag 仍禁止 | 每个 PR 合并后继续只读门禁；真实写库后必须立刻 postcheck |

## 当前评分

这是执行成熟度评分，不是业务价值评分：

| 能力 | 当前分 | 说明 |
| --- | ---: | --- |
| 稳定存储 | 70 | 周报、排班、薪资已有正式表；证据归档表尚未正式落 schema。 |
| 稳定同步 | 65 | 周报同步口径已收口；薪资和证据归档还在 dry-run / 草案阶段。 |
| 稳定查询 | 70 | 周报和排班可查询；薪资本人查询仍待测试库验证；归档查询表未落地。 |
| 追溯 | 75 | 周报 sourceSha 与指纹包较完整；C 线证据归档追溯还未入库。 |
| 回滚 | 75 | 周报已有 apply/rollback 草案；真实 ROLLBACK 试跑和 COMMIT 窗口未执行。 |
| 重跑幂等 | 70 | 周报有 SHA guard；证据归档幂等键是草案；薪资回填仍待 dry-run 验证。 |
| 发布门禁 | 85 | D 线门禁稳定，但 `deploymentAllowed=false` 仍正确保持。 |

综合当前约为：`73 / 100`。

## 到 100 分的推荐顺序

1. 周报线：授权并完成 ROLLBACK 事务试跑。
2. 周报线：试跑通过后，再由用户第二次授权真实 COMMIT。
3. 周报线：真实写库后立即 postcheck，确认 after SHA、payload 分组、shared/shared 都稳定。
4. C 线：启动 `EmployeeLaunchEvidenceArchive` 正式 Prisma schema 设计。
5. C 线：生成 migration draft 与 evidence dry-run，不写生产库。
6. C 线：通过后再考虑 TEST / 审计证据归档真实入库。
7. 薪资线：独立提交并测试 `publishBatchId`、身份字段、通知记录、UAT 工具。
8. 薪资线：测试库 migration + verify + UAT API 闭环通过后再进入生产判断。
9. B 线：拿到 `/calendar/roster` Vite 源码或 sourcemap 后修 UI，不改压缩包。
10. 全局：形成每个模块的固定 precheck / postcheck / rollback 包，纳入发布门禁。

## 当前禁止事项

- 未授权前，不执行含 `UPDATE` 的周报 apply draft。
- 未完成 ROLLBACK 事务试跑前，不进入真实 COMMIT。
- 不把 payroll/schema 未提交改动混入周报或数据库总控 PR。
- 不改压缩 Vite 发布包。
- 不把 TEST / 审计 evidence 直接塞进正式业务表。
- 不部署、不重启、不打 rollback tag。

## 下一步可选动作

当前最靠近实际数据闭环的一步是：

`授权执行 ROLLBACK 事务试跑`

授权后只会执行 PR #15 的 apply draft，并保留 `ROLLBACK;`。通过标准以 PR #16 授权包为准。
