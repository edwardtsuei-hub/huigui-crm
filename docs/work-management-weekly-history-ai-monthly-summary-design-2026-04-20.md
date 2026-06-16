# 2026-04-20 工作管理设计补充：历史周报 + AI 月度总结

## 背景

当前工作管理模块已经有：

- `总览`：展示待处理周报、待处理月目标、近期周报、最近月目标
- `周报页`：支持编辑当前周报、查看最近 4 条历史周报、查看团队已提交周报
- `月目标页`：支持编辑当前月目标、查看最近 4 个月目标、承接上月未完成目标

但还缺两类关键能力：

1. `历史周报回顾`  
   现在能“快速切换最近几条”，但还不能系统地“按月份/状态/人员回看历史周报”。

2. `AI 月度总结`  
   现在月目标页能写“本月概述”，但没有从当月周报自动汇总出月度回顾、问题模式、延续事项和下月建议。

本文件目标是：在不推翻现有信息架构的前提下，把这两项能力自然接到现有页面上。

---

## 现状与可复用基础

### 现有可直接复用的页面结构

#### 1. `周报页`

位置：

- `apps/web/app/(dashboard)/work-management/weekly-reports/page.tsx`

当前已有：

- 左侧主区：上周遗留事项、本周总结、本周计划、讨论
- 右侧边栏：
  - `历史周报`
  - `团队已提交周报`
  - `相关日程`
  - `本周提醒`

这意味着：

- `历史周报` 不需要新开一级模块
- 最自然的做法是直接在当前右侧边栏或弹层中扩展成“历史归档查看”

#### 2. `总览页`

位置：

- `apps/web/app/(dashboard)/work-management/overview/page.tsx`

当前已有：

- `近期周报`
- `最近月目标`
- 待创建 / 待提交状态卡

这意味着：

- 总览页可以承担“入口页”的角色
- 适合新增“历史周报回顾入口”和“AI 月度总结入口”

#### 3. `月目标页`

位置：

- `apps/web/app/(dashboard)/work-management/monthly-goals/page.tsx`

当前已有：

- `本月概述`
- `目标条目`
- `上月未完成目标候选`
- `历史月目标`
- `团队已提交目标`

这意味着：

- `AI 月度总结` 最适合落在 `本月概述` 与 `目标条目` 之间
- 因为这个位置最接近“先看回顾，再决定本月目标怎么写”

---

## 设计目标

### 历史周报

希望做到：

- 能查看不止最近 4 条，而是完整历史
- 能按月份、状态、人员回看
- 能从“最近切换”升级为“复盘入口”
- 不破坏现有周报编辑动线

### AI 月度总结

希望做到：

- 以“当月周报”为主要输入
- 自动汇总：
  - 本月核心成果
  - 重复风险 / 阻塞
  - 未完成事项
  - 协作需求
  - 下月建议重点
- 可以被用户编辑、确认、复制到月目标或下月目标
- 不和用户手写的“本月概述”混在一起

---

## 页面设计

## 一、总览页怎么接

位置：

- `apps/web/app/(dashboard)/work-management/overview/page.tsx`

### 新增 1 个轻入口卡片：`历史周报回顾`

建议放在：

- 现有 `近期周报` 卡片附近

卡片内容：

- 标题：`历史周报回顾`
- 描述：`按月份回看历史周报，快速整理本月关键成果、遗留事项与风险模式。`
- 主按钮：`查看全部历史`
- 次按钮：`进入本月AI总结`

作用：

- 不让用户只在周报页里被动切换
- 在总览页就能意识到“历史回顾”与“AI 月结”是同一条链路

### 新增 1 个轻状态卡：`本月AI总结`

建议显示：

- 本月已提交周报数
- 最近一次生成时间
- 当前状态：
  - 未生成
  - 已生成待确认
  - 已确认

按钮：

- `生成总结`
- 或 `继续查看`

---

## 二、周报页怎么接“历史周报查看”

位置：

- `apps/web/app/(dashboard)/work-management/weekly-reports/page.tsx`

### 现有问题

当前右侧 `历史周报` 只有：

- 最近 4 条
- 点击切换查看

这更像“快速切换”，不是“历史回顾”。

### 建议做法

保留现有右侧卡片，但升级为两层结构：

#### 第一层：保留现有 `历史周报`

继续显示：

- 最近 4 条
- 当前选中状态

卡片底部新增：

- `查看全部历史`

#### 第二层：新增一个 `历史周报抽屉 / 侧滑层`

打开后展示：

- 月份筛选：`2026-04`、`2026-03`、`2026-02`
- 状态筛选：`全部 / 草稿 / 已提交`
- 视角筛选：
  - 我的视角：默认只看自己
  - 团队视角：可按成员查看
