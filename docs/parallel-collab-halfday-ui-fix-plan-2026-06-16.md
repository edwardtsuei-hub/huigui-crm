# B 线 /calendar/roster halfDay UI 修复方案

- 日期：2026-06-16
- 执行人：Codex B 线
- 范围：只读定位源码/构建来源，给出 halfDay 显示与导出预览中文乱码修复方案
- 约束：未改业务代码，未部署，未写数据库，未重启服务
- 状态：ready_for_review

## 读取材料

已先读并交叉核对：

- `docs/parallel-collaboration-control-2026-06-16.md`
- `docs/parallel-collab-shift-roster-halfday-auth-pagecheck-2026-06-16.md`
- `docs/parallel-collab-shift-roster-halfday-ui-trace-2026-06-16.md`
- `docs/parallel-collab-frontend-localstorage-2026-06-16.md`

## /calendar/roster 构建来源定位

当前线上 `https://management.hui-health.com/calendar/roster` 是 Vite SPA 静态包，不是 Next 页面 `/schedule/shifts` 的 `ShiftSchedulerNative`。

线上 HTML 当前引用：

- JS：`/assets/index-C20sRqov.js`
- CSS：`/assets/index-DUmE3prg.css`

本仓库中可对应到的发布包：

- `apps/web/public/employee-frontend/releases/20260616090241/assets/index-C20sRqov.js`
- `apps/web/public/employee-frontend/releases/20260616090241/assets/index-DUmE3prg.css`

已知只读证据：

- `/calendar/roster` 路由在压缩 JS 中映射到组件 `dP`。
- 压缩包中存在 `path:"calendar/roster"`、`routeLabel:"排班"`、`children:e.jsx(dP,{})`。
- 该包中未找到 `ShiftSchedulerNative`。
- 该包中未找到 `shift_local_standalone_v9`。
- Source map 线上不可用，当前仓库未定位到 `/calendar/roster` 的未压缩源码；本次只能基于线上/本地发布包进行只读追踪。

对照项：

- `apps/web/app/(dashboard)/schedule/shifts/page.tsx` 仍指向 `ShiftSchedulerNative`。
- `apps/web/components/shift-roster/ShiftSchedulerNative.tsx` 仍存在，但它不是当前线上 `/calendar/roster` 的运行组件。
- `shift_local_standalone_v9` 只在 `apps/web/public/embedded/shift-scheduler-v9.html` 这类独立旧包线索中出现，不在当前 `/calendar/roster` 活跃包内。

结论：当前 halfDay UI 问题应按 `/calendar/roster` 的 Vite 发布包修复，而不是改 `/schedule/shifts` 的 `ShiftSchedulerNative` 或旧 standalone localStorage 包。

## halfDay 当前显示链路

压缩包中 `bearhug-front` 班次模板包含：

```js
{
  value: "半天班",
  label: "半天",
  title: "半天班",
  time: "09:50-14:00",
  detail: "前厅兼职"
}
```

归一化逻辑保留 `半天班`：

- `半天班 -> 半天班`
- `早班/中班/预约班/全天班 -> 全天班`
- `值班/晚班 -> 晚班`
- 其他未命中值回落为 `休`

也就是说，数据值和班次时间是正确的；当前 UI 短标签来自模板的 `label:"半天"`。

当前已定位到的使用方式：

- 桌面/窄屏表格选择控件：`option` 文案使用 `Ae.label`，所以显示 `半天`。
- 表格班次时间：使用模板 `time`，显示 `09:50-14:00`。
- 班次设置/模板面板：标题使用 `title`，所以能看到 `半天班`；同时 badge 使用 `label`，仍可能显示 `半天`。
- 导出图片：canvas 绘制使用 `ce.label`，所以导出内的班次名也会绘制为 `半天`。

## halfDay UI 修复方案

建议不要修改后端数据值，不要把 `value:"半天班"` 改短，也不要依赖 localStorage 迁移解决。推荐在前端显示层增加统一显示函数，例如：

```ts
function getRosterShiftDisplayName(template: ShiftTemplate) {
  return template.title || template.value || template.label;
}
```

如果某些极小徽标仍需要短标签，可另设 `getRosterShiftCompactName`，不要把所有场景都绑死到 `label`。

建议显示策略：

| 场景 | 当前表现 | 建议 |
| --- | --- | --- |
| 桌面表格 | `半天` + `09:50-14:00` | 班次名改为 `半天班`，时间保持 `09:50-14:00` |
| 窄屏/手机按钮或卡片 | 跟随同一选择控件时显示 `半天` | 改为同一显示函数，显示 `半天班` |
| 班次选择控件/弹窗/原生 select | option 使用 `label`，显示 `半天` | option 文案改为 `title/value` 优先，显示 `半天班` |
| 班次设置/模板面板 | 标题已有 `半天班`，badge 仍可能是 `半天` | 标题保持；若验收口径要求所有可见处一致，badge 也改为 `半天班` 或隐藏短 badge |
| 导出图片 | canvas 使用 `label`，导出为 `半天` | 改为绘制 `title || value || label`，即 `半天班` |

窄屏注意点：

- `半天班` 比 `半天` 多一个汉字，原生 select、表格格子和导出胶囊宽度都要复核。
- 不建议通过截断回到 `半天`；如果空间不足，应优先调宽、减小内部左右 padding、允许两行，或在导出画布中动态计算文字宽度。
- 时间 `09:50-14:00` 必须保留在相邻时间行或同一导出单元里，不能被班次名替代。

