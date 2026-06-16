# 订单 / 收款 / 发货 / 渠道结算模块数据结构设计

日期：2026-04-17

## 1. 设计结论

基于当前 CRM 现有模型与这次销售 Excel 的结构，最合适的扩展方式不是继续往 `Customer` 或 `CustomerFollowup` 塞字段，而是新增一条完整的交易主链：

- `SalesOrder` 订单主表
- `SalesOrderItem` 订单明细表
- `PaymentRecord` 收款记录表
- `ShipmentRecord` 发货记录表
- `ShipmentItem` 发货明细表
- `ChannelPartner` 渠道商主档
- `ChannelSettlement` 渠道结算单
- `ChannelSettlementItem` 渠道结算明细
- `FinanceAccount` 财务收款账户配置

核心原则：

- 订单是主对象
- 收款和发货都允许一单多次
- 渠道结算独立于订单收款，但可以回链到订单和订单明细
- 财务账户配置不属于客户数据，也不属于订单明细，应单独放到设置层

这套结构可以承接：

- `海能量农业工业客戶登记总表（对内）.xlsx`
  - `海能量农业元素 登记`
  - `填写示例`
  - `收款信息`

## 2. 推荐页面落位

### 顶部导航

建议新增一级菜单：

- `订单`

放置位置建议：

- `客户`
- `产品`
- `方案`
- `报价`
- `订单`
- `档案`

这样最顺，原因是：

- 报价之后自然进入成交和履约
- 收款、发货、结算本质都属于订单履约链路
- 不建议把这些内容继续挤进“报价”或“客户详情”主页面里

### 页面结构

建议新增以下页面：

1. `订单列表`
   - 路径建议：`/orders`
   - 功能：筛选订单、查看支付/发货/结算状态、进入详情

2. `订单详情`
   - 路径建议：`/orders/[id]`
   - 功能：订单头信息、商品明细、收款、发货、渠道结算、关联档案、操作日志

3. `收款记录`
   - 路径建议：`/orders/payments`
   - 功能：按时间/客户/订单查看收款流水与未收款订单

4. `发货记录`
   - 路径建议：`/orders/shipments`
   - 功能：按仓库/快递/物流状态查看发货履约

5. `渠道结算`
   - 路径建议：`/orders/channel-settlements`
   - 功能：查看商家供货、现结货款、成本和利润

6. `财务账户配置`
   - 路径建议：`/settings/finance-accounts`
   - 功能：维护主体公司、开户行、收款账户、适用场景

### 现有页面联动点

建议同步增加这些入口：

- 客户详情页新增 `订单` 区块或 Tab
- 报价详情页新增 `转订单`
- 档案中心允许把文件绑定到订单 / 收款 / 发货 / 结算对象

## 3. 数据关系总览

```text
Customer ──< SalesOrder ──< SalesOrderItem
                 ├──< PaymentRecord
                 ├──< ShipmentRecord ──< ShipmentItem
                 ├──< ChannelSettlementItem >── ChannelSettlement ──> ChannelPartner
                 ├──> Quotation? / Contract?
                 └──> FileRecord / AuditLog

FinanceAccount
  └──< PaymentRecord
```

说明：

- 一个客户可以有多张订单
- 一张订单可以有多条商品明细
- 一张订单可以分多次收款、分多次发货
- 渠道结算既可以回链整张订单，也可以精确回链到订单明细
- 收款账户配置是独立配置表，不建议和业务流水混在一起

## 4. 状态枚举建议

建议新增以下枚举。

### `SalesOrderStatus`

- `DRAFT`
- `CONFIRMED`
- `IN_FULFILLMENT`
- `COMPLETED`
- `CANCELED`

### `OrderPaymentStatus`

- `UNPAID`
- `PARTIAL`
- `PAID`
- `REFUNDED`

### `OrderShipmentStatus`

- `PENDING`
- `PARTIAL`
- `SHIPPED`
- `DELIVERED`
- `RETURNED`
- `CANCELED`

### `SettlementStatus`

- `NOT_REQUIRED`
- `PENDING`
- `PARTIAL`
- `SETTLED`
- `VOIDED`