- 列表字段：
  - 周期
  - 提交状态
  - 更新时间 / 提交时间
  - 待回顾项数量
  - 本周计划数量

每条记录支持：

- `查看详情`
- `加入本月回顾`

### 为什么不用新页面

因为当前周报页已经是“编辑 + 查看详情”一体页。

如果再开一个 `/weekly-reports/history`：

- 信息架构会分裂
- 用户会在“当前周报页”和“历史页”之间来回跳

抽屉式查看更符合当前页面结构。

### 详情区怎么增强“回顾感”

当用户打开一份 `已提交` 的历史周报时，建议在主区标题下面增加一个只读信息条：

- `历史周报视角`
- 来源月份：例如 `2026-04`
- 可执行动作：
  - `回到当前周报`
  - `加入本月AI总结`
  - `复制为本周计划参考`

这样用户不会误以为自己正在编辑当前周期。

---

## 三、月目标页怎么接“AI 月度总结”

位置：

- `apps/web/app/(dashboard)/work-management/monthly-goals/page.tsx`

### 推荐插入位置

放在：

- `本月概述`
- 和
- `目标条目`

之间

原因：

- 这是最自然的思考顺序：
  1. 看本月回顾
  2. 再决定本月目标和调整项

### 新增区块：`月度回顾与 AI 总结`

建议结构：

#### 顶部信息条

- 当前月份：`2026 年 04 月`
- 周报来源：
  - 已提交周报 `4` 份
  - 草稿 `1` 份
- 数据来源说明：
  - 周报总结
  - 周报遗留事项
  - 本月目标当前条目
  - 可选：讨论评论

#### 操作按钮

- `生成 AI 总结`
- `重新生成`
- `复制到本月概述`
- `复制为下月重点`

#### AI 输出区建议拆成 5 块

1. `本月核心成果`
   - 从各周报的成果字段中抽取

2. `推进节奏与模式`
   - 哪些事项持续推进
   - 哪些工作反复出现但没有收口

3. `主要风险 / 阻塞`
   - 从每周问题、协助项中抽模式

4. `未完成与延续事项`
   - 哪些事项需要延续到下月

5. `下月建议重点`
   - 给出 3~5 条下月优先项建议

### 和现有“本月概述”的关系

不建议直接把 AI 结果写进当前 `summary`。

原因：

- `MonthlyGoal.summary` 现在承载的是用户手写结构：
  - `[本月工作重点]`
  - `[核心交付方向]`
  - `[风险与注意事项]`
- 如果直接混入 AI 内容，用户手写和 AI 草稿会缠在一起
- 后面也不好做“重新生成”“确认版本”“保留历史”

### 推荐交互

AI 总结先以独立区块存在，用户再主动执行：

- `复制到本月概述`
- `转成目标项`
- `复制为下月重点`

这样不会污染现有月目标编辑结构。

---

## 数据与接口设计

## 一、历史周报接口

### 当前已有

- `GET /work-management/weekly-reports`

当前返回：

- `pendingWeeklyReport`
- `items`
- `teamItems`

问题：

- 更像首页数据，不像归档数据
- 没有筛选、分页、月份过滤

### 建议新增

#### 方案 A：扩展现有接口

```http
GET /work-management/weekly-reports?year=2026&month=4&status=SUBMITTED&view=mine&page=1&pageSize=20
```

优点：

- 复用现有路由

缺点：

- 会把当前“轻量首页接口”和“归档查询接口”混在一起

#### 方案 B：新增归档接口

```http
GET /work-management/weekly-reports/archive?year=2026&month=4&status=SUBMITTED&view=mine&page=1&pageSize=20
```

建议采用：

- `方案 B`

原因：

- 语义更清楚
- 不影响现在页面初始化逻辑
- 后续可以继续扩展团队视角、按成员筛选

### 返回结构建议

```ts
type WeeklyReportArchiveResponse = {
  filters: {
    year?: number;
    month?: number;
    status?: "DRAFT" | "SUBMITTED";
    view: "mine" | "team";
    ownerId?: string;
  };
  items: WeeklyReportSummary[];
  page: number;
  pageSize: number;
  total: number;
  availableMonths: Array<{
    year: number;
    month: number;
    count: number;
  }>;
};
```

---

## 二、AI 月度总结接口

### 当前情况

项目里目前没有现成的 OpenAI / AI 汇总服务接入。

所以设计上要分成两层：

#### MVP

- 支持后端生成一次性总结结果
- 前端展示
- 用户手动复制到月目标概述
- 暂不持久化

