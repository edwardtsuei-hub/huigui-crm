# B 线班表 UI 复核后续：/calendar/roster 运行包追踪

日期：2026-06-16
执行时间：2026-06-16 16:51:16 +0800
状态：ready_for_review
约束：只读源码与运行包追踪；未改业务代码、未写数据库、未部署、未重启。

## 输入报告读取

用户要求先读：

- `/opt/huigui-crm/docs/parallel-collab-shift-roster-halfday-auth-pagecheck-2026-06-16.md`

本机结果：

- `/opt/huigui-crm` 不存在，`/opt` 为 root 所有目录。
- 已读取当前仓库副本：`docs/parallel-collab-shift-roster-halfday-auth-pagecheck-2026-06-16.md`。

前置报告结论摘要：

- 线上实际可见排班入口为 `https://management.hui-health.com/calendar/roster`。
- 前厅 `迦迦` 在 2026-06-15、06-16、06-17、06-20、06-21 的时间均为 `09:50-14:00`，未见 `早班`。
- 桌面和窄屏区域显示短标签 `半天`，不是完整 `半天班`。
- 班次模板区域显示 `半天班 09:50-14:00 · 前厅兼职`。
- 导出预览弹窗存在中文乱码。

## CodeGraph

仓库根目录未发现 `.codegraph/`，因此本轮未使用 CodeGraph，改用只读文件检索与线上静态包校验。

## 线上运行包定位

对线上地址 `https://management.hui-health.com/calendar/roster` 做只读 GET 后，返回的是 Vite SPA 静态入口：

- HTTP 状态：`200`
- Server：`nginx/1.27.5`
- `content-type`：`text/html`
- `last-modified`：`Tue, 16 Jun 2026 01:02:39 GMT`
- `cache-control`：`no-store, no-cache, must-revalidate`
- 主 JS：`/assets/index-C20sRqov.js`
- 主 CSS：`/assets/index-DUmE3prg.css`

同样只读请求 `https://management.hui-health.com/schedule/shifts`，HTML SHA-256 与 `/calendar/roster` 完全一致：

- `/tmp/hui-calendar-roster.html`：`c8e29d9010208ed689be0fdc4e8eedf46359607b2256327be452dc01d7a9bc0d`
- `/tmp/hui-schedule-shifts.html`：`c8e29d9010208ed689be0fdc4e8eedf46359607b2256327be452dc01d7a9bc0d`

线上主包与当前仓库 release 包哈希一致，当前 `/calendar/roster` 对应构建包已定位为：

- `apps/web/public/employee-frontend/releases/20260616090241/assets/index-C20sRqov.js`
- `apps/web/public/employee-frontend/releases/20260616090241/assets/index-DUmE3prg.css`

哈希证据：

| 文件 | SHA-256 |
| --- | --- |
| 线上 `/assets/index-C20sRqov.js` | `4f46b12ebd38da79d656e0e6c823fc00d3adb79699f58feb3b67e3c75cf984fc` |
| 本地 release `index-C20sRqov.js` | `4f46b12ebd38da79d656e0e6c823fc00d3adb79699f58feb3b67e3c75cf984fc` |
| 线上 `/assets/index-DUmE3prg.css` | `cd2dd643d6db76a15500221d800df81a232d91fda280b49cccfcf9a95b15c6c6` |
| 本地 release `index-DUmE3prg.css` | `cd2dd643d6db76a15500221d800df81a232d91fda280b49cccfcf9a95b15c6c6` |

源码映射限制：

- `https://management.hui-health.com/assets/index-C20sRqov.js.map` 返回 `404`。
- `https://management.hui-health.com/assets/index-DUmE3prg.css.map` 返回 `404`。
- 因无 sourcemap，本轮只能定位到当前线上构建包和压缩后组件符号，不能从 sourcemap 反查未压缩 TSX 源文件。

## 当前路由与 ShiftSchedulerNative 的关系

当前仓库旧 Next 路由仍存在：

- `apps/web/app/(dashboard)/schedule/shifts/page.tsx` 导入并返回 `ShiftSchedulerNative`。
- `apps/web/components/shift-roster/ShiftSchedulerNative.tsx` 使用 `apiFetch("/settings/shift-roster")`。

但当前线上 `/calendar/roster` 与 `/schedule/shifts` 返回同一个 Vite SPA HTML，且主包 `index-C20sRqov.js` 内部路由明确包含：

- `path:"calendar/roster"`
- 对应渲染组件为压缩符号 `dP`
- 权限包装 `routeLabel:"排班"`，`allowedIdentities:["office_admin","daochong_manager","bearhug_manager"]`

主包内未检出：

- `ShiftSchedulerNative`
- `shift_local_standalone_v9`

结论：

- 当前线上 `/calendar/roster` 对应的可追踪运行包是 Vite 构建包 `index-C20sRqov.js`，页面组件为压缩符号 `dP`。
- 不能确认当前线上 `/calendar/roster` 仍是 `ShiftSchedulerNative`；相反，证据显示它不是旧 Next `ShiftSchedulerNative` 入口。
- `/schedule/shifts` 在线上也落到同一个 Vite SPA 静态入口，不能再按本地 Next 路由文件直接判断线上实际页面。
- `shift_local_standalone_v9` 只在 `ShiftSchedulerEmbedded.tsx` 与 `public/embedded/shift-scheduler-v9.html` 出现；当前线上主包没有这个 key，因此 standalone v9 不影响当前 `/calendar/roster` 运行页。

