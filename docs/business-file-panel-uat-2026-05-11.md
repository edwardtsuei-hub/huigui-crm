# 业务详情页附件归档入口 V1（2026-05-11）

## 结论

- 档案中心自动归档能力已接到业务详情页。
- 报价、订单、检测、产品详情页现在可以直接上传附件，并自动带入标准业务类型与业务 ID。
- 上传后的文件会进入档案中心业务资料夹，同时可从业务页和档案中心双向查看。

## 已实现

1. 共用业务附件面板
   - 新增 `BusinessFilePanel`
   - 支持多文件上传、备注、重要文件标记、附件类型选择
   - 上传时固定写入：
     - `businessType`
     - `businessId`
     - `relatedType`
     - `relatedId`
     - `status: ARCHIVED`

2. 业务页入口
   - 报价详情：`QUOTATION`
   - 订单详情：`SALES_ORDER`
   - 检测详情：`INSPECTION_ORDER`
   - 产品详情：`PRODUCT`

3. 精准回看附件
   - 档案列表 API 支持 `relatedType + relatedId`
   - 业务页只显示当前单据 / 产品自己的附件
   - 已自动归档到业务资料夹的文件不会因为不在根目录而查不到

4. 档案中心跳转
   - 业务页可打开当前业务对象的档案中心筛选结果
   - 单个附件可跳到档案中心单文件视图

## 验收方式

1. 打开任一正式业务详情页：
   - `/quotations/:id`
   - `/orders/:id`
   - `/inspections/:id`
   - `/products/:id`
2. 在附件面板上传一个文件。
3. 确认上传成功后：
   - 当前详情页附件列表出现该文件
   - 文件状态为 `已归档`
   - 打开档案中心只显示当前业务对象的附件
   - 在档案中心右侧详情点击 `前往业务` 能回到对应详情页
4. 对同一业务对象再次上传同名文件，确认版本号递增。

## 回归测试

- `npm run test:files`
  - 已覆盖自动归档、版本链和 `relatedType + relatedId` 精准查找。

## 本轮验证

- `npm run test:files`
- `npm run lint -w @huigui/api`
- `npm run lint -w @huigui/web`

## 下一步

- 视业务反馈决定是否增加：
  - 附件待审核队列
  - 版本差异说明
  - 客户详情页附件入口
  - 附件上传后的企业微信提醒
