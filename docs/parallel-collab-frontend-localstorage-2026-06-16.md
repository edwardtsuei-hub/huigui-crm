# 前端 localStorage 与页面验收记录

日期：2026-06-16
工作流：B，前端 localStorage 与页面验收
开始时间：2026-06-16 12:13 +0800
结束时间：2026-06-16 12:30 +0800
当前状态：done

## 负责范围

- 只读扫描前端源码和已构建前端 bundle 中与班表、周报相关的 localStorage key。
- 将 key 分为正式数据、草稿缓存、UI 状态三类。
- 准备 API DB-first 部署后的页面验收清单。
- 本轮没有修改 API、Prisma、数据库、部署配置，也没有执行部署。

## 路径说明

- 启动提示要求先读 `/opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md`。
- 本机 `/opt/huigui-crm` 不存在；已读取当前仓库同名文件：`docs/parallel-collaboration-control-2026-06-16.md`。
- 当前仓库没有 `.codegraph/`，按指令跳过 CodeGraph。
- 当前仓库没有 `apps/web/src`，前端源码实际位于 `apps/web/app`、`apps/web/components`、`apps/web/lib`。
- 当前仓库没有 `.next`、`dist`、`build` 前端构建目录；已构建员工端 bundle 位于 `apps/web/public/employee-frontend/releases/20260616090241/assets`。

## 读过的关键文件

- `docs/parallel-collaboration-control-2026-06-16.md`
- `apps/web/components/shift-roster/ShiftSchedulerNative.tsx`
- `apps/web/components/shift-roster/ShiftSchedulerEmbedded.tsx`
- `apps/web/public/embedded/shift-scheduler-v9.html`
- `apps/web/app/(dashboard)/schedule/shifts/page.tsx`
- `apps/web/app/(dashboard)/schedule/page.tsx`
- `apps/web/app/(dashboard)/work-management/weekly-reports/page.tsx`
- `apps/web/app/(dashboard)/work-management/team/weekly-reports/page.tsx`
- `apps/web/lib/api.ts`
- `apps/web/lib/workspace.ts`
- `apps/web/public/employee-frontend/releases/20260616090241/assets/app-local-adapters-D0DYFoBy.js`
- `apps/web/public/employee-frontend/releases/20260616090241/assets/index-C20sRqov.js`
- `apps/web/public/employee-frontend/releases/20260616090241/assets/ecom-weekly-components-CcSI8B5U.js`

## 当前页面事实

- 当前 `/schedule/shifts` 使用 `ShiftSchedulerNative`，通过 `/settings/shift-roster` 读取和保存班表；该原生页面没有直接写 localStorage。
- `ShiftSchedulerEmbedded` 仍会把注入的班表配置写入 `shift_local_standalone_v9`，同时通过父页面保存到 `/settings/shift-roster`。它是系统版缓存，不应在验收前清掉。
- 旧免部署 HTML `public/embedded/shift-scheduler-v9.html` 完全依赖 `shift_local_standalone_v9`，直接打开时仍是本机本浏览器独立数据。
- 当前 `/work-management/weekly-reports` 通过 API 读写周报列表、草稿、详情、提交、审阅、归档、公开摘要、团队闭环和催交，没有直接写 localStorage。
- 当前 `/schedule` 会读取周报计划项并把选中的计划项回写到周报 API 的 `plannedAt`，没有直接写 localStorage。
- 员工端旧 bundle 仍保留多组周报、班表、离线队列和 UI 配置 key，属于迁移清理风险点。

## 正式数据 key

