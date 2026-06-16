# 2026-04-20 产品缺口开发拆解清单

## 关联文档

- 总路线图：
  - `docs/product-gap-roadmap-2026-04-20.md`

## 使用方式

- 这份文档面向开发排期和任务分配。
- 每个任务都尽量给出：
  - 目标
  - 主要改动点
  - 建议涉及文件
  - 依赖关系
  - 完成定义

## 迭代 1

### T1. 全局搜索升级为真实业务搜索

#### 目标

- 让顶部搜索从“导航目录筛选”升级成“真实业务对象搜索”。

#### 主要改动点

- 增加统一搜索接口，支持按关键词返回多种业务对象。
- 前端搜索弹层按对象类型分组展示结果。
- 支持回车进入最佳匹配结果。
- 保留工作台入口搜索作为兜底分组，不再是唯一结果来源。

#### 建议涉及文件

- 前端
  - [shell.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/components/system/shell.tsx:508)
  - [navigation.ts](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/lib/navigation.ts:186)
  - [api.ts](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/lib/api.ts:1)
- 后端
  - `apps/api/src/search/*` 新增统一搜索模块
  - 或在现有 `meta / customers / quotations / orders / inspections` 模块上新增聚合查询入口

#### 依赖关系

- 需要先确定可搜索对象范围与排序规则。

#### 完成定义

- 搜索客户名、报价单号、订单号、检测单号、成员名均可返回真实结果。
- 搜索结果至少展示：
  - 类型
  - 标题
  - 辅助信息
  - 跳转目标
- 空结果提示从“工作台入口”改为“业务对象”语义。

### T2. 报价转订单改为确认式转单

#### 目标

- 避免报价详情页一键落库订单，改为确认后创建。

#### 主要改动点

- 在报价详情页增加转单确认抽屉或确认页。
- 转单前补齐订单头字段：
  - 收货人
  - 联系方式
  - 地址
  - 仓库
  - 渠道
  - 备注
- 对缺关键字段给出提交前校验。

#### 建议涉及文件

- 前端
  - [quotations/[id]/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/quotations/[id]/page.tsx:425)
  - `apps/web/lib/orders.ts`
  - `apps/web/components/system/primitives.tsx`
- 后端
  - `apps/api/src/orders/orders.controller.ts`
  - `apps/api/src/orders/orders.service.ts`
  - 若需要新增“从报价预填订单”的接口，可补专用 endpoint

#### 依赖关系

- 依赖订单创建字段口径先定清楚。
- 建议与订单详情页字段保持一致。

#### 完成定义

- 点击“转为订单”后先进入确认层。
- 未补齐关键字段时不可提交。
- 提交成功后进入订单详情页。
- 同一报价不会重复转出多张订单。

### T3. 检测待补关联批量处理

#### 目标

- 让检测待补关联从逐条处理升级为队列化批量处理。

#### 主要改动点

- 检测列表支持多选。
- 新增批量补客户、批量补产品、批量标记稍后处理。
- 对同标题、同实验室、同时间段记录提供建议匹配。

#### 建议涉及文件

- 前端
  - `apps/web/app/(dashboard)/inspections/page.tsx`
  - `apps/web/app/(dashboard)/inspections/[id]/page.tsx`
  - `apps/web/app/(dashboard)/inspections/[id]/edit/page.tsx`
  - [types.ts](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/components/inspections/types.ts:256)
- 后端
  - [inspections.service.ts](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/api/src/inspections/inspections.service.ts:759)
  - `apps/api/src/inspections/inspections.controller.ts`

#### 依赖关系

- 建议先确认批量更新接口的数据结构。

#### 完成定义

- 运营可在列表页批量补关联。
- 批量提交后，待补关联计数即时刷新。
- 无法自动确定匹配对象时，系统必须提示人工确认。

## 迭代 2

### T4. 报价中心批量处理能力

#### 目标

- 把报价工作台从阅读型页面升级为真正可执行的工作台。

#### 主要改动点

- 列表多选
- 批量导出
- 批量发起审批
- 批量标记已发送
- 保存筛选视图

#### 建议涉及文件

- 前端
  - [quotations/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/quotations/page.tsx:1)
  - `apps/web/components/quotations/QuotationsWorkbench.tsx`
- 后端
  - `apps/api/src/quotations/quotations.controller.ts`
  - `apps/api/src/quotations/quotations.service.ts`
  - 审批相关模块

#### 完成定义

- 支持多选至少 `20` 笔报价。
- 至少 `3` 个批量动作可稳定执行。
- 批量结果有成功/失败反馈。

### T5. 订单中心批量处理能力

#### 目标

- 让订单中心支持多笔订单并行推进。

#### 主要改动点

- 列表多选
- 批量催收
- 批量进入发货准备
- 批量更新状态
- 保存筛选视图

#### 建议涉及文件

- 前端
  - [orders/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/orders/page.tsx:1)
  - `apps/web/components/orders/OrdersWorkbench.tsx`
- 后端
  - `apps/api/src/orders/orders.controller.ts`
  - `apps/api/src/orders/orders.service.ts`

#### 完成定义

- 可以一次处理多笔订单。
- 批量动作后列表状态立即刷新。

### T6. 行业 / 服务 / 养殖报价业务化分层

#### 目标

- 保留共用底层逻辑，但让三类报价在页面层真正区分开。

#### 主要改动点

- 区分标题、说明、默认值、筛选范围、导出模板。
- 为每类报价补业务语义和字段策略。

#### 建议涉及文件

- 前端
  - [quotes/general/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/quotes/general/page.tsx:52)
  - [solutions/industry/new/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/solutions/industry/new/page.tsx:1)
  - [solutions/service/new/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/solutions/service/new/page.tsx:1)
  - [solutions/breeding/new/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/solutions/breeding/new/page.tsx:1)
