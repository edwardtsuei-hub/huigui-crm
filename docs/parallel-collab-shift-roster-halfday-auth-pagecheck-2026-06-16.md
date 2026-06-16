# 管理端班表 halfDay 登录后页面复核

日期：2026-06-16
执行时间：2026-06-16 16:22:44 +0800
工作流：B 线 halfDay 登录后页面复核
当前状态：ready_for_review_with_findings
只读约束：未改代码、未写数据库、未部署、未重启、未提交账号密码；页面侧只做查看、展开、生成预览和本地窄屏查看，未点击保存草稿、发布班表、保存备注、复制图片、下载图片。

## 指定输入文档读取

用户要求先读：

- `/opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md`
- `/opt/huigui-crm/docs/parallel-collab-shift-roster-halfday-time-bridge-2026-06-16.md`

本机结果：

- `/opt/huigui-crm/docs/parallel-collaboration-control-2026-06-16.md` 不存在；已读取当前仓库副本 `docs/parallel-collaboration-control-2026-06-16.md`。
- `/opt/huigui-crm/docs/parallel-collab-shift-roster-halfday-time-bridge-2026-06-16.md` 不存在；当前仓库也未找到同名或 `halfday-time-bridge` 副本。

## 指定输出路径

用户要求写入：

- `/opt/huigui-crm/docs/parallel-collab-shift-roster-halfday-auth-pagecheck-2026-06-16.md`
- `/opt/huigui-crm/output/employee-data-migration/2026-06-16/parallel-collab-shift-roster-halfday-auth-pagecheck.json`

本机 `/opt/huigui-crm` 不存在，且创建 `/opt/huigui-crm` 返回 `Permission denied`。因此本轮实际落地到当前仓库同名路径：

- `docs/parallel-collab-shift-roster-halfday-auth-pagecheck-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-shift-roster-halfday-auth-pagecheck.json`

## 登录态与入口

- 已使用 Chrome 现有浏览器登录态进入管理端。
- 当前登录身份：`综合办公室 / 办公室管理员 / 创办人 · edwardtsuei`。
- 直接访问用户指定的 `https://management.hui-health.com/schedule/shifts` 后，线上页面未停留在 `/schedule/shifts`；从管理端首页的“更多入口”进入排班，实际可见入口是 `https://management.hui-health.com/calendar/roster`。
- 首页“日程”入口显示：`排班 设置下一周班表`，链接为 `/calendar/roster`。

## 运行包与旧 standalone 影响面

- 本地源码确认：`apps/web/app/(dashboard)/schedule/shifts/page.tsx` 仍直接返回 `ShiftSchedulerNative`。
- 本地源码确认：`ShiftSchedulerNative.tsx` 通过 `apiFetch("/settings/shift-roster")` 读取数据，未检出直接读写 `localStorage` 或 `shift_local_standalone_v9`。
- `shift_local_standalone_v9` 只在 `ShiftSchedulerEmbedded.tsx` 和 `public/embedded/shift-scheduler-v9.html` 相关路径中出现。
- 线上实测确认：当前可见生产排班页实际为 `/calendar/roster`，不是 `/schedule/shifts`；当前仓库未找到 `/calendar/roster` 对应源码文件，因此不能把当前线上可见页确认为 `ShiftSchedulerNative` 运行包。
- 结论：旧 `/schedule/shifts` 源码仍是 `ShiftSchedulerNative`，且不直接受 `shift_local_standalone_v9` 影响；当前生产可见入口已切到 `/calendar/roster`，需要按该路由另行追源码/构建包才能确认包名。

## 前厅 迦迦 halfDay 数据

实测位置：`/calendar/roster`，范围 `熊抱前厅 / 前厅`，周期 `本周 06/15-06/21`，状态 `已发布`，同步状态 `发布版已同步`。

| 日期 | 桌面表格按钮文案 | 时间 | 结论 |
| --- | --- | --- | --- |
| 2026-06-15 | 半天 | 09:50-14:00 | 时间正确；按钮为短标签“半天”，不是完整“半天班” |
| 2026-06-16 | 半天 | 09:50-14:00 | 时间正确；按钮为短标签“半天”，不是完整“半天班” |
| 2026-06-17 | 半天 | 09:50-14:00 | 时间正确；按钮为短标签“半天”，不是完整“半天班” |
| 2026-06-20 | 半天 | 09:50-14:00 | 时间正确；按钮为短标签“半天”，不是完整“半天班” |
| 2026-06-21 | 半天 | 09:50-14:00 | 时间正确；按钮为短标签“半天”，不是完整“半天班” |

未见“早班”。目标 5 天均为半天时段 `09:50-14:00`。

## 页面区域复核

| 区域 | 状态 | 证据与说明 |
| --- | --- | --- |
| 桌面表格 | partial | 迦迦 5 个目标日期均显示 `半天`，时间均为 `09:50-14:00`；未见 `早班`，但不是完整 `半天班`。 |
| 手机按钮 / 卡片 | partial | 将 Chrome 窗口缩至约 430px 后，页面仍是可横向滚动班表，不是独立手机卡片；迦迦目标按钮仍为 `半天` + `09:50-14:00`，不是完整 `半天班`。 |
| 班次选择弹窗 | not_matched_current_ui | 当前 `/calendar/roster` 页面使用原生下拉/选择控件，不是“选择班次”弹窗；已聚焦迦迦 06/15 控件，当前选中项为 `半天`，没有改选。未捕获到完整 `半天班` 选项弹窗。 |
| 班次设置 / 模板 | pass | 右侧“班次模板”显示 `半天班`，并显示 `09:50-14:00 · 前厅兼职`，同时有短标签 `半天`。 |
| 导出预览 | fail_readability | 点击 `生成图片` 后出现“班表图片”预览弹窗和复制/下载按钮，未复制或下载；预览图内中文标题、姓名、表头呈乱码，无法确认预览图中可读显示 `半天班` 或目标时段。 |

## 主要结论

1. 前厅 `迦迦` 在 2026-06-15、06-16、06-17、06-20、06-21 的班次时间均已显示为 `09:50-14:00`，且未显示为“早班”。
2. 桌面与窄屏按钮实际显示短标签 `半天`，不是用户要求的完整 `半天班`。
3. 班次模板区域完整显示 `半天班 09:50-14:00 · 前厅兼职`，这一项通过。
4. 当前生产入口为 `/calendar/roster`，用户指定的 `/schedule/shifts` 未作为实际可见页面停留；因此“当前线上运行包仍是 ShiftSchedulerNative”不能仅凭当前页面确认。
5. 导出预览存在中文乱码，无法作为“半天班”文案验收通过证据。

## 停止点

已完成登录后只读页面复核并输出记录。未执行保存、发布、下载、复制图片、数据库写入、代码修改、部署或重启。

## 下一步建议

- 若验收口径要求所有区域必须显示完整 `半天班`，当前桌面表格、窄屏按钮和选择控件应调整或补充显示文案。
- 需要定位当前 `/calendar/roster` 的源码/构建包，确认它与旧 `/schedule/shifts` / `ShiftSchedulerNative` 的关系。
- 导出图片需修复中文乱码后再复核 `半天班` 和 `09:50-14:00`。
