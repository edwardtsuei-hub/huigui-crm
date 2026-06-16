# 2026-04-17 未上线本地优化清单

## 基准

- 对比基准：`2026-04-17 19:47:58` 生产同步记录
- 对比来源：
  - [deployment-log.md](./deployment-log.md)
  - [2026-04-17-194758-production-sync.md](./deployments/2026-04-17-194758-production-sync.md)
- 说明：
  - `git status` 当前展开后共有 `187` 个改动路径
  - 与 `production-sync-20260417-194758` 的本地备份逐文件比对后，真正还没在服务器上的共有 `25` 个路径
  - 其中会影响系统运行或功能的共有 `15` 个路径

## 总结

建议拆成两个上线包：

1. `A 包：检测关联优化`
2. `B 包：订单列表过滤补强`

这两包都不需要新增数据库迁移。部署时可以继续使用：

```bash
bash ./scripts/ops/deploy-local-to-production.sh --skip-seed --note "填写本次上线范围"
```

如果只是先演练，可以先跑：

```bash
bash ./scripts/ops/deploy-local-to-production.sh --dry-run --skip-local-build --skip-seed --note "上线演练"
```

## A 包：检测关联优化

### 上线目标

- 检测列表支持按“客户是否已关联”“产品是否已关联”筛选
- 首页直接提醒“检测待补关联”
- 检测新建/编辑页客户、产品选择改为可搜索
- 检测详情页显示“缺客户/缺产品”提示
- 检测列表新增“待补关联工作台”，可直接补关联并保存

### 涉及文件

- `apps/api/src/common/services/access-control.service.ts`
- `apps/api/src/meta/meta.service.ts`
- `apps/api/src/inspections/dto/inspection.dto.ts`
- `apps/api/src/inspections/inspections.service.ts`
- `apps/web/app/(dashboard)/dashboard/page.tsx`
- `apps/web/app/(dashboard)/inspections/page.tsx`
- `apps/web/app/(dashboard)/inspections/[id]/page.tsx`
- `apps/web/components/inspections/InspectionFormFields.tsx`

### 业务变化

- 检测列表新增三类筛选：
  - `customerLinked`
  - `productLinked`
  - `needsLinking`
- dashboard 新增待补关联计数入口
- 列表页增加“只看待补关联”切换
- 列表页增加“待补关联工作台”，支持直接保存客户/产品关联
- 检测详情页会在基础信息区顶部提醒“还未补齐关联”

### 数据库影响

- 无新增表结构
- 无新增 migration
- `deploy-local-to-production.sh` 中的 `npx prisma migrate deploy` 预计为无变更执行

### 风险评估

- 风险等级：低到中
- 风险点：
  - 检测查询条件从单层 `OR` 改为 `AND + OR` 组合，筛选结果会更精确
  - 首页提醒数量来自新计数逻辑，会影响 dashboard 卡片排序和提醒内容
  - 列表页快捷保存会直接调用现有 `PATCH /inspections/:id`

### 建议上线顺序

建议优先单独上线 A 包。它的收益最高，且不依赖订单模块改动。

### 上线前建议检查

```bash
npm run build -w @huigui/api
npm run lint -w @huigui/api
npm run build -w @huigui/web
npm run lint -w @huigui/web
```

### 上线后验收清单

1. 登录 `https://crm.hui-health.com/dashboard`
2. 确认首页出现“检测待补关联”提醒，数量正常
3. 打开 `https://crm.hui-health.com/inspections?needsLinking=true`
4. 确认检测列表只显示缺客户或缺产品的记录
5. 确认“客户关联 / 产品关联 / 指定客户 / 指定产品”筛选可用
6. 在“待补关联工作台”中选中一条检测单，补一个客户或产品并保存
7. 确认保存成功后，列表和待补数量会刷新
8. 进入任一仍未补齐的检测详情页，确认顶部提示和“去补关联”按钮正常
9. 进入检测新建页和编辑页，确认客户/产品搜索选择器可正常搜索

