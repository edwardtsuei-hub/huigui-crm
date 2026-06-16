# B 线 halfDay UI 最小修复实施准备

- 日期：2026-06-16
- 状态：blocked_waiting_for_vite_source
- 范围：只读定位 `/calendar/roster` 构建来源，准备最小 patch 方案
- 最新指令：B 线暂停实施；不要改压缩包，不要改旧 `ShiftSchedulerNative`
- 本轮未改业务代码、未部署、未重启、未写数据库

## 已读取材料

- `docs/parallel-collab-halfday-ui-fix-plan-2026-06-16.md`
- `docs/parallel-collab-shift-roster-halfday-ui-trace-2026-06-16.md`
- `docs/parallel-collab-a-line-verification-2026-06-16.md`

## 当前定位结论

线上 `/calendar/roster` 当前不是旧 Next 页面 `ShiftSchedulerNative`，而是 Vite SPA 静态发布包。

已定位到当前发布产物：

- `apps/web/public/employee-frontend/current.release` 指向 `20260616090241`
- JS：`apps/web/public/employee-frontend/releases/20260616090241/assets/index-C20sRqov.js`
- CSS：`apps/web/public/employee-frontend/releases/20260616090241/assets/index-DUmE3prg.css`

压缩包证据：

- 存在 `path:"calendar/roster"`。
- 路由渲染组件为压缩符号 `dP`。
- 包内未找到 `ShiftSchedulerNative`。
- 包内未找到 `shift_local_standalone_v9`。
- 包内未找到 `document.fonts.ready`。
- 包内未找到 `html2canvas`、`dom-to-image`。

当前仓库情况：

- `apps/web/package.json` 是 Next 构建脚本：`next dev/build/start`。
- 当前仓库未发现 `vite.config.*`。
- 当前仓库未发现 `/calendar/roster` 对应的未压缩 Vite 源码。
- 当前仓库未发现生成该 Vite 发布包的构建目录。
- 当前仓库未发现该 release 的 sourcemap。
- 线上 sourcemap 只读检查返回 `404`：
  - `https://management.hui-health.com/assets/index-C20sRqov.js.map`
  - `https://management.hui-health.com/assets/index-DUmE3prg.css.map`
- 当前仓库可见的 `apps/web/app/(dashboard)/schedule/shifts/page.tsx` 和 `apps/web/components/shift-roster/ShiftSchedulerNative.tsx` 属于旧 Next 入口，不应作为本次修复目标。

## 阻断说明

本轮不能安全准备实际代码 patch，因为缺少 `/calendar/roster` 的 Vite 未压缩源码、构建目录或 sourcemap。

明确不做：

- 不直接修改 `apps/web/public/employee-frontend/releases/20260616090241/assets/index-C20sRqov.js`。
- 不直接修改任何压缩构建产物。
- 不修改旧 `ShiftSchedulerNative`。
- 不通过旧 `shift_local_standalone_v9` 或 localStorage 兼容包绕修。

需要主线提供以下任一项后再继续：

- `/calendar/roster` 的 Vite 源码目录。
- 生成 `index-C20sRqov.js` 的构建目录。
- 对应 release 的 sourcemap。
- 能从压缩符号 `dP`、`O2`、`rr`、`mm` 反查到源文件的构建映射。

## halfDay 最小修复点

当前 `bearhug-front` 模板在活跃包中是：

```js
{
  value: "半天班",
  label: "半天",
  title: "半天班",
  time: "09:50-14:00",
  detail: "前厅兼职"
}
```

问题不在数据值，而在显示层使用短 `label`。

拿到 Vite 源码后，建议做最小 helper：

```ts
function getShiftDisplayName(template: ShiftTemplate) {
  return template.title || template.value || template.label;
}
```

如确有紧凑徽标需要短文案，可另设：

```ts
function getShiftCompactName(template: ShiftTemplate) {
  return template.label || template.title || template.value;
}
```

最小修改面：