## 为什么显示短标签“半天”

当前构建包内的前厅班次模板定义同时有完整值、完整标题和短标签：

- `value:"半天班"`
- `label:"半天"`
- `title:"半天班"`
- `time:"09:50-14:00"`
- `detail:"前厅兼职"`

相关模板位于主包内的 `um["bearhug-front"]`。规范化函数 `rr(teamId, shift)` 会保留合法的 `半天班` 值；展示函数 `mm(teamId, shift)` 再从模板取回完整对象。

短标签出现的直接原因是 UI 选择了 `label` 字段展示：

- 桌面表格/窄屏选择控件：`<select className="roster-select">` 的选项渲染为 `children:Ae.label`。
- 班次时间另行显示为 `mm(...).time`，所以能看到 `09:50-14:00`。
- 班次模板侧栏使用 `title` 作为标题、`description` 使用 `${time} · ${detail}`、`badge` 使用 `label`，所以侧栏能看到完整 `半天班 09:50-14:00 · 前厅兼职`，旁边也会出现短徽标 `半天`。
- 导出图片渲染时也使用 `ce.label`，所以即使中文乱码修复，导出图当前逻辑仍会画短标签 `半天`，不是完整 `半天班`。

结论：

- “半天”不是数据库把 `半天班` 截短，也不是旧 `早班` 数据残留。
- 当前线上包把前厅半天班的内部值和完整标题保留为 `半天班`，但在表格、选择控件和导出图里明确使用短展示字段 `label:"半天"`。

## 为什么导出预览中文乱码

当前导出预览不是页面截图，也不是服务端导出；它由前端函数 `O2(t)` 手动绘制 canvas：

- `document.createElement("canvas")`
- `const p=Math.max(window.devicePixelRatio||1,2)`
- `const S='"PingFang SC", "Microsoft YaHei", Inter, sans-serif'`
- 文本通过 `fillText(...)` 绘制。
- 最后通过 `toBlob(..., "image/png", .96)` 生成图片 Blob。
- 弹窗用 `URL.createObjectURL(blob)` 显示 `<img>` 预览。

主包内未检出：

- `html2canvas`
- `dom-to-image`
- `toPng`
- `document.fonts.ready`

因此可以确认：

- 导出图中的文字来自 JS 字符串和当前排班对象，并以 Canvas `fillText` 方式渲染。
- 包内中文字符串本身仍是正常 Unicode，例如 `大爱归心工作台`、`班表图片`、`半天班` 等；页面 DOM 中文也可正常显示。
- 乱码问题不像是 HTML meta、接口数据或数据库编码损坏，更符合 Canvas 导出阶段的中文字体解析/字体回退渲染问题。
- 该导出路径没有等待字体可用，也没有嵌入稳定 CJK 字体；当运行环境对 `PingFang SC`、`Microsoft YaHei`、`Inter`、`sans-serif` 的 Canvas 字体回退异常时，预览图会出现中文乱码或不可读。

结论：

- 导出预览中文乱码的根因在当前前端导出实现路径：手写 canvas + `fillText` + 依赖本机/浏览器字体回退。
- 数据层和 DOM 页面显示不是主要疑点；主要疑点是 canvas 生成 PNG 时的 CJK 字体渲染链路。

## 只读结论

1. 当前线上 `/calendar/roster` 构建包已定位到 `apps/web/public/employee-frontend/releases/20260616090241/assets/index-C20sRqov.js`。
2. 当前线上路由组件是压缩后的 `dP`，不是可见证据上的 `ShiftSchedulerNative`。
3. `/schedule/shifts` 在线上返回与 `/calendar/roster` 相同的 Vite SPA HTML；本地 Next `schedule/shifts/page.tsx` 不能代表当前线上实际渲染入口。
4. `shift_local_standalone_v9` 不在当前线上主包中；当前 `/calendar/roster` 不受 standalone v9 影响。
5. “半天”短标签来自模板字段 `label:"半天"`；完整班名仍存在于 `value/title:"半天班"`。
6. 导出预览乱码来自前端 canvas 文本绘制链路的 CJK 字体渲染风险；不是接口或数据库把中文转坏的直接证据。

## 后续建议

- 若验收要求表格、手机、选择控件和导出图都显示完整 `半天班`，需要把对应展示字段从 `label` 改为 `title`，或新增专门的 `displayLabel` 规则。
- 若仍希望保留紧凑 UI，可在表格中显示 `半天班`，把 `半天` 仅保留给徽标或极窄断点。
- 导出预览建议改为稳定中文字体链路：等待字体加载、嵌入可用 CJK webfont，或改为 DOM 截图/服务端字体可控的图片生成路径。
- 若需要追未压缩源码，应继续定位 Vite SPA 的源仓库或补充该 release 的 sourcemap；当前仓库只能确认线上构建包。
