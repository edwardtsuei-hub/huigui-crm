# 产品检测模块设计

日期：2026-04-17

## 结论

`检测记录表.xlsx` 不适合直接塞进现有 `Product` 主档。

更合适的落位方式是：

- 新增独立路由：`/inspections`
- 模块名称建议：`检测管理` 或 `检测台账`
- 产品详情页增加 `关联网检测` 区块或分页
- 客户详情页增加 `关联网检测` 区块或分页
- 档案中心继续只负责承接检测报告、发票、付款凭证等附件

原因：

- 当前产品详情页是资产主档页，重点是产品基础信息、说明、报价规则和引用记录，见 [产品详情页](/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/apps/web/app/(dashboard)/products/[id]/page.tsx:185)
- 当前 `Product` 数据结构也是产品主数据，不包含送检、样本、检测进度、付款等流程字段，见 [Product 模型](/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/prisma/schema.prisma:334)
- `检测记录表.xlsx` 的真实结构更接近 `送检单 + 样本 + 检测项目 + 报告进度 + 付款记录`

## 现状判断

### 现有系统可复用能力

- `Product`
  - 适合做关联网产品
- `Customer`
  - 适合做关联网客户、基地、试验对象
- `Task`
  - 适合承接催样、催报告、催付款、提醒复检，见 [Task 模型](/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/prisma/schema.prisma:472)
- `FileRecord`
  - 适合承接检测报告、图片、付款回单、发票，见 [FileRecord 模型](/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/prisma/schema.prisma:682)
- `AuditLog`
  - 适合追踪状态变更、付款登记、附件上传

### Excel 的业务特征

从 `检测记录表.xlsx` 读取结果看，这张表至少混合了以下几层信息：

- 检测批次头信息
  - 检测对象
  - 送检机构
  - 送检地
  - 送检地址
  - 对接人
  - 检测周期
  - 对公转账信息
- 样本信息
  - 样本对象
  - 样本检测项目
  - 取样量
  - 取样日期
  - 送检日期
- 明细项目
  - 检测项目
  - 检测费用
  - 检测进程
- 财务信息
  - 付款日期
  - 付款金额

这说明它不是“产品一行一条”的主数据，而是“一个送检批次下有多份样本、多项检测、多次付款”的业务单据。

## 信息架构建议

### 页面放置

推荐主结构：

1. 独立工作台：`/inspections`
2. 产品详情页：展示最近关联检测
3. 客户详情页：展示最近关联检测
4. 档案中心：只看附件，不承担流程主界面

### 导航建议

推荐新增一级菜单：

- `menu.inspections`

放置顺序建议：

- 客户
- 产品
- 检测管理
- 档案

如果当前阶段不想增加主导航，也至少应当新增：

- `searchCatalog` 搜索入口
- 产品详情页快捷入口
- 客户详情页快捷入口

## 数据结构设计

推荐采用三层主结构：

1. `InspectionOrder`
2. `InspectionSample`
3. `InspectionSampleItem`

再辅以：

4. `InspectionPayment`
5. `InspectionTimeline`

### 1. InspectionOrder

表示一次送检批次或一次对外委托。

建议字段：

- `id`
- `inspectionNo`
- `title`
- `customerId`
- `productId`
- `projectType`
- `inspectionTarget`
- `labName`
- `labCity`
- `labAddress`
- `contactName`
- `contactPhone`
- `expectedCycleText`
- `submittedAt`
- `receivedAt`
- `status`
- `paymentStatus`
- `summary`
- `remark`
- `bankInfo`
- `createdByUserId`
- `createdAt`
- `updatedAt`

说明：

- `customerId` 可为空，因为有些检测对象不是传统客户，而是内部试验点或外部样本
- `productId` 可为空，因为有些检测是基地土壤、果样、水样，不一定对应单一产品
- `title` 用于列表快速识别，例如：`蒲江土壤检测（海能量使用后）`

### 2. InspectionSample

表示一个送检批次下的具体样本。

建议字段：