| key / pattern | 来源 | 内容 | 后续处理 |
| --- | --- | --- | --- |
| `shift_local_standalone_v9` | `ShiftSchedulerEmbedded.tsx`、`public/embedded/shift-scheduler-v9.html` | 班表 DB 对象：`users`、`staff`、`shiftTimes`、`schedules.weekly`、`dailyInfo`。系统版也会写本地缓存。 | 保留到 `/settings/shift-roster` DB-first 读取、保存、刷新都验收通过；旧免部署用户若仍使用，需先导出或迁移。 |
| `da-ai-gui-xin.weekly-workspace.v1.<userId>` | 员工端 `index-C20sRqov.js` | 旧周报 workspace：`reportDraft`、`weekReports`、`monthlyReportDraft`、`weeklyRules`、`teamReports`、汇总发布草稿等。 | DB payload 对齐后再清理；清理前按 userId 导出备份，避免覆盖旧历史周报。 |
| `da-ai-gui-xin.weekly-workspace.api.v1.<userKey>` | 员工端 `app-local-adapters-D0DYFoBy.js` | 新员工端本地 API 适配 workspace，结构接近旧周报 workspace，`meta.syncMode` 可为 `mock_storage`。 | 若正式 API 可用，不应继续作为生产来源；保留到确认没有未迁移记录。 |
| `da-ai-gui-xin.mobile-work-report-ui.v1` | 员工端 `index-C20sRqov.js` | 手机工作汇报记录，含 `mode=weekly/activity`、`status=draft/submitted`、`done`、`next`、`support`、附件和通知状态。 | 对 `status=submitted` 且未入库的记录做人工比对；草稿属于用户本地内容。 |
| `da-ai-gui-xin.ecom-weekly.v1.<weekRange>` | 员工端 `ecom-weekly-components-CcSI8B5U.js` | 电商周报看板覆盖项、叙事内容和发布参数，按周区间存。 | 属电商周报独立范围；如后续纳入正式周报，应单独迁移，不随本次核心周报 key 直接删除。 |
| `da-ai-gui-xin.schedule-record.v2` | 员工端 `app-local-adapters-D0DYFoBy.js` | 请假、出勤、班表备注联动的本地业务记录，代码标记为 `mock_api` / 本地持久化。 | 作为旧员工端本地业务痕迹保留；若正式出勤和班表表已覆盖，再归档清理。 |
| `da-ai-gui-xin.roster-profiles.v1` | 员工端 `index-C20sRqov.js` | 排班人员配置：是否参与排班、组别、全职/兼职、是否需要账号、是否需要周报、是否需要班表权限。 | 属班表/周报配置，先保留；后续可迁到人员或权限表。 |
| `da-ai-gui-xin.roster-permissions.v1` | 员工端 `index-C20sRqov.js` | 用户到可管理班表组别的映射，例如道冲、熊抱前厅、熊抱后厨。 | 属权限配置，先保留；确认正式权限模型覆盖后再清。 |

## 草稿缓存 key

| key / pattern | 来源 | 内容 | 后续处理 |
| --- | --- | --- | --- |
| `da-ai-gui-xin.weekly.pending-sync.v1` | 员工端 `index-C20sRqov.js` | 周报 API 失败时的待同步队列，含 `kind=draft/submit`、`userKey`、`weekNumber`、payload、attempts、lastError。 | API DB-first 稳定后先重放或人工确认，再清空；不可直接当正式周报入库。 |
| `da-ai-gui-xin.weekly-pending-sync.v1` | 员工端 `index-C20sRqov.js` | 旧名称待同步队列；代码会合并读取并迁到 `weekly.pending-sync.v1`。 | 兼容旧缓存；若新 key 队列为空，可一并删除。 |
| `da-ai-gui-xin.ecom-weekly.v1.parsed` | 员工端 `ecom-weekly-components-CcSI8B5U.js` | 电商周报导入后的 parsed snapshot 和 meta。 | 成功导入或重置后可删除。 |
| `huigui-workspace-items` | `apps/web/lib/workspace.ts` | 本地工作台临时协作项，kind 可为 `schedule`、`todo`、`reminder` 等，最多保留 80 条。 | 不是正式班表或周报；如页面验收发现重复待办，可清理或迁移为正式任务。 |

## UI 状态 key

