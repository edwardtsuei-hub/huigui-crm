# Weekly teamReports safe dry-run v2

Source dir: `storage/uploads/employee-launch-weekly`
Generated at: 2026-06-16T22:42:31.598Z
Status: `safe_dry_run_only`

## Summary

- Candidate real weekly reports: 8
- Missing users: 0
- Existing real weekly reports: 0
- New report candidates: 8
- Could be historical formal candidates after review: 8
- Approved for automatic import: 0
- Entries with legacy ellipsis: 5
- Entries with superseded same-week submission context: 2
- Manager relation updates requested by source mapping: 2
- Safe to apply: false
- Production SQL generated: false

## Risk gates

| gate | severity | status | note |
| --- | --- | --- | --- |
| production_writes | blocker | blocked | This script is dry-run only; --apply is disabled. |
| production_sql | blocker | blocked | No INSERT/UPDATE/DELETE SQL is generated. |
| manager_relation | medium | separate_approval_required | User.managerUserId changes are organization data changes and must be approved separately. |
| candidate_content | medium | business_review_required | The 8 rows are historical candidates only and are not approved for automatic import. |
| child_rows | high | needs_design | Review and plan item replacement must not delete user-edited content without backup and id alignment. |

## Entries

| owner | week | submittedAt | action | candidate review | flags | existing report | proposed id | source | completed | plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 阿蕊 (Han) | 2026-05-25 ~ 2026-05-31 | 2026-05-30 13:23 | dry_run_create_candidate_only | candidate_needs_business_review | ellipsis | - | wr_b3f18d418c27145ced5e627c | b0a1a524b401e3b032dd1967fc750e4e.json | 1:周六日喜乐瑜伽活动已经确定沟通好！包含用餐流程全部梳理 2:儿童节活动套餐已经搭配好，流程全部和前厅伙伴沟通 3:六月份活动已经和lisa沟通确定活动内容，具体事项6月份提前安... | 下周计划。6.1-6.7工作计划 1:六一活动安排。 2:周六日两天颂铂课程周四确定用餐人数，用餐模式和后厨沟通备货 3:梅门甩茶进货，热果饮和工厂沟通制作 4:上月考勤上交立猛 ... |
| 申琦 (greatchef) | 2026-05-25 ~ 2026-05-31 | 2026-05-30 13:19 | dry_run_create_candidate_only | candidate_needs_business_review | - | - | wr_f6d96e2ecf408970676e6808 | b0a1a524b401e3b032dd1967fc750e4e.json | 本周工作内容： 1.红豆沙的改良。 2.制作上新菜品台南炸豆腐。 3.制作上新菜品番茄豆腐面。 4.菜单的出品正规化，口味、摆盘符合门店标准。 | 下周工作计划： 1.厨房员工的菜品培训。 2.日常每天厨房卫生的保持工作。 3.新菜品贝果的研发制作。 4.日常节约用水、用电的培训。 5.保持门店现菜单菜品的出餐统一化。 |
| lisa (lisali) | 2026-05-25 ~ 2026-05-31 | 2026-05-30 13:19 | dry_run_create_candidate_only | candidate_needs_business_review | - | - | wr_3e8fad063c44a5bba1ee02f4 | fbfa90f2cb747790bfbd57e4af6752df.json | 本周完成红豆沙调试，六一儿童节儿童餐和礼品已定下，现有菜单SOP已经整理完成并配照片，已经发给申厨供厨房参考。整理联营前期需要准备的list。 | 做联营需要的品牌介绍和章程方面的PPT，番茄豆腐汤面需要测试完成，拍菜品制作视频，配合申厨后续动作。 |
| 程程 (ChengCheng) | 2026-06-01 ~ 2026-06-07 | 2026-06-07 05:26 | dry_run_create_candidate_only | candidate_needs_business_review | ellipsis | - | wr_fa07cbec542a9d71ea66f8a7 | b0a1a524b401e3b032dd1967fc750e4e.json | 1、家庭振动师推文 2、定制班12号开课报名2人，房间定制，各群发招募信息发朋友圈 3、准备道冲元气资料做白皮书（可以集体参与汇总） 4、道冲元气客户三档餐标确定，做出简易菜单供客... | 2、定制班12号开课报名2人，房间定制，各群发招募信息发朋友圈 |
| 申琦 (greatchef) | 2026-06-01 ~ 2026-06-07 | 2026-06-05 17:55 | dry_run_create_candidate_only | candidate_needs_business_review | ellipsis | - | wr_ee35a6b8731ee3a02c2515df | b0a1a524b401e3b032dd1967fc750e4e.json | 本周工作内容： 1.贝果菜品的上新制作。 2.制作上新菜品台南炸豆腐。 3.制作上新菜品番茄豆腐面。 4.菜单的出品正规化，口味、摆盘符合门店标准。 | 下周工作计划： 1.西班牙冷汤的制作。 2.日常每天厨房卫生的保持工作。 3.包浆豆腐酱汁的调试。 4.日常节约用水、用电的培训。 5.保持门店现菜单菜品的出餐统一化。 6.黑胡椒... |
| lisa (lisali) | 2026-06-01 ~ 2026-06-07 | 2026-06-06 17:59 | dry_run_create_candidate_only | candidate_needs_business_review | - | - | wr_c681a1d1666dd11fde497046 | b0a1a524b401e3b032dd1967fc750e4e.json | 1. 下周二计划和万科商业见面沟通店面选址事项 2. 整理2道新菜品的SOP及视频培训拍摄 3. 梳理及更新会员机制 4. 小红书推广文案 | 1. 下周二计划和万科商业见面沟通店面选址事项 |
| 程程 (ChengCheng) | 2026-06-08 ~ 2026-06-14 | 2026-06-14 04:36 | dry_run_create_candidate_only | candidate_needs_business_review | ellipsis, superseded | - | wr_b361a1934ab724cd56c5da14 | b0a1a524b401e3b032dd1967fc750e4e.json | 1、家庭振动师推海报已做完发圈推广，发推文，做直播2场 2、定制班12～16号开课，培训5天 3、21天打卡奖励驻颜术6.22 4、周三开会做课程总结和家庭振动师推广计划 同周较早提交（2026-06-14 04:27）： 1、家庭振... | 4、周三开会做课程总结和家庭振动师推广计划 |
| lisa (lisali) | 2026-06-08 ~ 2026-06-14 | 2026-06-12 16:01 | dry_run_create_candidate_only | candidate_needs_business_review | ellipsis, superseded | - | wr_6bf6e9ba0d49a18000a3fb7a | b0a1a524b401e3b032dd1967fc750e4e.json | Lisa: 1. 下周五之前确认新菜单 2. 跟进雯雯新的橱窗kt板制作进度 3. 日本友人过来交流准备工作，前厅厨房清洁工作跟进,计划28-29号下午2点-5点，由申厨和陈师傅负... 同周较早提交（2026-06-12 15:51... | 1. 下周五之前确认新菜单 |

## Manager relation precheck

- Han -> lisali: would require separate approval
- greatchef -> lisali: would require separate approval

## Safety

- This dry-run did not write to the database.
- `--apply` is disabled in this script.
- The optional SQL output is SELECT-only precheck text, not production SQL.
- Existing real weekly reports block automatic child-row generation until the actual report id is confirmed.
- `User.managerUserId` updates must be handled in a separate approved change.
