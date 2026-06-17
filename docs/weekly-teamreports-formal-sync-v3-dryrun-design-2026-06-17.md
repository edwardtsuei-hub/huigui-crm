# Weekly teamReports 正式同步 v3 dry-run 设计

日期：2026-06-17
状态：`dry_run_design_only`
范围：基于 PR #4-#7 的 safe dry-run、业务审批处理包和 C 线回源报告，设计下一版正式同步 dry-run。

## 安全边界

- 本轮只输出 v3 dry-run 设计，不执行同步。
- 不执行 `--apply`。
- 不写生产数据库。
- 不生成正式生产 SQL。
- 不改 `prisma/schema.prisma`。
- 不生成 migration。
- 不改 API、前端或回填脚本。
- 不部署、不重启、不打 rollback tag。
- `deploymentAllowed=false` 继续保持。

## 输入依据

- PR #4：`weekly-teamreports-backfill-dryrun-v2.*`
- PR #5：`weekly-teamreports-formal-sync-approval-checklist.*`
- PR #6：`weekly-teamreports-business-approval-pack.*`
- PR #7：`weekly-teamreports-ellipsis-source-recovery-2026-06-17.md`

## v3 设计原则

1. 只把有明确文本证据或已按主线保守口径处理的记录放入 v3 dry-run 候选。
2. 无法补齐的尾部不自动脑补。
3. 同周较早提交上下文必须保留规则，但缺尾部的上下文不得被静默写成完整正文。
4. 主管关系变更完全拆出，不随周报同步写入。
5. v3 仍然是 dry-run，只允许生成候选计划和 SELECT-only 预检建议。

## 候选分流结果

| 行 | 成员 | 周期 | v3 状态 | 处理口径 |
| --- | --- | --- | --- | --- |
| 1 | 阿蕊 / Han | 2026-05-25 ~ 2026-05-31 | `include_with_omission_note` | 使用 C 线补齐的本周完成 4 项；下周计划只保留源 JSON 明确存在的前 3 项；不纳入 `4:上月考勤上交立猛 ...`。 |
| 2 | 申琦 / greatchef | 2026-05-25 ~ 2026-05-31 | `include_ready` | 文本无省略号，进入 v3 dry-run 候选。 |
| 3 | lisa / lisali | 2026-05-25 ~ 2026-05-31 | `include_ready` | 文本无省略号，进入 v3 dry-run 候选。 |
| 4 | 程程 / ChengCheng | 2026-06-01 ~ 2026-06-07 | `defer_missing_text` | `做出简易菜单供客...` 尾部仍无法补齐，暂不进入 v3 写入候选，只保留阻断清单。 |
| 5 | 申琦 / greatchef | 2026-06-01 ~ 2026-06-07 | `defer_missing_text` | `6.黑胡椒...` 尾部仍无法补齐，暂不进入 v3 写入候选，只保留阻断清单。 |
| 6 | lisa / lisali | 2026-06-01 ~ 2026-06-07 | `include_ready` | 文本无省略号，进入 v3 dry-run 候选。 |
| 7 | 程程 / ChengCheng | 2026-06-08 ~ 2026-06-14 | `include_latest_only_context_blocked` | 最新提交完整，可进入 v3 dry-run 候选；同周较早提交上下文保留为阻断元信息，缺尾部前不写入正文。 |
| 8 | lisa / lisali | 2026-06-08 ~ 2026-06-14 | `include_conservative_context` | 使用保守补齐到 `由申厨和陈师傅负责交流培训`；逗号后不补写；保留同周上下文结构和尾部缺失说明。 |

## v3 dry-run 预计候选

预计进入 v3 dry-run 候选池：6 条。

- Han / 2026-05-25：带 omission note。
- greatchef / 2026-05-25：ready。
- lisali / 2026-05-25：ready。
- lisali / 2026-06-01：ready。
- ChengCheng / 2026-06-08：latest only，context blocked。
- lisali / 2026-06-08：conservative context。

暂缓进入 v3 dry-run 写入候选：2 条。

- ChengCheng / 2026-06-01：缺 `做出简易菜单供客...` 尾部。
- greatchef / 2026-06-01：缺 `6.黑胡椒...` 尾部。

## 文本处理草案

### Han / 2026-05-25

本周完成：

```text
1:周六日喜乐瑜伽活动已经确定沟通好！包含用餐流程全部梳理
2:儿童节活动套餐已经搭配好，流程全部和前厅伙伴沟通
3:六月份活动已经和lisa沟通确定活动内容，具体事项6月份提前安排
4:套餐本周完成
```

下周计划：

```text
下周计划。6.1-6.7工作计划
1:六一活动安排。
2:周六日两天颂铂课程周四确定用餐人数，用餐模式和后厨沟通备货
3:梅门甩茶进货，热果饮和工厂沟通制作
```

遗漏说明：`4:上月考勤上交立猛 ...` 未纳入正文，因为本地无完整原文。

### ChengCheng / 2026-06-08

主正文：

```text
1、家庭振动师推海报已做完发圈推广，发推文，做直播2场
2、定制班12～16号开课，培训5天
3、21天打卡奖励驻颜术6.22
4、周三开会做课程总结和家庭振动师推广计划
```

下周计划：

```text
4、周三开会做课程总结和家庭振动师推广计划
```

上下文说明：2026-06-14 04:27 同周较早提交必须作为上下文保留，但第 4 项尾部仍缺，v3 dry-run 暂不把该上下文写入正式正文。

### lisali / 2026-06-08

建议正文结构：

```text
【最新提交 2026-06-12 16:01】
1. 下周五之前确认新菜单
2. 跟进雯雯新的橱窗kt板制作进度
3. 日本友人过来交流准备工作，前厅厨房清洁工作跟进,计划28-29号下午2点-5点，由申厨和陈师傅负责交流培训

【同周较早提交 2026-06-12 15:51】
1. 下周五之前确认新菜单
2. 跟进雯雯新的橱窗kt板制作进度
3. 日本友人过来交流准备工作，前厅厨房清洁工作跟进,计划28-29号下午2点-5点，由申厨和陈师傅负责交流培训

【缺失说明】
两次提交在“负责交流培训”之后的逗号尾部均未找到完整原文，v3 不自动补写。
```

## 主管关系处理

以下 2 条仍然不进入 weekly teamReports v3：

- Han -> lisali
- greatchef -> lisali

处理建议：另开组织关系变更 dry-run；未授权前不写 `User.managerUserId`。

## v3 dry-run 输出建议

下一步如进入实现，只允许生成：

- `weekly-teamreports-formal-sync-dryrun-v3.json`
- `weekly-teamreports-formal-sync-dryrun-v3.md`
- 可选 SELECT-only precheck SQL

禁止生成：

- `INSERT / UPDATE / DELETE / COMMIT / ROLLBACK` 生产 SQL
- 写库脚本
- migration
- API/前端/schema 改动

## 停止点

当前只完成 v3 dry-run 设计。进入任何 v3 dry-run 实现前，建议先由 D 线复核本设计文件范围，并继续保持 `deploymentAllowed=false`。
