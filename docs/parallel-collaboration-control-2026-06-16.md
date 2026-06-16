# 大爱归心 4 路并行协作总控指令

日期：2026-06-16
系统：management.hui-health.com / `/opt/huigui-crm`
目标：让 4 个 Codex 对话框可以同时推进，但不互相覆盖、不重复迁移、不抢同一批文件。

## 共同上下文

服务器：

```bash
ssh -i ~/.ssh/id_ed25519_guixin_codex_collab_nopass_20260616 -o IdentitiesOnly=yes -o BatchMode=yes claude_ops@49.232.57.98
```

项目目录：

```bash
/opt/huigui-crm
```

当前已完成：

- 生产结构迁移已完成。
- 已新增表：`RosterWeek`、`RosterShift`、`RosterAuditLog`、`AttendancePeriod`、`WeeklyReportPayload`。
- 已回填：`WeeklyReportPayload` 6 条、`RosterWeek` 6 条、`RosterShift` 210 条。
- 备份目录：`/opt/huigui-backups/employee-data-migration-20260616-113142`
- 生产迁移记录：`/opt/huigui-crm/docs/employee-data-production-migration-record-2026-06-16.md`

共同安全规则：

1. 不看、不打印 `.env` 明文。
2. 不碰旧 `crm.hui-health.com`，只看 `management.hui-health.com`。
3. 不执行 `git reset --hard`、不回滚别人改动。
4. 不删除生产数据，不清空表。
5. 每个对话框只改自己分配的文件。
6. 动生产数据库前必须先确认已有备份，并在记录文件写明。
7. 每个对话框结束前必须写一份进度记录。

## 统一记录位置

每个对话框都要写入自己的记录文件：

```text
/opt/huigui-crm/docs/parallel-collab-<workstream>-2026-06-16.md
/opt/huigui-crm/output/employee-data-migration/2026-06-16/parallel-collab-<workstream>.json
```

每份记录必须包含：

- 开始时间
- 负责范围
- 读过的关键文件
- 改过的文件
- 执行过的检查
- 当前状态：`not_started` / `in_progress` / `blocked` / `ready_for_review` / `done`
- 停止点
- 下一步建议

## 工作流 A：API DB-first 桥

负责人：当前对话框。

目标：

- 班表接口优先读数据库，数据库失败或缺数据时 fallback 到旧 JSON。
- 周报 workspace 优先读 `WeeklyReportPayload`，fallback 到旧 weekly JSON。
- 写入阶段先采用双写：数据库 + 旧 JSON，保留回滚空间。
- 前端接口路径和返回格式尽量不变。

可改文件：

- `/opt/huigui-crm/apps/api/src/employee-launch/employee-launch.service.ts`
- `/opt/huigui-crm/apps/api/src/employee-launch/employee-launch.controller.ts`
- 必要时只改 API 相关测试或检查脚本。

禁止触碰：

- 前端页面文件。
- finance / OCR / daochong / courses 迁移脚本。
- Nginx 配置。

停止点：

- API build/lint 通过。
- 班表 GET 返回 DB-first 数据，数量对齐：`RosterWeek=6`、`RosterShift=210`。
- 周报 workspace GET 能读到 payload 表，并保留 JSON fallback。
- 线上部署后 `/api/health` 正常。
- 写入 `/opt/huigui-crm/docs/parallel-collab-api-db-first-2026-06-16.md`。

给对话框 A 的启动提示：

```text
你负责大爱归心 API DB-first 桥。先读 /opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md 和 /opt/huigui-crm/docs/employee-data-production-migration-record-2026-06-16.md。只改 employee-launch service/controller。目标是班表和周报 workspace DB-first + JSON fallback + 过渡期双写。不要碰前端、finance、OCR、daochong、courses。完成后写 parallel-collab-api-db-first-2026-06-16.md。
```

## 工作流 B：前端 localStorage 与页面验收

负责人：另一个对话框。

目标：

- 只读扫描前端页面中与班表、周报相关的 localStorage。
- 找出哪些 localStorage 是正式数据、哪些只是草稿/筛选/UI 状态。
- 准备 A 部署后的验收清单。
- 暂时不要改前端，除非 A 已完成并明确交接。

可读文件：

- `/opt/huigui-crm/apps/web/src`
- `/opt/huigui-crm/apps/web`
- 已构建前端 bundle 只用于定位旧缓存 key。

可改文件：

- 只允许新增文档和只读检查脚本。

禁止触碰：

- API 文件。
- Prisma schema / migrations。
- 生产数据库。

停止点：