### `PaymentMethod`

- `CASH`
- `BANK_TRANSFER`
- `WECHAT`
- `ALIPAY`
- `OTHER`

### `PaymentRecordStatus`

- `PENDING`
- `CONFIRMED`
- `FAILED`
- `VOIDED`

### `ShipmentRecordStatus`

- `PENDING`
- `SHIPPED`
- `DELIVERED`
- `RETURNED`
- `CANCELED`

### `SettlementType`

- `DIRECT_SUPPLY`
- `CHANNEL_RESALE`
- `CHANNEL_REBATE`
- `OTHER`

## 5. 表结构建议

下面用 Prisma 风格描述建议的数据结构。

### 5.1 `SalesOrder`

订单主表，承接客户、金额、收货信息、当前履约状态。

```prisma
model SalesOrder {
  id                   String              @id @default(cuid())
  orderNo              String              @unique @db.VarChar(64)
  customerId           String
  quotationId          String?
  contractId           String?
  channelPartnerId     String?
  orderDate            DateTime
  orderType            String?             @db.VarChar(32)
  recipientName        String?             @db.VarChar(128)
  recipientPhone       String?             @db.VarChar(32)
  recipientProvince    String?             @db.VarChar(64)
  recipientCity        String?             @db.VarChar(64)
  recipientDistrict    String?             @db.VarChar(64)
  recipientAddress     String?             @db.VarChar(255)
  usagePurpose         String?             @db.Text
  warehouseName        String?             @db.VarChar(128)
  totalProductAmount   Decimal?            @db.Decimal(12, 2)
  discountAmount       Decimal?            @db.Decimal(12, 2)
  shippingFee          Decimal?            @db.Decimal(12, 2)
  receivableAmount     Decimal?            @db.Decimal(12, 2)
  receivedAmount       Decimal?            @db.Decimal(12, 2)
  paymentStatus        OrderPaymentStatus  @default(UNPAID)
  shipmentStatus       OrderShipmentStatus @default(PENDING)
  settlementStatus     SettlementStatus    @default(NOT_REQUIRED)
  status               SalesOrderStatus    @default(DRAFT)
  remark               String?             @db.Text
  ownerUserId          String
  creatorUserId        String
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt
}
```

#### 字段说明

- `orderNo`
  - 正式订单号
  - 对应 Excel 的 `订单号`

- `customerId`
  - 必须关联客户
  - 如果当前导入时找不到客户，需要先补建或匹配 `Customer`

- `quotationId`
  - 允许从现有报价单转订单
  - 这是后续最重要的链路之一

- `contractId`
  - 如果该订单已经落合同，可以回链合同

- `channelPartnerId`
  - 如果该订单属于渠道商代销、供货或分销，可以绑定渠道商

- `receivableAmount`
  - 客户理论应付金额
  - 对应 Excel 中的 `应付金额`

- `receivedAmount`
  - 当前累计已收金额
  - 由 `PaymentRecord` 汇总得出，也可以做物化字段方便列表过滤

### 5.2 `SalesOrderItem`

订单商品明细表。