- `id`
- `orderId`
- `sampleName`
- `sampleType`
- `sampleTarget`
- `sampleQuantityText`
- `sampledAt`
- `submittedAt`
- `plannedTestScope`
- `note`
- `sortOrder`
- `createdAt`
- `updatedAt`

说明：

- `sampleName` 例：`仙阁村常规种植土（使用后）`
- `sampleType` 例：`土壤` / `果样` / `蔬菜` / `水样` / `乳品` / `光伏板`

### 3. InspectionSampleItem

表示某个样本下的一项具体检测项目。

建议字段：

- `id`
- `sampleId`
- `itemName`
- `itemCategory`
- `feeText`
- `feeAmount`
- `status`
- `resultSummary`
- `progressNote`
- `sortOrder`
- `completedAt`
- `createdAt`
- `updatedAt`

说明：

- `feeText` 保留 Excel 原始表达，例如 `74.2*8=593.6`
- `feeAmount` 只在可结构化时写数值
- `itemCategory` 便于后续筛选，例如 `理化` / `农残` / `重金属` / `微生物`
- 报告数量建议先作为查询聚合字段，不单独落库

### 4. InspectionPayment

表示一个送检单的付款记录。

建议字段：

- `id`
- `orderId`
- `paidAt`
- `amount`
- `amountText`
- `method`
- `payerName`
- `voucherFileId`
- `invoiceFileId`
- `note`
- `createdByUserId`
- `createdAt`

说明：

- 一张检测单可能有多次付款，所以不要把付款字段直接写死在主表里
- `amountText` 用于保留 `1200*4=4800` 这类原始表达

### 5. InspectionTimeline

表示过程日志。

建议字段：

- `id`
- `orderId`
- `sampleId`
- `itemId`
- `eventType`
- `eventAt`
- `content`
- `createdByUserId`
- `createdAt`

适用事件：

- 已取样
- 已送检
- 实验室已收样
- 检测中
- 已出报告
- 已付款
- 已上传附件
- 已归档

## 状态设计

### 送检单状态 `InspectionOrder.status`

建议枚举：

- `DRAFT`
- `SAMPLED`
- `SUBMITTED`
- `RECEIVED`
- `IN_PROGRESS`
- `PARTIAL_REPORTED`
- `COMPLETED`
- `ARCHIVED`
- `CANCELED`

中文对应：

- 草稿
- 已取样
- 已送检
- 已收样
- 检测中
- 部分出报告
- 全部完成
- 已归档
- 已取消

### 付款状态 `InspectionOrder.paymentStatus`

建议枚举：

- `UNPAID`
- `PARTIAL`
- `PAID`
- `REFUNDED`

### 明细项目状态 `InspectionSampleItem.status`

建议枚举：

- `PENDING`
- `IN_PROGRESS`
- `REPORTED`
- `FAILED`
- `CANCELED`

## 页面设计

### 1. 检测管理列表页 `/inspections`

列表页目标：

- 看全部送检批次
- 快速定位哪个批次卡住了
- 快速知道报告是否已出、付款是否完成

顶部统计卡建议：

- 进行中检测
- 本月新增送检
- 已出报告待归档
- 未付款金额

筛选条件建议：

- 关键词
- 检测对象
- 客户
- 产品
- 送检机构
- 样本类型
- 检测状态
- 付款状态
- 送检日期区间

列表列建议：

- 检测单号
- 标题
- 检测对象
- 送检机构
- 样本数
- 检测项目数
- 当前状态
- 付款状态
- 最新进展
- 最近更新时间

### 2. 检测详情页 `/inspections/[id]`

建议分成 5 个区块：

- 基础信息
- 样本与检测项目
- 进度时间线
- 付款记录
- 附件资料

详情页操作建议：

- 新增样本
- 新增检测项目
- 登记进度
- 上传报告
- 登记付款
- 生成提醒
- 归档检测单

### 3. 产品详情页关联卡片

放在产品详情页侧边或正文下方，建议内容：

- 最近 5 条关联网检测
- 进行中数量
- 最近一次报告日期
- 快捷按钮 `新建检测`
- 快捷按钮 `查看全部`

不建议把完整流程直接塞进产品详情页。

