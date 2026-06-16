# 管理端周报页面只读追踪：正式 WeeklyReport / shared / orphan

日期：2026-06-16
执行时间：2026-06-16 17:19:47 +0800
状态：ready_for_review
范围：只读追踪 `https://management.hui-health.com/work-management/weekly-reports` 当前线上页面、运行包与本地相关源码。
约束：未改代码、未部署、未写数据库；页面侧只做打开、查看和一个未提交成员详情抽屉观察，未点击新增、保存、提交、催办、群发、批量处理等写入动作。

## 运行入口

仓库根目录未发现 `.codegraph/`，本轮改用只读检索与线上包比对。

线上 `https://management.hui-health.com/work-management/weekly-reports` 返回同一套 Vite SPA 静态入口：

- HTTP 状态：`200`
- Server：`nginx/1.27.5`
- `last-modified`：`Tue, 16 Jun 2026 01:02:39 GMT`
- 主 JS：`/assets/index-C20sRqov.js`
- 主 CSS：`/assets/index-DUmE3prg.css`
- HTML SHA-256：`c8e29d9010208ed689be0fdc4e8eedf46359607b2256327be452dc01d7a9bc0d`

当前本地可对应 release 包：

- `apps/web/public/employee-frontend/releases/20260616090241/assets/index-C20sRqov.js`
- `apps/web/public/employee-frontend/releases/20260616090241/assets/index-DUmE3prg.css`

包内路由：

- `path:"work-management/weekly-reports"`
- `routeLabel:"周报工作台"`
- 组件符号：`UL`

## 当前页面结论

当前线上页面不是旧 Next `apps/web/app/(dashboard)/work-management/weekly-reports/page.tsx` 直接渲染的那套“历史周报 / 团队已提交周报 / 团队周报闭环”页面，而是 Vite 包里的新版周报工作台组件 `UL`。

在 `UL` 中，URL 参数会被读取：

- `view`
- `member`
- `detail`
- `focus`
- `summary`
- `from`
- `workspace`

其中 `workspace=shared` 只被用于判断是否进入团队/共享工作台状态：

- `u = searchParams.get("workspace") === "shared"`
- `v = u || view === "team" || ...`

它不会触发独立的 shared/orphan 周报接口，也没有将 shared/orphan 作为单独数据源展示。

## 正式 WeeklyReport 数据链路

当前包里正式周报的 API 入口是：

- `QD()` 调用 `GET /work-management/weekly-reports`
- 只解析 `pendingWeeklyReport`、`items`、`teamItems`
- `XD()` 只遍历 `teamItems`
- `JD()` 将非草稿团队周报映射成团队阅读条目

关键逻辑：

- `JD(report, member)` 对 `status === "DRAFT"` 直接返回 `null`。
- 非草稿记录会被打上 `正式周报` 标签。
- 指标摘要使用 `正式周报：${...}` 或 `正式周报已提交；计划 ...`。
- 同步提示为：`${name} 的正式周报已同步到团队视图。`

后端接口也只查正式 Prisma `WeeklyReport`：

- `apps/api/src/work-management/work-management.controller.ts:51` 到 `54`：`GET weekly-reports` 调用 `listWeeklyReports`。
- `apps/api/src/work-management/work-management.service.ts:566` 到 `594`：`items` 查询本人 `weeklyReport`，`teamItems` 查询可见成员的 `weeklyReport`。
- `apps/api/src/work-management/work-management.service.ts:2992` 到 `2999`：通过 `buildWeeklyReportWhere` 合并正式记录分区过滤。

因此，真正从服务端 WeeklyReport 模型进入团队阅读列表的，是正式 `WeeklyReport` 的 `teamItems`，且草稿不会被 `JD()` 并入团队阅读条目。

## 页面实测表现

使用已有 Chrome 登录态打开：

`https://management.hui-health.com/work-management/weekly-reports?view=team&workspace=shared&from=mobile-management`

登录身份：

- `综合办公室`
- `办公室管理员`
- `创办人 · edwardtsuei`

页面可见结构：

- 标题：`6 月第 3 周 周报`
- 说明：`待评、需协助、未提交。`
- 当前视角：`团队视角`
- 主区：`跨团队周报阅读`
- 当前统计：`待读 16`、`当前 16 人`、`已提交 1`
- 列表标题：`命中 16 位需提交成员`

正式 WeeklyReport 的可见表现：

- `lisa` 行显示 `已提交`
- 行内摘要出现 `正式周报：本周完成：Submit smoke restored formal DB status. 重点进展：Wait for five-person resubmission acceptance.`
- 这符合包内 `JD()` 对正式 `WeeklyReport` 的映射方式。