```prisma
model SalesOrderItem {
  id               String   @id @default(cuid())
  orderId          String
  productId        String?
  lineNo           Int
  itemName         String
  sku              String?  @db.VarChar(64)
  spec             String?  @db.VarChar(128)
  unit             String?  @db.VarChar(32)
  quantity         Decimal  @db.Decimal(12, 2)
  unitPrice        Decimal? @db.Decimal(12, 2)
  lineAmount       Decimal? @db.Decimal(12, 2)
  usagePurpose     String?  @db.Text
  remark           String?  @db.Text
  detailJson       Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

#### 字段说明

- `productId`
  - 如果可以匹配到现有 `Product`，就挂产品 ID
  - 如果暂时匹配不到，也允许只保留 `itemName`

- `lineNo`
  - 保留原始明细顺序
  - 方便导入时复原一单多行结构

- `quantity`
  - 对应 Excel 的 `数量`

- `usagePurpose`
  - 原表里部分“使用用途”如果是逐项记录，更适合落在明细行

### 5.3 `PaymentRecord`

收款记录表，支持一单多次收款。

```prisma
model PaymentRecord {
  id                String              @id @default(cuid())
  paymentNo         String?             @unique @db.VarChar(64)
  orderId           String
  financeAccountId  String?
  payerName         String?             @db.VarChar(128)
  paymentMethod     PaymentMethod
  amount            Decimal             @db.Decimal(12, 2)
  paidAt            DateTime
  status            PaymentRecordStatus @default(CONFIRMED)
  referenceNo       String?             @db.VarChar(128)
  remark            String?             @db.Text
  creatorUserId     String
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}
```

#### 字段说明

- `orderId`
  - 收款必须挂在订单下

- `financeAccountId`
  - 指向收款账户配置
  - 例如公户、微信、支付宝、某个银行账户

- `amount`
  - 单次收款金额
  - 原 Excel 中的 `实收金额` 如果是单次结清，可直接生成一条收款记录

### 5.4 `ShipmentRecord`

发货记录表，支持一单多次发货。

```prisma
model ShipmentRecord {
  id                String               @id @default(cuid())
  shipmentNo        String?              @unique @db.VarChar(64)
  orderId           String
  warehouseName     String?              @db.VarChar(128)
  courierCompany    String?              @db.VarChar(128)
  trackingNo        String?              @db.VarChar(128)
  shippedAt         DateTime?
  deliveredAt       DateTime?
  status            ShipmentRecordStatus @default(PENDING)
  recipientName     String?              @db.VarChar(128)
  recipientPhone    String?              @db.VarChar(32)
  recipientAddress  String?              @db.VarChar(255)
  remark            String?              @db.Text
  operatorUserId    String
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
}
```

#### 字段说明

- `warehouseName`
  - V1 先用文本字段，不必一开始就上仓库主档

- `courierCompany`
  - 对应 Excel 的 `发货快递`

- `trackingNo`
  - 当前 Excel 未必都有，但系统结构必须预留

### 5.5 `ShipmentItem`

发货明细表，用来支持部分发货。

```prisma
model ShipmentItem {
  id            String   @id @default(cuid())
  shipmentId    String
  orderItemId   String
  productId     String?
  itemName      String
  quantity      Decimal  @db.Decimal(12, 2)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### 为什么要有这张表

如果不做 `ShipmentItem`，系统只能支持“一单一次整单发货”。

而销售真实场景里很常见：

- 同一订单分多次出库
- 缺货时先发一部分
- 补发或换货

所以这张表建议 V1 就保留。

### 5.6 `ChannelPartner`

渠道商或商家主档。

```prisma
model ChannelPartner {
  id                 String   @id @default(cuid())
  partnerName        String
  contactName        String?  @db.VarChar(128)
  mobile             String?  @db.VarChar(32)
  wechatId           String?  @db.VarChar(128)
  province           String?  @db.VarChar(64)
  city               String?  @db.VarChar(64)
  district           String?  @db.VarChar(64)
  address            String?  @db.VarChar(255)
  settlementType     SettlementType?
  settlementRuleText String?  @db.Text
  remark             String?  @db.Text
  ownerUserId        String
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

#### 字段说明

- `partnerName`
  - 对应 Excel 的 `商家名称`

- `settlementRuleText`
  - 承接原表里“折扣规则”或备注型结算说明

### 5.7 `ChannelSettlement`

渠道结算单主表。

```prisma
model ChannelSettlement {
  id                 String           @id @default(cuid())
  settlementNo       String           @unique @db.VarChar(64)
  channelPartnerId   String
  periodStart        DateTime?
  periodEnd          DateTime?
  totalSupplyAmount  Decimal?         @db.Decimal(12, 2)
  totalCostAmount    Decimal?         @db.Decimal(12, 2)
  totalProfitAmount  Decimal?         @db.Decimal(12, 2)
  totalPaidAmount    Decimal?         @db.Decimal(12, 2)
  status             SettlementStatus @default(PENDING)
  remark             String?          @db.Text
  creatorUserId      String
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
}
```

#### 字段说明

- `periodStart` / `periodEnd`
  - 用于后续做按月、按批次结算
  - 当前 Excel 如果只是散行，也可以先不填

- `totalSupplyAmount`
  - 渠道供货口径金额

- `totalCostAmount`
  - 成本口径金额

- `totalProfitAmount`
  - 结算单利润汇总

### 5.8 `ChannelSettlementItem`

渠道结算明细表。

```prisma
model ChannelSettlementItem {
  id                 String   @id @default(cuid())
  settlementId       String
  orderId            String?
  orderItemId        String?
  productId          String?
  orderDate          DateTime?
  itemName           String
  quantity           Decimal? @db.Decimal(12, 2)
  supplyUnitPrice    Decimal? @db.Decimal(12, 2)
  supplyAmount       Decimal? @db.Decimal(12, 2)
  cashPaymentAmount  Decimal? @db.Decimal(12, 2)
  paymentNote        String?  @db.VarChar(64)
  costUnitPrice      Decimal? @db.Decimal(12, 2)
  costAmount         Decimal? @db.Decimal(12, 2)
  profitAmount       Decimal? @db.Decimal(12, 2)
  remark             String?  @db.Text
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

#### 字段说明

- `cashPaymentAmount`
  - 对应 Excel 的 `现结货款`

- `paymentNote`
  - 对应 Excel 的 `收款情况`
  - V1 可以先保留为文本
  - 等后续结算规则稳定后，再升级成枚举

- `costUnitPrice` / `costAmount` / `profitAmount`
  - 这是原表最有价值的渠道利润结构
  - 不建议退化成订单备注

### 5.9 `FinanceAccount`

财务收款账户配置。

```prisma
model FinanceAccount {
  id              String   @id @default(cuid())
  companyName     String   @db.VarChar(255)
  accountName     String?  @db.VarChar(128)
  accountNo       String   @db.VarChar(128)
  bankName        String?  @db.VarChar(255)
  accountType     String?  @db.VarChar(64)
  usageScene      String?  @db.VarChar(128)
  isDefault       Boolean  @default(false)
  enabled         Boolean  @default(true)
  remark          String?  @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

#### 字段说明

- 这张表承接 `收款信息` sheet
- 它是“配置”，不是“流水”
- 建议放到系统设置下维护

## 6. 与现有模型的关系建议

### 与 `Customer`

- `SalesOrder.customerId` 关联现有客户
- 客户详情页增加：
  - 订单数
  - 累计成交额
  - 最近收款
  - 最近发货

### 与 `Quotation`

- `SalesOrder.quotationId` 可空关联现有报价单
- 后续可以支持：
  - 报价审批通过后 `转订单`
  - 报价状态从 `WON` 自动联动生成订单草稿

### 与 `Contract`

- `SalesOrder.contractId` 可空关联合同
- 用于标记“订单基于哪份合同履行”

### 与 `FileRecord`

当前 `FileRecord` 已支持 `businessType + businessId`。

建议新增这些业务类型值：

- `SALES_ORDER`
- `PAYMENT_RECORD`
- `SHIPMENT_RECORD`
- `CHANNEL_SETTLEMENT`

这样可以把：

- 订单截图
- 回单
- 快递底单
- 对账单
- 收款凭证

直接挂到现有档案中心里，不需要重新造附件系统。

### 与 `AuditLog`

建议新增模块名：

- `orders`
- `payments`
- `shipments`
- `channel_settlements`
- `finance_accounts`

## 7. Excel 字段映射建议

### 7.1 `海能量农业元素 登记`

#### 订单头

- `下单日期` → `SalesOrder.orderDate`
- `收件人` → `SalesOrder.recipientName`
- `收货地址` → `SalesOrder.recipientAddress`
- `联系电话` → `SalesOrder.recipientPhone`
- `订单号` → `SalesOrder.orderNo`
- `发货仓库` → `SalesOrder.warehouseName`
- `发货快递` → `ShipmentRecord.courierCompany`
- `应付金额` → `SalesOrder.receivableAmount`
- `实收金额` → 初始 `PaymentRecord.amount`
- `使用用途` → `SalesOrder.usagePurpose` 或 `SalesOrderItem.usagePurpose`

#### 订单明细

- `产品` → `SalesOrderItem.itemName`
- `数量` → `SalesOrderItem.quantity`

#### 导入注意

- 同一订单号下会有多行商品
- 只有首行有订单头信息
- 导入时需要按 `订单号` 先分组，再把后续空白行继承到同一订单

### 7.2 `填写示例`

- `商家名称` → `ChannelPartner.partnerName`
- `下单日期` → `ChannelSettlementItem.orderDate`
- `产品名称` → `ChannelSettlementItem.itemName`
- `数量` → `ChannelSettlementItem.quantity`
- `供货价` → `ChannelSettlementItem.supplyUnitPrice`
- `现结货款` → `ChannelSettlementItem.cashPaymentAmount`
- `收款情况` → `ChannelSettlementItem.paymentNote`
- `成本单价` → `ChannelSettlementItem.costUnitPrice`
- `成本金额` → `ChannelSettlementItem.costAmount`
- `利润金额` → `ChannelSettlementItem.profitAmount`
- `备注` → `ChannelSettlementItem.remark`

#### 导入注意

- 末尾 `合计` 行需要跳过
- 如果同一商家同一周期多条记录，建议生成一张 `ChannelSettlement` 主表，再挂多条明细

### 7.3 `收款信息`

- `主体公司` → `FinanceAccount.companyName`
- `开户行` → `FinanceAccount.bankName`
- `收款账号` → `FinanceAccount.accountNo`
- `适用场景` → `FinanceAccount.usageScene`

## 8. V1 和 V2 范围建议

### V1 先做

先做这些，就已经足够支撑当前 Excel 落库和后续日常使用：

1. `SalesOrder`
2. `SalesOrderItem`
3. `PaymentRecord`
4. `ShipmentRecord`
5. `ShipmentItem`
6. `ChannelPartner`
7. `ChannelSettlement`
8. `ChannelSettlementItem`
9. `FinanceAccount`
10. 订单列表 / 详情页
11. 收款列表
12. 发货列表
13. 渠道结算列表
14. 报价转订单入口
15. 客户详情里的订单关联区

### V2 再做

这些先不要急着上，不然第一版会过重：

- 仓库主档
- 快递公司主档
- 库存扣减
- 发票管理
- 退款 / 红冲
- 自动对账
- 渠道返利公式引擎
- 多主体账套
- 财务审批流

## 9. 权限码建议

按当前权限命名规则，建议补这些权限。

### 菜单

- `menu.orders`

### 页面

- `page.orders.list`
- `page.orders.detail`
- `page.orders.payments`
- `page.orders.shipments`
- `page.orders.channel_settlements`
- `page.settings.finance_accounts`

### 动作

- `action.order.create`
- `action.order.update`
- `action.order.confirm`
- `action.order.cancel`
- `action.order.record_payment`
- `action.order.create_shipment`
- `action.order.attach_file`
- `action.order.settle_channel`
- `action.finance_account.update`

## 10. 推荐实施顺序

如果你确认这版设计，我建议按这个顺序落：

1. 先补 Prisma 数据模型和枚举
2. 先做订单列表 + 订单详情
3. 再做收款和发货录入
4. 再做渠道结算列表与明细
5. 最后接 Excel 导入脚本

这样风险最低，因为：

- 订单主链先稳定
- 收款 / 发货 / 结算都能复用同一批客户与产品关系
- 后面导 Excel 时不会再改来改去

## 11. 我的建议

这组模块里，最应该先做的是：

- 订单主表
- 订单明细
- 收款记录
- 发货记录

因为这 4 个一旦稳定，你们现在最分散的销售表就已经能开始集中回 CRM。

渠道结算和财务账户配置也建议一起把结构留好，但页面功能可以比订单主链做得更轻一点，先满足：

- 看得到
- 录得进去
- 能关联订单
- 能算出供货金额 / 成本 / 利润

就已经足够支撑第一轮上线。
