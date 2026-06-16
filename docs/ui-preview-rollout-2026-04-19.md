# 2026-04-19 UI 预览优先改版约定

## 工作方式

- 所有后续 UI 优化，先做测试页（preview page）
- 用户确认满意后，再改动正式页代码
- 在用户未明确确认前，不直接把新布局覆盖到正式页
- 正式页与测试页尽量保持同一套组件语义，避免确认后还要重做

## 测试页约定

- 测试页统一放在 `apps/web/app/*-preview/page.tsx`
- 优先复用独立预览组件，例如：
  - `*WorkspacePreview.tsx`
  - `*WorkbenchPreview.tsx`
  - 或与正式页平行的 preview page
- 测试页需要明确说明：
  - 当前是设计验证页
  - 是否接真实数据
  - 对应会回写到哪个正式页

## 当前优先顺序

1. `Inspections` 详情页
2. `Solutions` 入口页
3. `Management Approvals`
4. `Notifications`
5. `Schedule`
6. `Orders` 详情 / 收款 / 发货 / 渠道结算
7. `Work Management`
8. `Settings / Agriculture`

## 当前判断

### 已完成闭环

- `Dashboard`（已先经 `dashboard-preview` 确认后同步正式页）
- `Customers`（已完成新一轮表格式盘点页确认并同步正式页）
- `Inspections` 列表页（已完成 `preview -> 收敛信息架构 -> 正式页同步`）

### 已相对成型

- `Products`
- `Files`
- `Orders` 总览
- `Quotations` 总览
- `Management` 总览

### 当前已存在的 preview 路由

- `/dashboard-preview`
- `/customers-preview`
- `/files-preview`
- `/inspections-preview`
- `/management-preview`
- `/orders-preview`
- `/products-preview`
- `/products-new-preview`
- `/products-edit-preview`
- `/products-detail-preview`
- `/products-ai-import-preview`
- `/products-parser-preview`
- `/products-parser-original-preview`
- `/quotations-preview`

### 当前仍缺失的 preview 路由

- `/solutions-preview`
- `/management-approvals-preview`
- `/notifications-preview`
- `/schedule-preview`

### 仍需继续优化

- `apps/web/app/(dashboard)/inspections/[id]/page.tsx`
- `apps/web/app/(dashboard)/solutions/page.tsx`
- `apps/web/app/(dashboard)/management/approvals/page.tsx`
- `apps/web/app/(dashboard)/orders/[id]/page.tsx`
- `apps/web/app/(dashboard)/orders/payments/page.tsx`
- `apps/web/app/(dashboard)/orders/shipments/page.tsx`
- `apps/web/app/(dashboard)/orders/channel-settlements/page.tsx`
- `apps/web/app/(dashboard)/quotations/[id]/page.tsx`
- `apps/web/app/(dashboard)/schedule/page.tsx`
- `apps/web/app/(dashboard)/notifications/page.tsx`
- `apps/web/app/(dashboard)/work-management/overview/page.tsx`
- `apps/web/app/(dashboard)/work-management/weekly-reports/page.tsx`
- `apps/web/app/(dashboard)/work-management/monthly-goals/page.tsx`
- `apps/web/app/(dashboard)/settings/page.tsx`
- `apps/web/app/(dashboard)/settings/finance-accounts/page.tsx`
- `apps/web/app/(dashboard)/agriculture/page.tsx`

## 执行规则

- 每次只推进一个或一组紧密相关页面
- 先给出 preview 路由
- 用户确认后，再同步正式页
- 同步正式页后，需要至少做一次前端 lint

## 备注

- 本约定从 `2026-04-19` 起生效
- `2026-04-20` 已按最新代码与部署状态更新本文件
- `4/19` 的生产同步代表这些页面已进入线上版本，但不等于所有页面都已完成 UI 闭环
- 当前需要优先补的是“已有正式页但还没有对应 preview 页”的项目
- `Inspections` 列表测试页已建立：`/inspections-preview`
- 若后续优先级变化，直接更新本文件
