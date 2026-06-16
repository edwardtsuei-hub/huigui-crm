# 大爱归心 API DB-first 发布、回滚与验收总控 Runbook

日期：2026-06-16
系统：management.hui-health.com / `/opt/huigui-crm`
工作流：D，发布、回滚与验收总控
当前状态：`ready_for_review`
执行状态：仅准备 runbook，未部署，未重启服务，未改代码，未写数据库。

## 范围与边界

本 runbook 只用于 API DB-first 桥发布前后的总控检查，覆盖：

- 部署前检查清单。
- 经用户确认后的发布步骤。
- 发布后验收步骤。
- 异常触发条件和回滚步骤。
- 等 API DB-first 对话框完成后的协助检查入口。

本工作流不执行以下动作：

- 不主动部署。
- 不改 API 或前端代码。
- 不写生产数据库。
- 不读取或打印 `.env` 明文。
- 不触碰旧 `crm.hui-health.com`。
- 不执行 `git reset --hard`。
- 不删除、清空、回滚生产数据表。

## 已读取资料

- `/opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md`
- `/opt/huigui-crm/docs/employee-data-production-migration-record-2026-06-16.md`
- `/opt/huigui-crm/docker-compose.yml`
- `/opt/huigui-crm/api/Dockerfile`

说明：当前本地工作区未挂载 `/opt/huigui-crm` 绝对路径，本 runbook 按当前项目同名文件内容起草，生产路径仍以 `/opt/huigui-crm` 为准。

## 当前生产基线

来自迁移执行记录：

| 项目 | 基线 |
| --- | ---: |
| `WeeklyReportPayload` | 6 |
| `WeeklyReportPayload.IMPORTED` | 3 |
| `WeeklyReportPayload.NEEDS_REVIEW` | 3 |
| `RosterWeek` | 6 |
| `RosterShift` | 210 |
| orphan `RosterShift` | 0 |
| `RosterAuditLog` | 0 |
| `AttendancePeriod` | 0 |

班表团队分布：

| 团队 | 状态 | 周记录 | 班次 |
| --- | --- | ---: | ---: |
| `bearhug-front` | `PUBLISHED` | 1 | 35 |
| `bearhug-kitchen` | `PUBLISHED` | 3 | 105 |
| `daochong` | `PUBLISHED` | 2 | 70 |

已知备份目录：

```text
/opt/huigui-backups/employee-data-migration-20260616-113142
```

发布前必须确认该目录仍存在，并且不得覆盖原备份。

## 等待 API DB-first 交接门槛

在以下文件出现且状态为 `ready_for_review` 或 `done` 前，D 不进入发布检查：

```text
/opt/huigui-crm/docs/parallel-collab-api-db-first-2026-06-16.md
```

该交接文档至少需要包含：

- 实际改动文件清单，预期只包含 `employee-launch.service.ts`、`employee-launch.controller.ts` 和必要 API 检查文件。
- API build/lint 或等价检查结果。
- 班表 GET 已验证 DB-first，数据数量对齐 `RosterWeek=6`、`RosterShift=210`。
- 周报 workspace GET 已验证读取 `WeeklyReportPayload`，并保留 JSON fallback。
- 写入路径已说明是否双写数据库和旧 JSON。
- 精确列出需要 D 验收的接口路径、请求方式和预期返回字段。
- 是否已经部署。若尚未部署，需说明待用户确认后由谁执行部署。

## 发布前检查清单

以下命令只在用户明确确认进入发布检查后执行。

### 1. 登录与目录

```bash
ssh -i ~/.ssh/id_ed25519_guixin_codex_collab_nopass_20260616 -o IdentitiesOnly=yes -o BatchMode=yes claude_ops@49.232.57.98
cd /opt/huigui-crm
```

### 2. 文件与交接检查

```bash
test -f docs/parallel-collab-api-db-first-2026-06-16.md
test -d /opt/huigui-backups/employee-data-migration-20260616-113142
git status --short
git diff -- apps/api/src/employee-launch/employee-launch.service.ts apps/api/src/employee-launch/employee-launch.controller.ts
```

检查规则：

- `git status` 中不能出现 D 工作流以外的未知大范围改动。
- API 改动必须与 A 文档一致。
- 若出现前端、finance、OCR、daochong、courses、Prisma migration 或 Nginx 改动，暂停发布并交给用户确认。

### 3. 记录发布前版本

```bash
mkdir -p /opt/huigui-crm/output/employee-data-migration/2026-06-16
date '+%Y-%m-%d %H:%M:%S %Z'
git rev-parse HEAD
docker compose ps
docker compose images api
docker inspect huigui-api --format '{{.Image}} {{json .Config.Image}}'
```

建议将当前 API 镜像打只读回滚标签：