| UI 面 | 当前压缩包线索 | 最小修复 |
| --- | --- | --- |
| 桌面表格 | `select.roster-select` 的 `option` 使用 `Ae.label` | option 可见文本改为 `getShiftDisplayName(Ae)` |
| 窄屏/横向滚动表格 | 复用同一表格/select | 跟随同一 helper，显示 `半天班` |
| 选择控件 | 原生 select 当前选中/选项显示短 `半天` | 选项文本使用完整显示名，value 仍为 `Ae.value` |
| 班次设置/模板侧栏 | `title` 已显示 `半天班`，`badge` 使用 `label` | 严格验收时 badge 也改为完整名，或仅将 badge 作为非主标签 |
| 导出图片 | canvas 绘制使用 `ce.label` | 改为绘制 `getShiftDisplayName(ce)`，即 `半天班` |

注意：

- 不改 `value:"半天班"`。
- 不把数据写回为短值。
- 时间 `09:50-14:00` 仍由 `template.time` 显示和导出。
- `半天班` 比 `半天` 更长，select 宽度、表格单元格和 canvas 胶囊宽度要一起验收。

## 导出图片中文乱码最小修复点

当前导出是手写 canvas：

- `document.createElement("canvas")`
- `fillText(...)`
- 字体栈：`"PingFang SC", "Microsoft YaHei", Inter, sans-serif`
- 没有等待 `document.fonts.ready`

拿到 Vite 源码后，最小修复建议：

```ts
const ROSTER_EXPORT_FONT_STACK =
  '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", "Source Han Sans SC", system-ui, sans-serif';

async function waitForRosterExportFonts() {
  if (typeof document === "undefined") return;
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
}
```

导出函数应从同步 canvas 生成调整为可等待字体的异步流程：

```ts
await waitForRosterExportFonts();
// then create canvas and fillText with ROSTER_EXPORT_FONT_STACK
```

如果线上环境仍乱码，再加自托管 CJK 字体：

- 优先 CJK 子集字体，避免整包过大。
- 可选 `Noto Sans SC` 或 `Source Han Sans SC` 子集。
- CSS `@font-face` 与 canvas 字体栈使用同一 family。
- 绘制前可调用 `document.fonts.load(...)` 后再等待 `document.fonts.ready`。

替代方案：

- 如果 canvas 字体链路仍不稳定，可改隐藏 DOM + `html-to-image` / `html2canvas`。
- 如果要求跨平台绝对稳定，可改服务端 Playwright/Node canvas 导出，并内置 CJK 字体。
- 替代方案都比最小 patch 大，建议只在 canvas 最小修复失败后启用。

## 后续拿到源码后的 patch 顺序

1. 先确认源码构建产物能复现当前 `index-C20sRqov.js` 中的 `/calendar/roster` 页面。
2. 定位班次模板、归一化函数、展示函数、表格 select、模板侧栏、导出 canvas 函数。
3. 增加完整显示 helper。
4. 替换表格/select/窄屏复用处的短 `label` 展示。
5. 替换导出 canvas 中的 `ce.label` 绘制。
6. 给导出函数增加 `document.fonts.ready` 等待和 CJK 字体栈。
7. 复核 `半天班` 不溢出、不被截断，时间仍为 `09:50-14:00`。
8. 只在源码中改动，通过正常构建生成新 release；不要手改压缩包。

## 验收清单

- `/calendar/roster` 仍走 Vite 新包，不回退到旧 `ShiftSchedulerNative`。
- 活跃包仍不含 `shift_local_standalone_v9`。
- 前厅 迦迦在 2026-06-15、2026-06-16、2026-06-17、2026-06-20、2026-06-21 显示 `半天班`。
- 五个目标日期时间均显示 `09:50-14:00`。
- 桌面表格显示 `半天班`。
- 窄屏/手机宽度下显示 `半天班`。
- 选择控件选中项和选项显示 `半天班`。
- 班次设置主显示为 `半天班`，严格验收下 badge 也不再只显示 `半天`。
- 导出预览图片中中文标题、姓名、日期、星期、班次名无乱码。
- 导出预览图片中 halfDay 显示 `半天班`，不是 `半天`。

## 停止点

已暂停实施，当前状态为等待主线提供 `/calendar/roster` 的 Vite 源码、构建目录或 sourcemap。拿到后再按本文档做最小源码 patch。