#### 推荐正式版

- 生成结果可保存
- 可重新生成
- 可保留多个版本
- 可标记“已确认版本”

### 接口建议

```http
POST /work-management/monthly-goals/:id/ai-summary/generate
```

请求体建议：

```ts
type GenerateMonthlyAiSummaryDto = {
  includeWeeklyReports: boolean;
  includeGoalItems: boolean;
  includeComments: boolean;
  scope: "SELF" | "TEAM";
  ownerIds?: string[];
  regenerate?: boolean;
};
```

返回建议：

```ts
type MonthlyAiSummaryResponse = {
  id: string;
  goalId: string;
  targetYear: number;
  targetMonth: number;
  status: "GENERATED" | "CONFIRMED";
  source: {
    weeklyReportCount: number;
    submittedWeeklyReportCount: number;
    goalItemCount: number;
    commentCount: number;
  };
  sections: {
    highlights: string;
    patterns: string;
    risks: string;
    carryovers: string;
    nextMonthSuggestions: string;
  };
  generatedAt: string;
};
```

---

## 三、数据存储建议

### 不建议

不建议直接写回：

- `MonthlyGoal.summary`

原因：

- 会和用户手写内容混在一起
- 无法区分 AI 草稿和最终确认文本

### 推荐新增一张表

建议新增：

```prisma
model MonthlyAiSummary {
  id                   String   @id @default(cuid())
  monthlyGoalId        String
  targetYear           Int
  targetMonth          Int
  scope                String   @db.VarChar(32) // SELF / TEAM
  sourceSnapshot       String?  @db.Text
  highlights           String?  @db.Text
  patterns             String?  @db.Text
  risks                String?  @db.Text
  carryovers           String?  @db.Text
  nextMonthSuggestions String?  @db.Text
  status               String   @default("GENERATED") @db.VarChar(32)
  generatedByUserId    String?
  confirmedByUserId    String?
  generatedAt          DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

这样可以支持：

- 多次重生成
- 版本保留
- 确认状态
- 后续导出或给主管查看

---

## 交互建议

## 一、历史周报回顾流程

1. 用户进入 `周报页`
2. 右侧点击 `查看全部历史`
3. 在抽屉里按月份筛选
4. 打开某一份已提交周报
5. 点击 `加入本月AI总结`
6. 系统将该周报标记为本月回顾输入之一

### MVP 简化版

其实不一定需要“手动加入”。

也可以直接按月份自动收集：

- 该月所有已提交周报

这样实现更简单。

建议：

- `MVP` 用自动收集
- `V2` 再加“排除某条周报 / 手动补选某条周报”

## 二、AI 月度总结流程

1. 用户进入 `月目标页`
2. 在 `月度回顾与 AI 总结` 区块点击 `生成 AI 总结`
3. 系统默认取：
   - 当月所有已提交周报
   - 当前月目标条目
   - 可选评论
4. 返回 5 个结构化区块
5. 用户检查后可执行：
   - `复制到本月概述`
   - `复制为下月重点`
   - `重新生成`
   - `确认版本`

---

## MVP 建议

如果先做一版最小可用，建议分两步：

### 第一步：历史周报增强

- 周报页右侧 `历史周报` 卡片保留
- 新增 `查看全部历史`
- 新增历史抽屉
- 后端补 `weekly-reports/archive`

### 第二步：AI 月度总结占位 + 人工可用版

- 月目标页新增 `月度回顾与 AI 总结` 区块
- 先支持：
  - 统计本月已提交周报数
  - 列出本月周报标题
  - 手动触发生成
  - 生成结果展示在独立卡片
- 先不自动写入 `summary`

这样就能快速上线，而且不会破坏当前月目标编辑逻辑。

---

## 推荐优先级

### P1

- `周报页历史归档`

理由：

- 这是 AI 月度总结的输入前提
- 也是用户现在最明显缺失的能力

### P1

- `月目标页新增 AI 月度总结区块`

理由：

- 正好贴合当前 `本月概述 -> 目标条目` 的页面结构

### P2

- `总览页新增历史回顾 / AI 月结入口`

理由：

- 提升发现效率
- 但不影响核心能力先上线

---

## 最终建议

最适合接到现有页面上的方式，不是新开一个大模块，而是：

- 在 `周报页` 把现有 `历史周报` 升级成“最近记录 + 完整归档抽屉”
- 在 `月目标页` 新增一个独立的 `月度回顾与 AI 总结` 区块
- 在 `总览页` 增加轻入口和状态提示

这样改动最少、认知成本最低，也最符合当前工作管理模块已经形成的“总览 -> 周报 -> 月目标”推进链路。