```bash
PRE_API_IMAGE="$(docker inspect -f '{{.Image}}' huigui-api)"
ROLLBACK_TAG="huigui-api:rollback-pre-db-first-$(date +%Y%m%d%H%M%S)"
docker tag "$PRE_API_IMAGE" "$ROLLBACK_TAG"
echo "$ROLLBACK_TAG"
```

### 4. 发布前服务健康

```bash
curl -fsS https://management.hui-health.com/api/health
docker compose logs --tail=120 api
```

预期：

```json
{"status":"ok","service":"huigui-api"}
```

日志检查：

- 不应有持续重启。
- 不应有数据库连接错误。
- 不应有 employee-launch 相关未处理异常。

### 5. 发布前数据库只读计数

不打印 `.env`。如需查库，只通过容器环境变量引用密码。

```bash
docker compose exec mysql sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -N -B -e "
SELECT \"WeeklyReportPayload\", COUNT(*) FROM WeeklyReportPayload
UNION ALL SELECT \"WeeklyReportPayload.IMPORTED\", COUNT(*) FROM WeeklyReportPayload WHERE status = \"IMPORTED\"
UNION ALL SELECT \"WeeklyReportPayload.NEEDS_REVIEW\", COUNT(*) FROM WeeklyReportPayload WHERE status = \"NEEDS_REVIEW\"
UNION ALL SELECT \"RosterWeek\", COUNT(*) FROM RosterWeek
UNION ALL SELECT \"RosterShift\", COUNT(*) FROM RosterShift
UNION ALL SELECT \"orphan.RosterShift\", COUNT(*) FROM RosterShift rs LEFT JOIN RosterWeek rw ON rw.id = rs.weekId WHERE rw.id IS NULL;
"'
```

必须匹配生产基线：

- `WeeklyReportPayload=6`
- `WeeklyReportPayload.IMPORTED=3`
- `WeeklyReportPayload.NEEDS_REVIEW=3`
- `RosterWeek=6`
- `RosterShift=210`
- `orphan.RosterShift=0`

## 发布步骤

只有在用户明确确认后才执行。默认只发布 API，不重启 web、nginx、mysql。

### 1. 构建 API

```bash
cd /opt/huigui-crm
docker compose build api
```

通过条件：

- Docker build 成功。
- Prisma generate 成功。
- `npm run build -w @huigui/api` 在镜像构建阶段成功。

失败处理：

- 不执行 `docker compose up`。
- 保持现有 `huigui-api` 容器继续运行。
- 将失败日志写入 A 和 D 的记录文件。

### 2. 启动新 API 容器

```bash
docker compose up -d --no-deps api
```

说明：

- 只替换 `huigui-api`。
- 不重启 `huigui-app`、`huigui-nginx`、`huigui-mysql`。
- 如 Docker Compose 因依赖变化要求重建其他服务，暂停并请用户确认。

### 3. 健康检查循环

```bash
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS https://management.hui-health.com/api/health && break
  sleep 3
done
docker compose ps
docker compose logs --tail=160 api
```

通过条件：

- `/api/health` 返回 `ok`。
- `huigui-api` 状态为 Up。
- 日志中没有持续异常。

## 发布后验收

发布后验收分为 P0、P1、P2。P0 必须立即完成，P1 在 A 提供精确接口后完成，P2 可与前端验收工作流 B 联动完成。

### P0 服务可用性

```bash
curl -fsS https://management.hui-health.com/api/health
docker compose ps
docker compose logs --tail=200 api
```

通过条件：

- API health 正常。
- API 容器无异常重启。
- 日志中没有数据库连接失败、Prisma 初始化失败、路由启动失败。

### P0 数据基线不变

重复执行发布前只读计数 SQL。

通过条件：

- `WeeklyReportPayload=6`
- `RosterWeek=6`
- `RosterShift=210`
- `orphan.RosterShift=0`

若发布动作本身改变这些计数，立即暂停并准备回滚。

### P1 DB-first 接口验收

以下接口以 A 的交接文档为准，不在本 runbook 中臆造路径。

验收项目：

- 班表 GET 返回数据库数据。
- 班表返回数量与数据库一致：6 个周记录、210 个班次。
- 周报 workspace GET 能读取 `WeeklyReportPayload` 中的 6 条 payload。
- DB 缺失或异常时的 JSON fallback 已由 A 在非生产破坏性环境或测试中证明。
- 返回格式与前端原有调用兼容。

A 需要给 D 提供的最小验收命令格式：

```bash
curl -fsS 'https://management.hui-health.com/api/<A提供的班表GET路径>' > /tmp/roster-response.json
curl -fsS 'https://management.hui-health.com/api/<A提供的周报workspace路径>' > /tmp/weekly-workspace-response.json
```

验收证据应记录：

- 请求路径。
- HTTP 状态码。
- 关键数组或 payload 数量。
- 与数据库基线的对齐结果。
- 是否命中 fallback，只能通过日志或 A 的非生产测试证明，不能在生产故意破坏数据库。

### P1 双写验收

本工作流不主动写生产数据。