### 4. 客户详情页关联卡片

建议内容：

- 这个客户/基地的检测历史
- 当前进行中的检测
- 最近一份报告
- 是否有逾期未完成项目

原因：

- Excel 中很多“检测对象”本质更像基地、农场、试验点、项目，而不是单纯产品

## 与现有模块的关系

### 与 Product 的关系

- 一个检测单可以关联一个主产品
- 一个产品会对应多张检测单
- 产品页只看摘要，不承载全量流程

### 与 Customer 的关系

- 一个检测单可以关联一个客户或试验基地
- 客户页更适合看长期检测历史

### 与 Task 的关系

不建议重做提醒系统，直接复用现有 `Task`：

- 催取样
- 催报告
- 催付款
- 催复检

联动方式建议：

- `Task.content` 记录提醒说明
- 第二阶段为 `Task` 新增 `relatedType = INSPECTION_ORDER` 与 `relatedId = orderId`

如果后续想做得更标准，可以再为 `Task` 增加 `inspectionOrderId`

### 与 FileRecord 的关系

继续复用现有附件中心，不单独做文件表。

推荐 `businessType`：

- `inspection_report`
- `inspection_payment_voucher`
- `inspection_invoice`
- `inspection_sample_photo`
- `inspection_other`

推荐 `businessId`：

- 检测单 `orderId`
- 如需更细，也可以附加样本或项目的 `relatedType / relatedId`

## Excel 字段映射建议

### 可直接映射到 InspectionOrder

- 检测对象
- 送检机构
- 送检地
- 送检地址
- 对接人
- 检测周期
- 对公转账信息
- 送检日期
- 检测进程
- 付款日期
- 付款金额

### 可映射到 InspectionSample

- 样本对象
- 样本检测项目
- 取样量
- 取样日期

### 可映射到 InspectionSampleItem

- 检测项目
- 检测费用
- 检测进程

### 导入难点

导入不能按单行直接入库，必须先做“向下继承 + 分组”：

- 同一检测批次的头信息只在首行出现，后续行为空
- 需要把空值补齐为上一条有效头信息
- 再按“检测对象 + 送检机构 + 送检日期 + 一组连续明细”聚合成 `InspectionOrder`

## MVP 范围

第一阶段建议只做以下能力：

1. 检测单列表页
2. 检测单详情页
3. 样本与检测项目维护
4. 进度日志
5. 付款记录
6. 报告附件上传
7. 产品页和客户页关联摘要
8. 从现有 Excel 导入

先不做：

- 自动结果分析
- 报告 OCR 结构化解析
- 检测结果对比图表
- 多实验室结算报表
- 对外分享页面

## 推荐的 Prisma 草案

以下是推荐的模型轮廓，不是最终迁移脚本：