## B 包：订单列表过滤补强

### 上线目标

- 订单、收款、发货、渠道结算默认排除系统生成记录
- 订单查询支持按客户、报价进一步过滤
- 订单选择器统一提到 `200` 条上限，减少下拉缺项

### 涉及文件

- `apps/api/src/orders/dto/order.dto.ts`
- `apps/api/src/orders/orders.service.ts`
- `apps/web/app/(dashboard)/orders/channel-settlements/page.tsx`
- `apps/web/app/(dashboard)/orders/payments/page.tsx`
- `apps/web/app/(dashboard)/orders/shipments/page.tsx`
- `apps/web/lib/orders.ts`

### 业务变化

- 订单查询新增：
  - `customerId`
  - `quotationId`
  - `includeSystemRecords`
- 收款、发货、渠道结算查询新增：
  - `includeSystemRecords`
- 默认隐藏系统记录，只有显式带上 `includeSystemRecords` 才会显示
- 订单选择器常量统一为：
  - `ORDER_PICKER_PAGE_SIZE = 200`

### 数据库影响

- 无新增表结构
- 无新增 migration

### 风险评估

- 风险等级：中
- 风险点：
  - 默认过滤系统记录后，订单、收款、发货、结算列表中的数量会变化
  - 如果某些页面依赖“系统记录默认可见”，上线后会出现感知差异
  - API page size 从 `100` 放宽到 `200`，对列表拉取量略有增加

### 建议上线顺序

建议放在 A 包之后。

如果你希望一次性发版，也可以合并为一个包上线，但最好在发版后把检测和订单各跑一轮冒烟。

### 上线前建议检查

```bash
npm run build -w @huigui/api
npm run lint -w @huigui/api
npm run build -w @huigui/web
npm run lint -w @huigui/web
```

### 上线后验收清单

1. 打开 `https://crm.hui-health.com/orders/payments`
2. 确认订单下拉可以拉到更多订单项，页面能正常建单
3. 打开 `https://crm.hui-health.com/orders/shipments`
4. 确认发货页订单选择器可正常加载
5. 打开 `https://crm.hui-health.com/orders/channel-settlements`
6. 确认渠道结算建单页订单选择器正常
7. 对比上线前后收款、发货、渠道结算列表数量
8. 确认系统生成记录默认已被隐藏
9. 如果需要验证回看，可用带 `includeSystemRecords` 的接口查询确认数据仍在

## 推荐方案

### 方案一：先发 A 包

适合：

- 你希望先把“检测补关联”这条业务链上线
- 你想降低一次性发版范围
- 你希望先看真实用户使用反馈

优点：

- 业务收益最高
- 风险最可控
- 验收路径最短

### 方案二：A 包 + B 包一起发

适合：

- 你今天就想把检测和订单的本地优化一起清掉
- 你可以接受发版后多跑一轮订单冒烟

优点：

- 一次完成
- 减少重复部署

注意：

- 发版说明要明确写上“检测关联优化 + 订单系统记录过滤补强”
- 发版后至少需要人工走一轮 dashboard、inspections、payments、shipments、channel-settlements

## 建议发版命令

### 只发 A 包

```bash
bash ./scripts/ops/deploy-local-to-production.sh \
  --skip-seed \
  --note "A 包：检测关联优化（待补关联筛选、首页提醒、检测工作台快捷补关联）"
```

### A 包 + B 包一起发

```bash
bash ./scripts/ops/deploy-local-to-production.sh \
  --skip-seed \
  --note "A+B 包：检测关联优化 + 订单系统记录过滤补强"
```

## 当前建议

- 如果你要稳：先发 `A 包`
- 如果你要快：发 `A+B 包`

从业务价值和风险平衡看，我建议先发 `A 包`，确认检测模块在线稳定后，再把 `B 包` 跟上。
