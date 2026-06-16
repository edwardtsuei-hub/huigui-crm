# 产品页 V1 验收记录（2026-05-11）

## 结论

- 产品页 V1 的技术链路已经可以进入业务验收。
- 当前不建议重做产品中心版式；建议把 `产品中心 -> AI 解析待确认队列 -> 新增/编辑产品 -> 产品详情` 作为正式 V1 基线。
- 下一轮产品页再看 `批量维护`、`版本历史` 或 `解析结果批量确认`，不要继续扩大首页重构范围。

## 正式页与预览页

- 正式产品中心：`https://crm.hui-health.com/products`
- 正式新增产品：`https://crm.hui-health.com/products/new`
- 正式 AI 解析待确认队列：`https://crm.hui-health.com/products/ai-import`
- 正式产品详情：`https://crm.hui-health.com/products/:id`
- 正式产品编辑：`https://crm.hui-health.com/products/:id/edit`
- 本地产品中心预览：`http://127.0.0.1:3202/products-preview`
- 本地新增产品预览：`http://127.0.0.1:3202/products-new-preview`
- 本地编辑产品预览：`http://127.0.0.1:3202/products-edit-preview`
- 本地详情页预览：`http://127.0.0.1:3202/products-detail-preview`
- 本地解析器预览：`http://127.0.0.1:3202/products-parser-preview`
- 本地解析队列预览：`http://127.0.0.1:3202/products-ai-import-preview`

## 已验证链路

1. 产品中心
   - 保留 `筛选 + 高密度资产列表 + 右侧摘要`。
   - 保留 `新增产品`、`AI 解析辅助`、`待确认队列` 正式入口。
   - 适合作为产品资产盘点台，不再把 AI 解析器放回首页主视觉。

2. AI 解析待确认队列
   - 后端接口：`GET /api/products/parse-queue`、`GET /api/products/parse-queue/:id`、`PATCH /api/products/parse-queue/:id/review`。
   - 支持 `PENDING / CONFIRMED / IGNORED` 状态。
   - 支持冲突数量、低置信度数量、中置信度数量与解析字段数量统计。
   - 支持 `待确认`、`有冲突`、`低置信度`、`图文混合`、`最近已处理` 切片。

3. 新增 / 编辑产品
   - `parseLogId` 可从待确认队列带入解析记录。
   - `ProductSmartParser` 会展示队列记录状态、冲突数量、低置信度数量。
   - 解析结果仍需人工点击确认填入表单，不会自动覆盖正式字段。

4. 产品详情
   - 继续承接资产摘要、报价引用、关联检测、协作摘要。
   - V1 不承载重型版本历史、附件全量治理或审批流。

5. 权限
   - 查看解析队列需要 `page.products.ai_import`。
   - 确认或忽略解析记录需要 `action.product.update`。
   - `PRODUCT_SPECIALIST` 默认拥有产品页、AI 解析页、产品创建/编辑与产品维护动作权限。

## 回归测试

- 新增测试：`npm run test:products`
- 覆盖内容：
  - 解析队列列表序列化
  - 冲突、低置信度、中置信度统计
  - 详情接口返回完整解析结果
  - 确认队列记录时写入 reviewer 与 reviewedAt
  - review 接口拒绝手动提交 `PENDING`

## 待业务确认

- 是否同意产品中心继续作为资产盘点台。
- 是否同意 AI 解析继续只作为新建 / 编辑页顶部辅助入口。
- 是否同意 AI 解析待确认队列保留为正式入口。
- 是否同意产品详情页继续只做引用 / 检测 / 协作摘要。
- 是否同意下一轮产品页再进入批量维护、版本历史或解析队列批量处理。

## 后续建议

1. 先由业务在正式环境跑一次产品新增和解析队列确认。
2. 若无明显阻塞，将产品页状态从 `待验收` 调整为 `V1 已收口`。
3. 之后切到 P1 的下一个功能：档案自动归档与业务回链。