```prisma
enum InspectionOrderStatus {
  DRAFT
  SAMPLED
  SUBMITTED
  RECEIVED
  IN_PROGRESS
  PARTIAL_REPORTED
  COMPLETED
  ARCHIVED
  CANCELED
}

enum InspectionPaymentStatus {
  UNPAID
  PARTIAL
  PAID
  REFUNDED
}

enum InspectionItemStatus {
  PENDING
  IN_PROGRESS
  REPORTED
  FAILED
  CANCELED
}

model InspectionOrder {
  id                String                  @id @default(cuid())
  inspectionNo      String                  @unique @db.VarChar(64)
  title             String                  @db.VarChar(255)
  customerId        String?
  productId         String?
  projectType       String?                 @db.VarChar(64)
  inspectionTarget  String                  @db.Text
  labName           String                  @db.VarChar(255)
  labCity           String?                 @db.VarChar(64)
  labAddress        String?                 @db.Text
  contactName       String?                 @db.VarChar(128)
  contactPhone      String?                 @db.VarChar(32)
  expectedCycleText String?                 @db.VarChar(128)
  bankInfo          String?                 @db.Text
  summary           String?                 @db.Text
  remark            String?                 @db.Text
  submittedAt       DateTime?
  receivedAt        DateTime?
  status            InspectionOrderStatus   @default(DRAFT)
  paymentStatus     InspectionPaymentStatus @default(UNPAID)
  createdByUserId   String
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt

  customer Customer? @relation(fields: [customerId], references: [id])
  product  Product?  @relation(fields: [productId], references: [id])
  creator  User      @relation(fields: [createdByUserId], references: [id])

  samples   InspectionSample[]
  payments  InspectionPayment[]
  timelines InspectionTimeline[]
}

model InspectionSample {
  id                 String   @id @default(cuid())
  orderId            String
  sampleName         String   @db.VarChar(255)
  sampleType         String?  @db.VarChar(64)
  sampleTarget       String?  @db.Text
  sampleQuantityText String?  @db.VarChar(128)
  sampledAt          DateTime?
  submittedAt        DateTime?
  plannedTestScope   String?  @db.Text
  note               String?  @db.Text
  sortOrder          Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  order InspectionOrder       @relation(fields: [orderId], references: [id])
  items InspectionSampleItem[]
}

model InspectionSampleItem {
  id            String               @id @default(cuid())
  sampleId      String
  itemName      String               @db.VarChar(255)
  itemCategory  String?              @db.VarChar(64)
  feeText       String?              @db.VarChar(128)
  feeAmount     Decimal?             @db.Decimal(12, 2)
  status        InspectionItemStatus @default(PENDING)
  resultSummary String?              @db.Text
  progressNote  String?              @db.Text
  completedAt   DateTime?
  sortOrder     Int                  @default(0)
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  sample InspectionSample @relation(fields: [sampleId], references: [id])
}

model InspectionPayment {
  id              String   @id @default(cuid())
  orderId         String
  paidAt          DateTime?
  amount          Decimal? @db.Decimal(12, 2)
  amountText      String?  @db.VarChar(128)
  method          String?  @db.VarChar(64)
  payerName       String?  @db.VarChar(128)
  voucherFileId   String?  @db.VarChar(128)
  invoiceFileId   String?  @db.VarChar(128)
  note            String?  @db.Text
  createdByUserId String
  createdAt       DateTime @default(now())

  order InspectionOrder @relation(fields: [orderId], references: [id])
}
```

## 权限建议

建议新增权限：

- `menu.inspections`
- `page.inspections.list`
- `page.inspections.detail`
- `page.inspections.create`
- `page.inspections.edit`
- `action.inspection.create`
- `action.inspection.update`
- `action.inspection.upload_report`
- `action.inspection.record_payment`
- `action.inspection.archive`

命名风格可参考现有权限定义，见 [management.constants.ts](/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/apps/api/src/management/management.constants.ts:77)

## 开发拆分建议

### 第一批

- Prisma 模型与迁移
- API：列表、详情、创建、编辑
- Web：列表页、详情页
- 产品详情页关联卡片
- 客户详情页关联卡片

### 第二批

- Excel 导入器
- 附件上传联动
- 付款记录
- 状态变更日志
- 催办提醒

### 第三批

- 统计看板
- 结果趋势分析
- 报告 OCR 结构化

## 推荐实施顺序

最稳妥的顺序是：

1. 先上 `InspectionOrder + InspectionSample + InspectionSampleItem`
2. 详情页先把“样本、项目、进度”跑通
3. 再接 `InspectionPayment`
4. 再接 `FileRecord`
5. 最后做 Excel 导入

这样做的好处是：

- 先把在线录入流程跑通
- 再处理历史 Excel 导入
- 导入逻辑可以直接对着已经稳定的数据结构写

## 最终建议

这块不要设计成“产品字段扩展”，而要设计成“检测业务单据模块”。

产品页、客户页、档案页都只是它的关系入口：

- 产品页看“这个产品做过哪些检测”
- 客户页看“这个客户/基地做过哪些检测”
- 档案页看“这些检测有哪些附件”
- 真正的业务主入口应该是 `检测管理`

如果确认按这份设计推进，下一步建议直接开始做：

1. Prisma 模型
2. API controller / service
3. `/inspections` 列表页
4. `/inspections/[id]` 详情页骨架