如果用户明确要求验证写入路径，建议先由 A 给出低风险验证方案，并满足：

- 使用可识别测试记录。
- 明确是否会写旧 JSON 和数据库。
- 验证后有用户确认的清理或保留策略。
- D 只做旁路记录，不直接执行写数据库动作。

### P2 页面验收

等前端 localStorage 工作流 B 完成后联动检查：

- 班表页面刷新后仍显示 DB-first 数据。
- 周报 workspace 刷新后不被旧 localStorage 正式数据覆盖。
- localStorage 中正式数据、草稿缓存、UI 状态分界清晰。
- 移动端和桌面端核心页面均可打开。

## 回滚触发条件

出现任一情况即可进入回滚准备：

- `/api/health` 连续 3 次失败。
- `huigui-api` 持续重启或无法启动。
- employee-launch 相关接口 5xx。
- 班表 GET 返回空数据，且未正确 fallback 到旧 JSON。
- 周报 workspace 返回空 payload，且未正确 fallback 到旧 JSON。
- 发布后数据库基线计数异常变化。
- 前端核心员工页面无法加载，且确认由本次 API 发布引起。

## 回滚原则

- 默认只回滚 API 发布，不回滚数据库结构和历史回填数据。
- 不删除 `RosterWeek`、`RosterShift`、`WeeklyReportPayload` 等新表数据。
- 不恢复整库备份，除非用户明确判断存在不可接受的数据污染。
- 回滚前先保留现场：API 日志、当前镜像、当前 git 状态、失败接口响应摘要。
- 回滚完成后重新验收 `/api/health` 和员工页面基础可用性。

## 回滚步骤

以下步骤只在用户确认回滚后执行。

### 1. 保存现场

```bash
cd /opt/huigui-crm
date '+%Y-%m-%d %H:%M:%S %Z'
git status --short
docker compose ps
docker inspect huigui-api --format '{{.Image}} {{json .Config.Image}}'
docker compose logs --tail=300 api > /tmp/huigui-api-rollback-evidence-$(date +%Y%m%d%H%M%S).log
```

### 2. 首选回滚路径：恢复发布前 API 代码版本后重建

适用场景：A 的 API DB-first 改动尚未提交，或已能明确定位只涉及允许文件。

```bash
cd /opt/huigui-crm
git diff -- apps/api/src/employee-launch/employee-launch.service.ts apps/api/src/employee-launch/employee-launch.controller.ts > /tmp/api-db-first-release.diff
```

然后由用户确认采用哪种方式恢复：

- 使用 A 提供的反向 patch。
- 切回发布前提交。
- 从发布前备份复制这两个 API 文件。

恢复后执行：

```bash
docker compose build api
docker compose up -d --no-deps api
curl -fsS https://management.hui-health.com/api/health
docker compose logs --tail=160 api
```

### 3. 备选回滚路径：使用发布前镜像标签

适用场景：发布前已创建 `huigui-api:rollback-pre-db-first-<timestamp>` 标签，并且需要快速恢复容器。

建议先让执行者确认 Docker Compose 当前服务镜像名和回滚标签：

```bash
docker compose images api
docker image ls | grep 'rollback-pre-db-first'
```

若使用镜像标签回滚，应避免手写数据库或环境变量，优先通过 Compose 覆盖文件完成。覆盖文件内容和执行命令必须在现场由用户确认后再落地。

### 4. 回滚后验收

```bash
curl -fsS https://management.hui-health.com/api/health
docker compose ps
docker compose logs --tail=200 api
```

同时重复数据库只读计数，确认回滚没有触碰数据：

- `WeeklyReportPayload=6`
- `RosterWeek=6`
- `RosterShift=210`
- `orphan.RosterShift=0`

## 故障分级与处理

| 级别 | 现象 | 动作 |
| --- | --- | --- |
| P0 | API health 不通、容器启动失败、核心页面不可用 | 立即停止发布验收，准备回滚 |
| P1 | employee-launch 接口 5xx 或数据为空 | 暂停验收，读取日志和 A 文档，必要时回滚 |
| P2 | 页面局部显示旧缓存或数量不一致 | 联动 B 检查 localStorage，不急于回滚 |
| P3 | 日志有一次性 warning | 记录观察，继续 P0/P1 验收 |

## 记录模板

发布或回滚发生时，D 记录文件应追加：

```text
时间：
执行人：
用户确认原文：
发布前 git HEAD：
发布前 API 镜像：
发布动作：
健康检查结果：
DB 只读计数：
DB-first 接口验收：
页面验收：
是否回滚：
停止点：
下一步：
```

## 当前停止点

本 runbook 已准备完成，但不进入发布检查。下一步等待：

1. A 完成 `/opt/huigui-crm/docs/parallel-collab-api-db-first-2026-06-16.md`。
2. 用户明确要求 D 协助检查或进入发布。
3. D 再按本 runbook 做只读检查，并在用户确认后才允许发布或回滚动作。

