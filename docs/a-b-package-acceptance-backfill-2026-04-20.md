# 2026-04-20 A / B 包验收回填记录

## 范围

- 回填对象：
  - `A 包：检测关联优化`
  - `B 包：订单列表过滤补强`
- 关联文档：
  - `docs/undeployed-local-optimization-plan-2026-04-17.md`
  - `docs/a-package-deployment-checklist-2026-04-17.md`
  - `docs/deployments/2026-04-18-070833-production-sync.md`
  - `docs/deployments/2026-04-19-200728-production-sync.md`

## 结论摘要

- `A 包` 与 `B 包` 对应的代码、页面与接口逻辑都已在当前代码中存在，并已包含在 `2026-04-19 20:07:28` 的生产同步范围内。
- `2026-04-20` 已补做本地技术校验，`@huigui/api` 与 `@huigui/web` 的 `lint`、`build` 均通过。
- 当前可以确认生产站点基础可达：`https://crm.hui-health.com/login` 与 `https://crm.hui-health.com/api/health` 在 `2026-04-20` 使用 `curl` 均返回 `200`。
- 但今天复跑浏览器级线上冒烟时，`A 包` 脚本在 `login` 页面访问阶段遇到 `net::ERR_CONNECTION_CLOSED`，因此本次不能把浏览器自动化结果记为“通过”。
- 综合判断：`A 包 / B 包` 当前状态都应记为 `已上线 + 有历史验证证据 + 今日技术校验通过 + 仍待人工业务验收复核`。

## 证据来源

### 1. 生产同步记录

- `2026-04-19 20:07:28` 的生产同步备注写明：同步所有尚未上线的本地优化与更新，包含：
  - preview 路由
  - 客户 / 管理 / 订单 / 工作管理 / 设置
  - 相关 API
  - 迁移与部署脚本修复
- 发布后核对记录显示：
  - 远端 `docker compose config` 校验通过
  - API 与前端镜像已重建完成
  - `npx prisma migrate deploy` 已执行
  - `npm run db:seed` 已执行
  - API 健康检查通过
  - HTTPS 回归检查通过

### 2. 2026-04-20 本地技术校验

已执行并通过：

- `npm run lint -w @huigui/api`
- `npm run lint -w @huigui/web`
- `npm run build -w @huigui/api`
- `npm run build -w @huigui/web`

### 3. 2026-04-20 线上基础连通性检查

使用 `curl` 验证：

- `https://crm.hui-health.com/login` 返回 `HTTP 200`
- `https://crm.hui-health.com/api/health` 返回 `HTTP 200`

说明：

- 站点当前不是“完全不可访问”
- 至少静态页面与健康检查接口仍然可达

### 4. 2026-04-20 浏览器级复验结果

尝试复跑：

```bash
CRM_PASSWORD='Huigui@123' node output/playwright/prod-regression/a-package-smoke.js
```

结果：

- 未通过
- 失败位置：`https://crm.hui-health.com/login`
- 错误：`page.goto: net::ERR_CONNECTION_CLOSED`

判断：

- 本次失败发生在浏览器访问首页阶段
- 不能说明 A 包功能本身失效
- 更像是当前浏览器级访问链路、网络环境或站点对浏览器访问策略导致的阻断

因此，本次复验结果只能记为：

- `浏览器自动化复验未完成`
- 不能记为 `通过`
- 也不能直接记为 `A 包线上故障`

### 5. 历史自动化与截图证据

仓库内已有以下历史验证产物：

#### A 包

- `output/playwright/prod-regression/a-package-smoke.js`
- `output/playwright/prod-regression/2026-04-17-a-package-smoke/dashboard.png`
- `output/playwright/prod-regression/2026-04-17-a-package-smoke/inspections-needs-linking.png`
- `output/playwright/prod-regression/2026-04-17-strong-verification/dashboard-reminder-after-inspection-create.png`
- `output/playwright/prod-regression/2026-04-17-strong-verification/inspection-detail-before-link.png`
- `output/playwright/prod-regression/2026-04-17-strong-verification/inspection-workbench-before-save.png`
- `output/playwright/prod-regression/2026-04-17-strong-verification/inspection-workbench-after-save.png`
- `output/playwright/prod-regression/2026-04-17-strong-verification/inspection-detail-after-link.png`

这些脚本和截图覆盖了：