## 导出预览中文乱码定位

当前导出预览不是 HTML 截图，而是手写 canvas 绘制：

- 创建固定宽度 canvas。
- 用 `CanvasRenderingContext2D.fillText` 绘制中文标题、姓名、日期、班次名、时间。
- 字体栈为 `"PingFang SC", "Microsoft YaHei", Inter, sans-serif`。
- 未找到 `document.fonts.ready`。
- 未找到 `html2canvas`。
- 未找到 `dom-to-image`。

页面 DOM 中文正常而导出预览乱码，说明更像是 canvas 绘制时字体加载或 CJK 字体 fallback 问题，不像数据编码问题。

## 导出预览中文乱码修复方案

建议按三层方案推进。

### 第一层：保留 canvas，补齐 CJK 字体等待

这是最小改动方案，优先推荐。

1. 定义 canvas 与页面共用的 CJK-safe 字体栈：

```ts
const ROSTER_EXPORT_FONT_STACK =
  '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", "Source Han Sans SC", system-ui, sans-serif';
```

2. 导出绘制前等待字体就绪：

```ts
if (document.fonts?.ready) {
  await document.fonts.ready;
}
```

3. 如引入自托管 CJK webfont，应在绘制前显式触发加载：

```ts
await document.fonts.load(`700 18px "Noto Sans SC"`);
await document.fonts.ready;
```

4. 自托管 CJK 字体优先使用子集化字体，避免整包过大。可考虑：

- `Noto Sans SC` 子集
- `Source Han Sans SC` 子集
- 仅覆盖排班导出需要的常用中文字符、数字、标点和人名范围

5. canvas 所有 `font` 设置都使用同一字体栈，不要某些地方仍只用 `Inter` 或 `sans-serif`。

### 第二层：DOM 导出替代

如果 canvas 仍在部分浏览器乱码，可考虑用隐藏导出 DOM + 截图库：

- `html-to-image`
- `html2canvas`

注意事项：

- 仍必须等待 `document.fonts.ready`。
- 字体文件必须满足跨域和加载策略。
- 导出 DOM 的 CSS 要与页面显示保持一致。
- 需要评估包体积和移动端内存。

该方案比纯 canvas 更接近用户看到的页面，但引入新依赖和兼容性风险。

### 第三层：服务端导出

如果导出图片必须跨系统稳定一致，可做服务端渲染：

- Playwright 截图导出
- Node canvas / Satori 类方案
- 服务端内置 CJK 字体文件

该方案最稳，但涉及服务端接口、部署和权限，不属于本次 B 线只读修复范围。

## 推荐修复顺序

1. 在 `/calendar/roster` 对应源码中找到班次模板和导出函数的未压缩源文件；若仓库缺失，先补齐来源映射或拿到 sourcemap。
2. 增加统一显示函数，用户可见班次名默认显示 `title || value || label`。
3. 桌面表格、窄屏卡片/按钮、选择控件、导出 canvas 全部改用统一显示函数。
4. 保留内部值 `半天班`，保留时间 `09:50-14:00`。
5. canvas 导出绘制前等待 `document.fonts.ready`，并统一 CJK 字体栈。
6. 如仍复现乱码，加入自托管 CJK 子集字体。
7. 最后再评估 DOM 截图或服务端导出替代方案。

## 验收建议

修复后建议验收：

- `/calendar/roster` 线上包不再出现 `半天` 作为主要可见班次名。
- 前厅 迦迦 在 2026-06-15、2026-06-16、2026-06-17、2026-06-20、2026-06-21 显示 `半天班`。
- 上述五天均显示时间 `09:50-14:00`。
- 桌面表格显示 `半天班`。
- 窄屏/手机按钮或卡片显示 `半天班`。
- 班次选择控件或弹窗选项显示 `半天班`。
- 班次设置面板至少标题显示 `半天班`；若按严格口径，badge 也显示 `半天班`。
- 导出预览图片中中文标题、姓名、日期、星期、班次名均无乱码。
- 导出预览中 halfDay 显示 `半天班`，不是 `半天`。
- 复制图片、下载图片结果与预览一致。

## 风险与注意事项

- 如果直接把模板 `label` 从 `半天` 改成 `半天班`，可能影响原本需要短标签的紧凑徽标；更建议新增显示 helper。
- 原生 select 在窄列中可能裁切三字中文，需要同步检查 CSS 宽度和 padding。
- canvas 胶囊宽度若写死，改成 `半天班` 后可能被截断，需要用 `measureText` 动态计算或调大宽度。
- 仅等待 `document.fonts.ready` 不一定能解决系统没有 CJK 字体的问题；跨平台稳定性最好由自托管字体或服务端导出保证。
- 当前活跃包缺 sourcemap，后续实际修复前需要找到未压缩源或构建链路，避免直接改压缩产物。

## 本次产出

本次只写复核方案文档和 JSON，不改业务代码。

输出文件：

- `docs/parallel-collab-halfday-ui-fix-plan-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-halfday-ui-fix-plan.json`

## 停止点

已完成只读定位与修复方案输出。下一步应由具备对应前端源码/构建权限的一线修改 `/calendar/roster` 源码，并重新构建部署后进行页面与导出图片验收。