| key / pattern | 来源 | 内容 | 后续处理 |
| --- | --- | --- | --- |
| `huigui-record-scope` | `apps/web/lib/api.ts` | 当前浏览器数据模式，`REAL` 或 `TEST`，会作为 API header 影响周报和日程请求。 | 保留；验收正式数据前确认值为 `REAL`。 |
| `huigui-test-batch-id` | `apps/web/lib/api.ts` | 测试批次 ID，只有 TEST 模式有效。 | 保留；正式验收前应为空。 |
| `huigui-test-batch-name` | `apps/web/lib/api.ts` | 测试批次名称，只有 TEST 模式有效。 | 保留；正式验收前应为空。 |
| `ecom-weekly-api-mode` | 员工端 `ecom-weekly-components-CcSI8B5U.js` | 电商周报 API/local/locked 模式候选 key；本文件只发现常量和模式调用，未发现同文件直接 set/get。 | 只作为 UI 模式候选观察，不纳入核心迁移。 |

未列入：`huigui_token`、`huigui_user`、登录有效期、侧边栏折叠、首屏引导、文件视图模式等，它们不是班表/周报业务数据。

## A 部署后的页面验收清单

### 班表

1. 用正式账号打开 `/schedule/shifts`，确认页面可加载，无本地缓存也能显示数据库数据。
2. 确认前厅、后厨、道冲元气三个部门都能切换，周视图日期和人员行数稳定。
3. 对照 API 侧目标：`RosterWeek=6`、`RosterShift=210`，确认页面覆盖 6 周、210 条班次。
4. 刷新页面、换浏览器或清空 `shift_local_standalone_v9` 后再次打开，确认页面仍从 API 恢复数据。
5. 只有在用户确认可写后，编辑一个低风险备注或测试班次，确认 PATCH `/settings/shift-roster` 成功，刷新后仍保留。
6. 直接打开 `/embedded/shift-scheduler-v9.html` 时，应明确它仍是免部署本地版，不作为生产 DB-first 验收入口。

### 周报

1. 用正式账号打开 `/work-management/weekly-reports`，确认列表、待提交、团队项可加载。
2. 打开一个周报详情，确认草稿字段、复盘项、计划项、审阅记录都来自 API。
3. 进入归档视图和团队闭环，确认 `/archive`、`/team-closure`、`/remind` 相关交互没有退回旧 localStorage。
4. 在 `/schedule` 打开“周报同步”候选，选择周报计划项生成日程，确认周报计划项的 `plannedAt` 回写 API。
5. 验收浏览器 localStorage：当前管理端操作不应新增 `da-ai-gui-xin.weekly-workspace.*` 或 `weekly.pending-sync.*`。
6. 正式验收前确认 `huigui-record-scope=REAL`，且 `huigui-test-batch-id`、`huigui-test-batch-name` 为空。

## 后续删 / 保留建议

- 保留：所有正式数据 key，直到 DB-first 读写和历史 payload 数量对齐完成。
- 可清：`weekly.pending-sync` 两个队列在重放或人工确认后清；`ecom-weekly.v1.parsed` 在导入成功后清。
- 谨慎清：`shift_local_standalone_v9`，只有确认所有使用者都已切到系统版或数据已导出后再清。
- 不迁移：纯 UI 状态 key 不进入数据库，只在验收前校验是否影响正式模式。

## 改过的文件

- 新增 `docs/parallel-collab-frontend-localstorage-2026-06-16.md`
- 新增 `output/employee-data-migration/2026-06-16/parallel-collab-frontend-localstorage.json`

## 执行过的检查

- 检查 `.codegraph/`：不存在，跳过 CodeGraph。
- 检查 `/opt/huigui-crm`：不存在，改读当前仓库同名协作控制文档。
- 检查 `apps/web/src`：不存在，改按当前源码目录扫描。
- 扫描源码 localStorage/sessionStorage 调用。
- 扫描最新员工端 bundle 的 localStorage key、动态 key 模式和候选旧缓存。
- 核对当前班表、周报页面的 API 调用路径。

## 停止点

localStorage 分类表、页面验收清单和机器可读 JSON 已完成。等待 API DB-first 工作流交接后，可按上面的验收清单做页面验收；本轮不继续部署、不改 API、不写数据库。
