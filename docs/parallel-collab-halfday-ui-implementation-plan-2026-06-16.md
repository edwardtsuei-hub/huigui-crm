# B 线 /calendar/roster halfDay UI 最小修复准备

日期：2026-06-16
执行时间：2026-06-16 19:31:31 +0800
工作流：B 线 halfDay UI 最小修复准备
状态：blocked_by_missing_unminified_source / patch_ready_for_source_repo
约束：未改业务代码、未写数据库、未部署、未重启；未直接修改压缩发布包。

## 先读材料

已读取并复核：

- `docs/parallel-collab-halfday-ui-fix-plan-2026-06-16.md`
- `docs/parallel-collab-shift-roster-halfday-ui-trace-2026-06-16.md`
- `docs/parallel-collab-a-line-verification-2026-06-16.md`
- 追加核对：`docs/parallel-collab-shift-roster-halfday-auth-pagecheck-2026-06-16.md`
- 追加核对：`output/employee-data-migration/2026-06-16/parallel-collab-halfday-ui-fix-plan.json`
- 追加核对：`output/employee-data-migration/2026-06-16/parallel-collab-shift-roster-halfday-ui-trace.json`

## 构建来源结论

当前线上 `https://management.hui-health.com/calendar/roster` 对应的是 Vite SPA 静态发布包，不是旧 Next 页面 `apps/web/app/(dashboard)/schedule/shifts/page.tsx` 中的 `ShiftSchedulerNative`。

当前仓库可确认：

- 当前 release 指针：`apps/web/public/employee-frontend/current.release` -> `20260616090241`
- 当前线上主 JS 对应本地发布包：`apps/web/public/employee-frontend/releases/20260616090241/assets/index-C20sRqov.js`
- 当前线上主 CSS 对应本地发布包：`apps/web/public/employee-frontend/releases/20260616090241/assets/index-DUmE3prg.css`
- `apps/web/package.json` 只有 Next 脚本：`next dev`、`next build`、`next start`、`tsc --noEmit`
- 当前仓库未发现 `vite.config.*`
- 当前仓库未发现当前 release 的 sourcemap
- 当前仓库未定位到 `/calendar/roster` 的未压缩 TSX/源码文件

因此，本轮不能安全修改当前线上运行页的源代码。按用户要求，不直接改 `index-C20sRqov.js` 这种压缩产物；实际修复必须在 Vite SPA 源仓库或该 release 的 sourcemap/构建目录中完成。

## 不能改旧 ShiftSchedulerNative 的原因

旧代码仍存在：

- `apps/web/app/(dashboard)/schedule/shifts/page.tsx`
- `apps/web/components/shift-roster/ShiftSchedulerNative.tsx`
- `apps/web/lib/shift-roster.ts`

但它不是本次 `/calendar/roster` 的修复目标：

- 旧 `ShiftSchedulerNative` 使用 `html2canvas` 做导出。
- 当前 `/calendar/roster` 活跃包使用手写 canvas + `fillText` 做导出。
- 旧 `apps/web/lib/shift-roster.ts` 的 `SHIFT_CODES` 只有 `early/late/off/leave/full`，`early` 标签仍是 `早班`，没有当前线上包里的 `bearhug-front` / `半天班` 模板结构。
- 当前线上活跃包未检出 `ShiftSchedulerNative` 和 `shift_local_standalone_v9`。

结论：改旧 `ShiftSchedulerNative` 不能保证修复当前生产可见的 `/calendar/roster`。

## 当前问题定位

当前活跃包中，`bearhug-front` 的 halfDay 模板同时保留完整值和短标签：

```ts
{
  value: "半天班",
  label: "半天",
  title: "半天班",
  time: "09:50-14:00",
  detail: "前厅兼职"
}
```

已有复核显示：

- 前厅 迦迦 2026-06-15、2026-06-16、2026-06-17、2026-06-20、2026-06-21 的时间为 `09:50-14:00`
- 页面未显示 `早班`
- 桌面表格和窄屏选择控件显示短标签 `半天`
- 班次模板区域能显示完整 `半天班 09:50-14:00 · 前厅兼职`
- 导出预览中文乱码，且当前导出绘制逻辑使用短标签

根因是展示层选择了 `label:"半天"`，不是数据被截短，也不是 `早班` 残留。

## 源仓库最小 patch 点

拿到 Vite SPA 未压缩源码后，优先用以下检索锚点定位文件：

- 路由：`calendar/roster`
- 模板：`bearhug-front`
- 选择控件类名：`roster-select`
- 面板文案：`班次模板`
- 导出弹窗：`班表图片`
- 导出函数特征：`document.createElement("canvas")`、`fillText`、`toBlob`
- 当前压缩符号参考：路由组件 `dP`，导出函数 `O2`

建议最小实现：

