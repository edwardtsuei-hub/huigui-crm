# 管理端班表 halfDay 页面只读复核

日期：2026-06-16
执行时间：2026-06-16 14:41 +0800
工作线：B 线
状态：partial / blocked by auth
只读约束：未改代码、未写数据库、未部署、未重启。

## 输出路径

- 用户指定 Markdown：`/opt/huigui-crm/docs/parallel-collab-shift-roster-halfday-pagecheck-2026-06-16.md`
- 用户指定 JSON：`/opt/huigui-crm/output/employee-data-migration/2026-06-16/parallel-collab-shift-roster-halfday-pagecheck.json`
- 当前机器 `/opt/huigui-crm` 不存在，且 `/opt` 为 root 拥有；`mkdir -p /opt/huigui-crm/...` 返回 Permission denied，`sudo -n mkdir -p ...` 返回 password is required。
- 因此本轮实际落地到当前仓库同名路径：
  - `docs/parallel-collab-shift-roster-halfday-pagecheck-2026-06-16.md`
  - `output/employee-data-migration/2026-06-16/parallel-collab-shift-roster-halfday-pagecheck.json`

## 线上打开结果

- 已打开 `https://management.hui-health.com/schedule/shifts`。
- Chrome 页面最终跳转到 `https://management.hui-health.com/login?redirect=%2F`，当前浏览器没有可用管理端登录态。
- 本轮没有输入、读取或发送账号密码，也没有尝试绕过登录。
- 未能进入登录后的 `/schedule/shifts` 可见页面，因此桌面表格、手机端按钮、选择班次弹窗、班次设置、导出预览均未能做真实 UI 可见确认。

## 运行包与路由证据

- HTTP 层 `GET /schedule/shifts` 返回 200 HTML，页面引用生产资产：
  - `/assets/index-C20sRqov.js`
  - `/assets/index-DUmE3prg.css`
- 当前仓库源码里，`apps/web/app/(dashboard)/schedule/shifts/page.tsx` 直接返回 `ShiftSchedulerNative`。
- 但线上运行资产 `/assets/index-C20sRqov.js` 为压缩 SPA 包，未检出 `ShiftSchedulerNative` 字面量，也未检出 `/schedule/shifts` 字面量；因此“线上登录后实际运行组件仍是 ShiftSchedulerNative”本轮不能确认。

## 半天班数据证据

- 迁移输出 `output/employee-data-migration/2026-06-16/roster-backfill-plan.json` 中，熊抱前厅 06/15-06/21 的前厅兼职 `迦迦` 有 5 条半天班：
  - 周一 06/15：`半天班`，09:50-14:00
  - 周二 06/16：`半天班`，09:50-14:00
  - 周三 06/17：`半天班`，09:50-14:00
  - 周六 06/20：`半天班`，09:50-14:00
  - 周日 06/21：`半天班`，09:50-14:00
- 线上生产资产 `/assets/index-C20sRqov.js` 中检出 `bearhug-front` 班次选项包含：
  - `value:"半天班"`
  - `label:"半天"`
  - `title:"半天班"`
  - `time:"09:50-14:00"`
  - `detail:"前厅兼职"`
- 因未登录，不能确认这 5 条在管理端 UI 表格中实际显示为“半天班”而不是“早班”。

## UI 覆盖项复核

| 检查项 | 结果 | 证据 / 风险 |
| --- | --- | --- |
| 桌面表格 | 未完成 | 登录态缺失，无法进入实际页面；旧 `ShiftSchedulerNative` 源码表格通过 `SHIFT_CODE_META[shiftValue].label` 显示。 |
| 手机端班次按钮 | 未完成 | 登录态缺失；旧源码手机端按钮同样通过 `SHIFT_CODE_META[shiftValue].label` 显示。 |
| 选择班次弹窗 | 未完成 | 登录态缺失；旧源码弹窗遍历 `SHIFT_CODES`，当前源码只有 `early/late/off/leave/full`。 |
| 班次设置 | 未完成 | 登录态缺失；旧源码设置页只显示 `early/late/full` 时间，`early` 标签仍是“早班”。 |
| 导出预览 | 未完成 | 登录态缺失；旧源码导出表格通过 `SHIFT_CODE_META[shiftValue].label` 显示。 |

## shift_local_standalone_v9 影响面

- 当前仓库源码：`ShiftSchedulerNative.tsx` 只通过 `apiFetch("/settings/shift-roster")` 读取和保存，没有直接读写 `localStorage`。
- `shift_local_standalone_v9` 只在：
  - `apps/web/components/shift-roster/ShiftSchedulerEmbedded.tsx`
  - `apps/web/public/embedded/shift-scheduler-v9.html`
- 线上生产资产 `/assets/index-C20sRqov.js` 未检出 `shift_local_standalone_v9`。
- 结论：从源码与当前生产资产字符串看，`/schedule/shifts` 不受 `shift_local_standalone_v9` 直接影响；但登录后的具体页面状态仍需补验。

## 主要风险

1. 当前仓库 `apps/web/lib/shift-roster.ts` 仍定义 `early: { label: "早班", shortLabel: "早" }`，且 `SHIFT_CODES` 没有 `halfDay`。
2. 如果线上实际仍走旧 `ShiftSchedulerNative` 且半天班被编码成 `early`，桌面表格、手机按钮、弹窗、设置页、导出都可能显示“早班”。
3. 如果线上实际走新 SPA 包，则包内已有 `bearhug-front` 的 `半天班` 选项，但本轮没有登录态，无法确认各 UI surface 是否都渲染该文案。

## 结论

- 已确认：生产 HTML 可访问；生产资产包含前厅半天班选项；迁移输出包含前厅 5 个“半天班”；源码/生产资产未见 `shift_local_standalone_v9` 直接影响 `/schedule/shifts`。
- 未确认：登录后页面实际运行组件是否仍是 `ShiftSchedulerNative`；桌面表格、手机端班次按钮、选择班次弹窗、班次设置、导出预览是否全部显示“半天班”。
- 建议补验：用正式账号登录后，重新打开 `/schedule/shifts`，定位熊抱前厅 06/15-06/21 的 `迦迦` 5 个班次，并逐项打开手机视口、弹窗、设置页和导出预览做可见文字截图或 DOM 记录。