- dashboard 出现“检测待补关联”
- `/inspections?needsLinking=true` 页面加载
- 列表页的筛选 / 工作台 / 快捷保存入口
- 详情页“这张检测单还有关联信息待补齐”提示
- 补关联前后状态变化

#### B 包

- `output/playwright/prod-regression/orders-fulfillment-smoke.js`
- `output/playwright/prod-regression/2026-04-17-orders-smoke/orders.png`
- `output/playwright/prod-regression/2026-04-17-orders-smoke/order-detail.png`
- `output/playwright/prod-regression/2026-04-17-orders-smoke/orders-payments.png`
- `output/playwright/prod-regression/2026-04-17-orders-smoke/orders-shipments.png`
- `output/playwright/prod-regression/2026-04-17-orders-smoke/orders-channel-settlements.png`
- `output/playwright/prod-regression/2026-04-17-orders-smoke/customer-detail-order-entry.png`

这些脚本和截图覆盖了：

- 订单默认列表与带 `includeSystemRecords=true` 的接口对比
- 系统验收订单默认被隐藏
- 订单详情、收款、发货、渠道结算页面可打开
- 客户详情页存在“新建订单”入口

## 代码侧核对结果

### A 包：检测关联优化

当前代码已包含以下关键逻辑：

- 检测列表支持 `needsLinking`：
  - `apps/api/src/inspections/inspections.service.ts` 中，当 `query.needsLinking` 为真时，会追加 `customerId` 或 `productId` 为空的筛选条件
- 检测列表支持：
  - `customerLinked`
  - `productLinked`
- dashboard 与检测页文案中已出现“检测待补关联”与 `needsLinking=true` 跳转入口

结论：

- A 包目标功能已明确进入当前代码主干

### B 包：订单列表过滤补强

当前代码已包含以下关键逻辑：

- `apps/api/src/orders/orders.service.ts` 中，订单列表、收款、发货、渠道结算都支持 `includeSystemRecords`
- 默认情况下会过滤系统记录
- 同时支持 `customerId`、`quotationId` 等额外查询条件
- `apps/web/lib/orders.ts` 中 `ORDER_PICKER_PAGE_SIZE = 200`

结论：

- B 包目标功能已明确进入当前代码主干

## 分项结论

### A 包：检测关联优化

当前结论：

- 已上线：是
- 代码存在：是
- 历史自动化与截图证据：有
- 今日技术校验：通过
- 今日线上基础连通性：通过
- 今日浏览器级自动化复验：未完成
- 今日人工业务验收：未回填

状态建议标记为：

- `已上线，技术状态正常，待人工业务复核`

### B 包：订单列表过滤补强

当前结论：

- 已上线：是
- 代码存在：是
- 历史自动化与截图证据：有
- 今日技术校验：通过
- 今日线上基础连通性：通过
- 今日浏览器级自动化复验：未执行
- 今日人工业务验收：未回填

状态建议标记为：

- `已上线，技术状态正常，待人工业务复核`

## 当前仍待人工确认的业务项

### A 包

需要人工在生产环境补确认：

1. dashboard 的“检测待补关联”数量是否与实际待补记录一致
2. `inspections?needsLinking=true` 是否只显示缺客户或缺产品的记录
3. 待补关联工作台保存后，计数和列表是否即时刷新
4. 检测新建 / 编辑页的客户、产品搜索选择器是否交互正常
5. 无编辑权限账号是否不会看到可修改动作

### B 包

需要人工在生产环境补确认：

1. 收款、发货、渠道结算页面的订单下拉是否能正常拉到更多订单
2. 默认列表中的系统记录是否已隐藏
3. 带 `includeSystemRecords` 的接口回看时，系统记录是否仍存在
4. 订单详情、收款、发货、渠道结算页面中的数量与业务预期是否一致

## 建议动作

### P1

- 在一个可稳定打开线上页面的浏览器环境中，重新跑一轮：
  - A 包只读冒烟
  - 订单链路只读冒烟

### P1

- 按本记录中的“仍待人工确认业务项”补一次人工验收

### P2

- 人工验收完成后，把最终结论补写回：
  - `docs/a-package-deployment-checklist-2026-04-17.md`
  - `docs/undeployed-local-optimization-plan-2026-04-17.md`

## 当前可用对外口径

> A 包和 B 包都已经进入生产环境，代码与本地技术校验均正常，且仓库中已有历史自动化验证与截图证据；不过 2026-04-20 当天的浏览器级线上复验未能完成，因此这两包当前应标记为“已上线、技术状态正常、仍待人工业务验收复核”。