- 后端
  - `apps/api/src/quotations/*`
  - 导出模板生成逻辑

#### 完成定义

- 三类入口进入后页面语义明显不同。
- 导出内容能区分报价类型。

## 迭代 3

### T7. 客户池治理增强

#### 目标

- 提升客户池运营能力，而不只是浏览客户列表。

#### 主要改动点

- 重复客户识别
- 合并流程
- 跟进超时队列
- 负责人负载视图

#### 建议涉及文件

- 前端
  - `apps/web/app/(dashboard)/customers/page.tsx`
  - [customers/[id]/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/customers/[id]/page.tsx:1)
- 后端
  - `apps/api/src/customers/customers.service.ts`
  - 跟进记录相关模块

#### 完成定义

- 可识别疑似重复客户。
- 能按超时未跟进、高意向、沉默客户自动形成队列。

### T8. 产品解析升级为半自动建档

#### 目标

- 把 AI 解析从“临时辅助”升级为“可连续处理的建档流程”。

#### 主要改动点

- 字段置信度
- 冲突字段对照
- 来源高亮
- 待确认队列
- 批量导入入口

#### 建议涉及文件

- 前端
  - `apps/web/app/(dashboard)/products/new/page.tsx`
  - `apps/web/app/(dashboard)/products/[id]/edit/page.tsx`
  - `apps/web/components/products/*`
- 后端
  - 产品解析模块
  - `apps/api/src/products/*`

#### 完成定义

- 用户可连续处理多条解析结果。
- 字段来源与冲突被明确展示。

### T9. 档案自动归档与业务回链

#### 目标

- 让档案从“文件库”升级为“业务附属资产系统”。

#### 主要改动点

- 报价 / 订单 / 检测上传时自动带业务关联
- 自动创建资料夹
- 新版本覆盖为版本链
- 待审核队列

#### 建议涉及文件

- 前端
  - [files/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/files/page.tsx:1)
  - `apps/web/components/files/FilesWorkbench.tsx`
- 后端
  - `apps/api/src/files/*`

#### 完成定义

- 业务详情页能直接看到关联档案。
- 同名更新形成版本记录，不形成孤立重复文件。

## 迭代 4

### T10. 工作管理团队推进闭环

#### 目标

- 让团队视角具备管理动作，而不是只看空态或提交率。

#### 主要改动点

- 一键催交
- 未提交原因
- 团队差异比较
- 从周报 / 月目标派生提醒与待办

#### 建议涉及文件

- 前端
  - `apps/web/app/(dashboard)/work-management/overview/page.tsx`
  - `apps/web/app/(dashboard)/work-management/weekly-reports/page.tsx`
  - `apps/web/app/(dashboard)/work-management/monthly-goals/page.tsx`
  - `apps/web/components/work-management/WorkManagementUI.tsx`
- 后端
  - 工作管理相关模块
  - 通知相关模块

#### 完成定义

- 管理者能一键提醒未提交成员。
- 团队差异和风险可在同一视角下读懂。

### T11. 通知 / 日程增加处理动作

#### 目标

- 让通知和日程从“消息页”变成“执行页”。

#### 主要改动点

- 稍后提醒
- 转待办
- 批量已读
- 批量分派
- 来源状态回写

#### 建议涉及文件

- 前端
  - `apps/web/app/(dashboard)/schedule/page.tsx`
  - `apps/web/app/(dashboard)/notifications/page.tsx`
  - `apps/web/components/dashboard/NotificationDrawer.tsx`
  - `apps/web/lib/schedule.ts`
- 后端
  - `apps/api/src/notifications/*`
  - `apps/api/src/schedule/*` 或对应任务模块

#### 完成定义

- 用户不离开通知 / 日程页，也能完成主要处理动作。

### T12. 权限变更安全性增强

#### 目标

- 降低管理员调整角色权限时的误操作风险。

#### 主要改动点

- 权限 diff
- 影响面预览
- 角色复制
- 保存前确认

#### 建议涉及文件

- 前端
  - [management/roles/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/management/roles/page.tsx:81)
  - [management/members/page.tsx](/Users/i-datsuei/Desktop/Huigui%20CRM%20%26%20Quotation%20System/apps/web/app/(dashboard)/management/members/page.tsx:159)
  - `apps/web/lib/management.ts`
- 后端
  - `apps/api/src/management/*`
  - 角色权限相关模块

#### 完成定义

- 保存前能看到本次变更内容。
- 支持复制现有角色为新角色。

## 建议分工

### 前端主责

- 搜索弹层与结果分组
- 各工作台批量操作交互
- 转单确认抽屉
- 团队视图和通知 / 日程操作入口

### 后端主责

- 聚合搜索接口
- 批量更新接口
- 转单确认后的创建逻辑
- 档案自动关联与版本记录

### 联调主责

- 搜索排序与权限过滤
- 报价转订单口径一致性
- 批量操作后的列表刷新
- 回链关系与统计口径

## 完成顺序建议

1. 先完成 `T1 / T2 / T3`
2. 再进入 `T4 / T5 / T6`
3. 然后做 `T7 / T8 / T9`
4. 最后补 `T10 / T11 / T12`

## 里程碑判断标准

- 里程碑 A：
  - 搜索已能搜真实业务对象
  - 转单前必须确认
  - 检测待补关联支持批量处理

- 里程碑 B：
  - 报价与订单工作台具备批量动作
  - 三类报价页具备明显业务差异

- 里程碑 C：
  - 客户、产品、档案、工作管理形成更完整运营闭环

- 里程碑 D：
  - 管理与协作模块具备可持续运营能力
