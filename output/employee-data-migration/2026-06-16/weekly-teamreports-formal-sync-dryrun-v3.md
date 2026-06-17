# Weekly teamReports formal sync dry-run v3

Generated at: 2026-06-17T13:20:00+08:00
Status: `safe_dry_run_v3_only`

## Safety boundary

- This is a dry-run candidate output only.
- It did not execute `--apply`.
- It did not write the database.
- It did not generate production SQL.
- It did not change `prisma/schema.prisma`.
- It did not generate a migration.
- It did not change API, frontend, or deployment files.
- It did not deploy, restart, create a rollback tag, or perform rollback.
- `deploymentAllowed=false` remains in force.

## Inputs

- `output/employee-data-migration/2026-06-16/weekly-teamreports-backfill-dryrun-v2.json`
- `output/employee-data-migration/2026-06-16/weekly-teamreports-business-approval-pack.json`
- `docs/weekly-teamreports-ellipsis-source-recovery-2026-06-17.md`
- `output/employee-data-migration/2026-06-16/weekly-teamreports-formal-sync-v3-dryrun-design.json`

## Summary

- Source candidates from v2: 8
- Included in v3 dry-run candidate pool: 6
- Deferred because source text is still incomplete: 2
- Manager relation changes excluded from weekly teamReports v3: 2
- Existing real weekly reports in v2 precheck: 0
- Missing users in v2 precheck: 0
- Approved for production write: false

## Included v3 dry-run candidates

| row | owner | week | decision | proposed id | note |
| --- | --- | --- | --- | --- | --- |
| 1 | 阿蕊 / Han | 2026-05-25 ~ 2026-05-31 | `include_with_omission_note` | `wr_b3f18d418c27145ced5e627c` | Keep recovered text; exclude unrecovered `4:上月考勤上交立猛 ...`. |
| 2 | 申琦 / greatchef | 2026-05-25 ~ 2026-05-31 | `include_ready` | `wr_f6d96e2ecf408970676e6808` | Text is complete. |
| 3 | lisa / lisali | 2026-05-25 ~ 2026-05-31 | `include_ready` | `wr_3e8fad063c44a5bba1ee02f4` | Text is complete. |
| 6 | lisa / lisali | 2026-06-01 ~ 2026-06-07 | `include_ready` | `wr_c681a1d1666dd11fde497046` | Text is complete. |
| 7 | 程程 / ChengCheng | 2026-06-08 ~ 2026-06-14 | `include_latest_only_context_blocked` | `wr_b361a1934ab724cd56c5da14` | Use latest complete submission; preserve earlier same-week incomplete context as metadata. |
| 8 | lisa / lisali | 2026-06-08 ~ 2026-06-14 | `include_conservative_context` | `wr_6bf6e9ba0d49a18000a3fb7a` | Preserve latest and earlier same-week context; recover only to `负责交流培训` and record missing tail. |

## Candidate body drafts

### 1. 阿蕊 / Han / 2026-05-25

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

遗漏说明：`4:上月考勤上交立猛 ...` 没有找到完整原文，v3 不自动补写，也不纳入正文。

### 2. 申琦 / greatchef / 2026-05-25

本周完成：

```text
本周工作内容：
1.红豆沙的改良。
2.制作上新菜品台南炸豆腐。
3.制作上新菜品番茄豆腐面。
4.菜单的出品正规化，口味、摆盘符合门店标准。
```

下周计划：

```text
下周工作计划：
1.厨房员工的菜品培训。
2.日常每天厨房卫生的保持工作。
3.新菜品贝果的研发制作。
4.日常节约用水、用电的培训。
5.保持门店现菜单菜品的出餐统一化。
```

需要协调：

```text
需要协调事项：
1.随和和店长沟通每天日常顾客的食品反馈。
2.和店员凯欣沟通订货的数量及规格采买。
3.和Lisa沟通后期店面的活动时间及活动出餐客人的需求。
```

### 3. lisa / lisali / 2026-05-25

本周完成：

```text
本周完成红豆沙调试，六一儿童节儿童餐和礼品已定下，现有菜单SOP已经整理完成并配照片，已经发给申厨供厨房参考。整理联营前期需要准备的list。
```

下周计划：

```text
做联营需要的品牌介绍和章程方面的PPT，番茄豆腐汤面需要测试完成，拍菜品制作视频，配合申厨后续动作。
```

### 6. lisa / lisali / 2026-06-01

本周完成：

```text
1. 下周二计划和万科商业见面沟通店面选址事项
2. 整理2道新菜品的SOP及视频培训拍摄
3. 梳理及更新会员机制
4. 小红书推广文案
```

下周计划：

```text
1. 下周二计划和万科商业见面沟通店面选址事项
```

主管点评：

```text
已看完3点，之后每周的周报周五大家发过来后，周六会统一由系统汇总，然后再发给大家一个总的工作内容，这样子大家会更方便同步，也知道彼此要配合什么，程程的内容也会一起并入进来。 所以还是要麻烦你再写的仔细一点，这样子可以帮助自己更多的回顾，还有让大家知道工作的方向。
```

### 7. 程程 / ChengCheng / 2026-06-08

正式正文仅使用最新完整提交：

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

同周较早提交保留为阻断元信息，不写入正式正文：

```text
2026-06-14 04:27：
1、家庭振动师推文
2、定制班12号开课报名2人，房间定制，各群发招募信息发朋友圈
3、准备道冲元气资料做白皮书（可以集体参与汇总）
4、道冲元气客户三档餐标确定，做出简易菜单供客...
```

阻断说明：同周较早提交第 4 项仍缺尾部，v3 不自动补写。

### 8. lisa / lisali / 2026-06-08

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

下周计划：

```text
1. 下周五之前确认新菜单
```

## Deferred candidates

| row | owner | week | decision | blocker |
| --- | --- | --- | --- | --- |
| 4 | 程程 / ChengCheng | 2026-06-01 ~ 2026-06-07 | `defer_missing_text` | `做出简易菜单供客...` 尾部仍未找到。 |
| 5 | 申琦 / greatchef | 2026-06-01 ~ 2026-06-07 | `defer_missing_text` | `6.黑胡椒...` 尾部仍未找到。 |

这 2 条不进入 v3 dry-run 写入候选。后续只能在业务提供完整原文，或明确批准删除缺失项后，再进入下一版 dry-run。

## Manager relation changes excluded

| member | proposed manager | decision |
| --- | --- | --- |
| Han / 阿蕊 | lisali / Lisa Li | Excluded from weekly teamReports v3; requires separate organization-data approval. |
| greatchef / 申琦 | lisali / Lisa Li | Excluded from weekly teamReports v3; requires separate organization-data approval. |

## Risk gates

| gate | severity | status | note |
| --- | --- | --- | --- |
| production_write | blocker | blocked | This output does not authorize writes. |
| production_sql | blocker | blocked | No INSERT, UPDATE, DELETE, COMMIT, or ROLLBACK SQL generated. |
| deferred_text | high | blocked_for_2_rows | Two candidates remain incomplete and are excluded. |
| same_week_context | medium | metadata_preserved | Same-week context is preserved without guessing missing tails. |
| manager_relation | medium | separate_approval_required | Two manager links are out of scope for weekly reports. |

## Next step

D line should review that this candidate output contains only dry-run artifacts and SELECT-only precheck SQL. No formal sync write plan should start until the user explicitly authorizes it after review.