- 输出 localStorage 分类表。
- 输出页面验收清单。
- 明确列出后续要删/保留的 key。
- 写入 `/opt/huigui-crm/docs/parallel-collab-frontend-localstorage-2026-06-16.md`。

给对话框 B 的启动提示：

```text
你负责大爱归心前端 localStorage 与页面验收。先读 /opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md。只读扫描 apps/web/src 和前端 bundle，列出班表/周报相关 localStorage key，分成正式数据、草稿缓存、UI 状态三类。不要改 API、不要写数据库、不要部署。完成后写 parallel-collab-frontend-localstorage-2026-06-16.md 和机器可读 JSON。
```

## 工作流 C：第二批数据同步 dry-run

负责人：另一个对话框。

目标：

- 对 `schedule.json`、`finance.json`、`ocr-tasks.json`、`platform.json` 做只读 dry-run。
- 不回填生产数据库。
- 产出第二批同步方案和风险排序。

可读数据：

- `/opt/huigui-crm/storage/uploads/employee-launch-contract/schedule.json`
- `/opt/huigui-crm/storage/uploads/employee-launch-contract/finance.json`
- `/opt/huigui-crm/storage/uploads/employee-launch-contract/ocr-tasks.json`
- `/opt/huigui-crm/storage/uploads/employee-launch-contract/platform.json`

可改文件：

- `/opt/huigui-crm/scripts/migrations/employee-data/*dryrun*.mjs`
- `/opt/huigui-crm/docs/parallel-collab-second-phase-dryrun-2026-06-16.md`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/*second-phase*`

禁止触碰：

- API DB-first 桥文件。
- 前端页面文件。
- 生产数据库写入。

停止点：

- 给出 schedule / finance / OCR / platform 的数量、字段、目标表建议。
- 标出哪些必须同步、哪些可以作为附件/审计归档。
- 只生成 dry-run JSON/Markdown，不生成生产执行 SQL。
- 写入 `/opt/huigui-crm/docs/parallel-collab-second-phase-dryrun-2026-06-16.md`。

给对话框 C 的启动提示：

```text
你负责大爱归心第二批数据同步 dry-run。先读 /opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md 和 /opt/huigui-crm/docs/employee-data-cross-function-sync-assessment-2026-06-16.md。只读分析 schedule.json、finance.json、ocr-tasks.json、platform.json，生成 dry-run 报告。不要写生产数据库，不要改 API/前端。完成后写 parallel-collab-second-phase-dryrun-2026-06-16.md 和 output JSON。
```

## 工作流 D：发布、回滚与验收总控

负责人：另一个对话框。

目标：

- 准备 API DB-first 的发布检查清单。
- 准备回滚方案。
- 监控部署前后服务状态。
- 不主动部署，除非 A 已完成并得到用户确认。

可读文件：

- `/opt/huigui-crm/docker-compose.yml`
- `/opt/huigui-crm/api/Dockerfile`
- `/opt/huigui-crm/docs/employee-data-production-migration-record-2026-06-16.md`
- `/opt/huigui-crm/docs/parallel-collab-api-db-first-2026-06-16.md`，如果已存在

可改文件：

- 只允许新增发布记录和回滚 runbook。

禁止触碰：

- API 代码。
- 前端代码。
- 数据库数据。
- Docker 重启或部署命令，除非用户明确确认。

停止点：

- 输出部署前检查、部署步骤、回滚步骤、验收步骤。
- 写入 `/opt/huigui-crm/docs/parallel-collab-release-control-2026-06-16.md`。

给对话框 D 的启动提示：

```text
你负责大爱归心发布、回滚与验收总控。先读 /opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md 和 /opt/huigui-crm/docs/employee-data-production-migration-record-2026-06-16.md。只准备发布/回滚/验收 runbook，不主动部署、不改代码、不写数据库。等 API DB-first 对话框完成后再协助检查。完成后写 parallel-collab-release-control-2026-06-16.md。
```

## 颗粒度对齐规则

每个工作流的最小完成颗粒度是“一份可读文档 + 一份机器 JSON + 明确停止点”。

不要跨流继续做下一阶段。例如：

- B 发现前端需要改，也只写建议，不直接改。
- C 发现 finance 可回填，也只写 dry-run，不生成生产执行 SQL。
- D 准备好部署方案，也不主动重启服务。
- A 部署前必须完成 build/验收，并写明是否需要 D 协助。

## 当前锁定状态

截至本文件创建时：

- A：进行中，正在改 API DB-first 桥。
- B：可启动。
- C：可启动。
- D：可启动。

其他对话框启动后，应先创建自己的记录文件，并把状态写成 `in_progress`。