```ts
type RosterShiftTemplate = {
  value: string;
  label?: string;
  title?: string;
  time?: string;
  detail?: string;
};

function getRosterShiftDisplayName(template?: RosterShiftTemplate | null) {
  return template?.title || template?.value || template?.label || "";
}

function getRosterShiftCompactName(template?: RosterShiftTemplate | null) {
  return template?.label || template?.title || template?.value || "";
}
```

需要改用完整显示名的位置：

| 场景 | 当前线索 | 最小修改 |
| --- | --- | --- |
| 桌面表格 | select option 使用 `template.label` | option 文案改为 `getRosterShiftDisplayName(template)` |
| 窄屏/手机选择控件 | 复用同一短标签 | 复用完整显示名，保留时间 `09:50-14:00` |
| 选择控件/弹窗 | 当前选中项显示 `半天` | 选项和当前值都显示 `半天班` |
| 班次设置/模板 | title 已完整，badge 仍短 | 严格口径下 badge 也改完整；如需紧凑 badge，必须验收确认 |
| 导出图片 | canvas 绘制 `template.label` | 绘制 `getRosterShiftDisplayName(template)` |

不建议改动：

- 不改后端数据值 `半天班`
- 不把 `value` 改成 `半天`
- 不依赖 `localStorage` 迁移修复
- 不直接全局把 `label` 改成 `半天班`，除非确认没有紧凑 UI 依赖短标签

## 导出图片最小 patch 点

当前活跃包的导出路径是前端手写 canvas：

- `document.createElement("canvas")`
- `ctx.fillText(...)`
- 字体栈：`"PingFang SC", "Microsoft YaHei", Inter, sans-serif`
- 未见 `document.fonts.ready`
- 未见 `html2canvas` 或 `dom-to-image`

建议先保留 canvas，仅补字体等待和 CJK 字体栈：

```ts
const ROSTER_EXPORT_FONT_STACK =
  '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", "Source Han Sans SC", system-ui, sans-serif';

async function waitForRosterExportFonts() {
  if (!document.fonts) {
    return;
  }

  try {
    await Promise.all([
      document.fonts.load(`400 14px ${ROSTER_EXPORT_FONT_STACK}`, "大爱归心班表半天班"),
      document.fonts.load(`700 18px ${ROSTER_EXPORT_FONT_STACK}`, "迦迦前厅兼职"),
    ]);
    await document.fonts.ready;
  } catch {
    await document.fonts.ready.catch(() => undefined);
  }
}
```

在 canvas 绘制前执行：

```ts
await waitForRosterExportFonts();
```

所有 canvas `ctx.font` 都应使用 `ROSTER_EXPORT_FONT_STACK`。如果仍在部分浏览器乱码，再进入第二层方案：

- 自托管 `Noto Sans SC` 或 `Source Han Sans SC` 子集字体
- 隐藏 DOM + `html-to-image` / `html2canvas`
- 服务端 Playwright 截图或服务端 canvas，并内置 CJK 字体

## 导出标签宽度补丁

`半天班` 比 `半天` 多一个汉字，导出图中的标签胶囊不应写死太窄。建议按文字宽度计算：

```ts
const shiftName = getRosterShiftDisplayName(template);
const textWidth = ctx.measureText(shiftName).width;
const pillWidth = Math.max(64, Math.ceil(textWidth + 20));
```

如果表格单元太窄：

- 优先减少左右 padding 或增大导出画布对应列宽
- 允许中文两行，但不能回退成 `半天`
- 时间 `09:50-14:00` 必须保留

## 建议验收

源码修复并重新构建后验收：

- 当前线上 `/calendar/roster` 仍指向新构建包，不回退到旧 `ShiftSchedulerNative`
- 活跃包不含 `shift_local_standalone_v9`
- 前厅 迦迦 2026-06-15、2026-06-16、2026-06-17、2026-06-20、2026-06-21 均显示 `半天班`
- 上述五天均保留 `09:50-14:00`
- 桌面表格显示 `半天班`
- 窄屏/手机选择控件显示 `半天班`
- 选择控件/弹窗选项显示 `半天班`
- 班次设置/模板区域严格口径下不再只显示短徽标 `半天`
- 导出预览中文标题、姓名、表头、日期、班次名均无乱码
- 导出图中 halfDay 显示 `半天班`，不是 `半天`
- 复制图片和下载图片与预览一致

## 阻断说明

当前仓库只有 Next 旧源码和 Vite 发布产物，缺少 `/calendar/roster` 的未压缩源码、构建脚本或 sourcemap。因此本轮已完成最小修复准备，但不能直接实施业务代码 patch。

下一步需要其一：

1. 提供 Vite SPA 源仓库或构建目录；
2. 提供 `20260616090241` release sourcemap；
3. 由拥有源仓库的人按本方案执行 patch，然后重新构建发布。

## 本轮产出

- `docs/parallel-collab-halfday-ui-implementation-plan-2026-06-16.md`
- `output/employee-data-migration/2026-06-16/parallel-collab-halfday-ui-implementation-plan.json`
