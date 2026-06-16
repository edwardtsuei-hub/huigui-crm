# A 包上线清单（检测关联优化）

## 目标

本次只上线“检测关联优化”，不包含订单过滤补强。

上线目标：

- 检测列表支持按客户/产品关联状态筛选
- 首页 dashboard 提醒“检测待补关联”
- 检测新建/编辑页客户、产品改为可搜索选择
- 检测详情页提示缺少关联信息
- 检测列表增加“待补关联工作台”，支持直接补客户/产品并保存

## 范围

### API

- `apps/api/src/common/services/access-control.service.ts`
- `apps/api/src/meta/meta.service.ts`
- `apps/api/src/inspections/dto/inspection.dto.ts`
- `apps/api/src/inspections/inspections.service.ts`

### Web

- `apps/web/app/(dashboard)/dashboard/page.tsx`
- `apps/web/app/(dashboard)/inspections/page.tsx`
- `apps/web/app/(dashboard)/inspections/[id]/page.tsx`
- `apps/web/components/inspections/InspectionFormFields.tsx`

## 不包含

- `orders` 相关 API 和页面
- `orders.ts` 订单选择器常量调整
- 任何新的 Prisma schema 或 migration

## 数据库影响

- 无新增表结构
- 无新增 migration
- 可继续执行 `npx prisma migrate deploy`，预期无结构变更

## 上线前检查

在本地执行：

```bash
npm run build -w @huigui/api
npm run lint -w @huigui/api
npm run build -w @huigui/web
npm run lint -w @huigui/web
```

建议再确认：

- 本地 `/inspections?needsLinking=true` 正常显示
- 检测列表的“待补关联工作台”能成功保存客户或产品
- 首页能看到“检测待补关联”提醒

## 建议发版命令

先演练：

```bash
bash ./scripts/ops/deploy-local-to-production.sh \
  --dry-run \
  --skip-local-build \
  --skip-seed \
  --note "A 包演练：检测关联优化"
```

正式发版：

```bash
bash ./scripts/ops/deploy-local-to-production.sh \
  --skip-seed \
  --note "A 包：检测关联优化（待补关联筛选、首页提醒、检测工作台快捷补关联）"
```

## 上线后验收

### 1. 首页

- 打开 `https://crm.hui-health.com/dashboard`
- 确认提醒区出现“检测待补关联”
- 确认数量和当前待补关联检测记录一致

### 2. 检测列表

- 打开 `https://crm.hui-health.com/inspections`
- 确认列表页有：
  - `客户关联`
  - `产品关联`
  - `指定客户`
  - `指定产品`
  - `只看待补关联`
- 点击“只看待补关联”
- 确认 URL 带上 `needsLinking=true`
- 确认列表只显示缺客户或缺产品的记录

### 3. 待补关联工作台

- 在检测列表页定位“待补关联工作台”
- 任选一条待补记录
- 搜索并选择一个客户或产品
- 点击“保存关联”
- 确认提示成功
- 确认列表刷新后，该记录状态变化正确

### 4. 检测详情

- 打开一条仍未补齐关联的检测详情页
- 确认顶部有“这张检测单还有关联信息待补齐”提示
- 如有编辑权限，确认“去补关联”按钮可跳到编辑页

### 5. 新建/编辑页

- 打开检测新建页
- 打开任一检测编辑页
- 确认客户和产品输入框是可搜索选择器
- 确认搜索、选择、清空都正常

## 回归重点

- 检测筛选结果不能异常变少或变多
- dashboard 不能因为新提醒卡片导致其它提醒异常消失
- 检测列表的快捷保存不能误清空原有关联
- 没有编辑权限的账号不应看到可修改动作

## 回滚判断

如果出现以下情况，建议立即回滚：

- 检测列表无法加载
- dashboard 首页报错或白屏
- 检测详情页无法打开
- 快捷保存导致客户/产品关联被错误清空

## 备注

- 这份清单只对应 A 包
- B 包（订单过滤补强）建议在 A 包稳定后再单独上线