非正式/缺交成员的可见表现：

- `阿蕊`、`程程`、`了了`、`申琦`、`许研`、`雅南`、`慧心`、`嘉敏`、`觉心`、`李瑶瑶`、`譚喜`、`燕子`、`杨慧敏`、`周立猛`、`子青` 等显示 `待提交` / `本期未交`。
- 这些行不是独立 orphan 周报卡片，而是“需提交成员”占位行。
- 行内文案是提醒补交，例如：`还没提交周报，先提醒补齐本周进展和下周动作。`

## shared/orphan 缺失的具体表现

1. URL 有 `workspace=shared`，但页面没有展示“共享周报”“共享收件箱”“shared workspace 来源”或类似区域。
2. 包内没有 `orphan` 字符串；当前路由没有 orphan 查询、orphan tab、orphan count 或 orphan detail。
3. 页面没有显示“未归属周报”“孤儿周报”“无法匹配成员的周报”“共享/orphan 待认领”等入口。
4. `GET /work-management/weekly-reports` 的解析结构只有 `pendingWeeklyReport/items/teamItems`，没有 `sharedItems`、`orphanItems`、`unmatchedItems` 之类字段。
5. `teamItems` 会被 `JD()` 映射为 `正式周报`；DRAFT 会被跳过，缺交成员靠团队名单生成占位，不是 orphan 周报。
6. `名单规则` 区域显示 `需提交 16 / 17`，但只是需提交名单与可见范围；没有展示第 17 个缺口是否为 orphan，也没有给出认领入口。
7. `各部门周报统一汇总` 显示 `可汇总 0 / 5`，阶段性汇总只提示 `申琦、阿蕊、程程、李瑶瑶 待提交；lisa 待以达 / 涵予确认`，没有列出共享/orphan 来源。
8. 页面底部相关卡片如 `团队动态`、`月目标风险` 等为空态时，文案为 `暂无团队动态`、`暂无团队周报或需协助记录`，不是 shared/orphan 的空态说明。

## 未提交成员详情抽屉观察

只读点击 `阿蕊` 行的 `查看详情` 后，页面打开侧边详情抽屉，URL 未切换到 `reportId`，仍停留在：

`/work-management/weekly-reports?view=team&workspace=shared&from=mobile-management`

抽屉显示：

- 标题：`阿蕊`
- 状态：`待提交`、`本期未交`、`未点评`、`待补运营状态`、`未催办`
- 范围：`熊抱大地 · 门店经营`
- 可见范围：`熊抱大地当前需提交成员 · 可见：lisa、崔以达、张涵予`
- 正文提示：`本期未提交`
- 解释：`阿蕊 本期还没有提交；下方为上期（今天 15:20）记录，上期状态为 已提交 / 待点评。`

异常/缺口表现：

- 抽屉内同时出现 `阿蕊 已提交熊抱大地 · 门店经营周报，当前可进入主管点评和目标跟进。`
- 但顶部状态又是 `待提交` / `本期未交`。
- 这说明当前详情不是正式 `WeeklyReport` 详情，也不是 orphan 周报详情，而是用团队成员规则 + 上期记录/本地团队视图生成的缺交成员阅读抽屉。
- 页面没有提供把该缺交成员与共享/orphan 周报匹配或认领的动作。

## 结论

当前 `/work-management/weekly-reports` 页面中，真正从服务端进入列表并标成“正式周报”的数据只来自正式 Prisma `WeeklyReport` 的 `teamItems`。

但页面并不是“只展示正式 WeeklyReport”这么简单：它还展示了根据需提交名单生成的 `待提交 / 本期未交` 成员占位行，并用上期记录或本地团队视图补出详情抽屉。

shared/orphan 周报缺失的核心表现是：

- 有 `workspace=shared` 参数，但没有 shared/orphan 数据源。
- 有“跨团队周报阅读”和“需提交成员”列表，但没有“共享周报”或“orphan 周报”列表。
- 未提交成员只显示占位/上期摘要，不会显示真实 orphan 周报正文，也没有认领/匹配入口。
- 当前包、当前后端接口、当前可见页面均未发现 orphan 处理链路。

## 只读后续建议

- 如果要验收 shared/orphan，需要先明确 shared/orphan 的后端数据模型或接口字段，例如 `sharedItems`、`orphanItems`、`unmatchedReports`。
- 前端应在 `workspace=shared` 下展示独立的 shared/orphan 区块，而不是只切到团队视角。
- 未提交成员详情里“已提交”与“本期未提交”的混合文案需要单独复核，避免把上期记录误读成本期正式周报。
