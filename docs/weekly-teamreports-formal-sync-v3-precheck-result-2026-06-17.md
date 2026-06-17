# Weekly teamReports v3 write-plan precheck result

日期：2026-06-17
状态：`blocked_existing_rows_precheck`

## 安全边界

- 本轮只执行 SELECT-only precheck。
- 未写数据库。
- 未执行 `--apply`。
- 未生成可执行生产写入 SQL。
- 未部署、未重启、未打 rollback tag。
- `deploymentAllowed=false` 继续保持。

## 结果摘要

write-plan 原本只允许规划 6 条 `WeeklyReport` 父记录。但只读 precheck 发现：这 6 条目标记录已经全部存在。

因此：

- 不得生成创建型正式写入包。
- 不得继续规划写入这 6 条父记录。
- 下一步应转入“既有同步结果验收 / 差异复核”。

## 目标用户

| login | userId | status | managerUserId |
| --- | --- | --- | --- |
| ChengCheng | `manual-chengcheng-dc9ce6815b1411f19d0d56ca918eaa42` | `ACTIVE` | `NULL` |
| greatchef | `manual-user-greatchef-20260529` | `ACTIVE` | `employee-lisali-user` |
| Han | `manual-han-672d26ec5b6511f19d0d56ca918eaa42` | `ACTIVE` | `employee-lisali-user` |
| lisali | `employee-lisali-user` | `ACTIVE` | `NULL` |

说明：早前设计中排除的 `Han -> lisali`、`greatchef -> lisali` 主管关系，在当前生产库中已经存在。需要单独验收其来源，不应在本次 write-plan 中再写。

## 6 条目标 WeeklyReport 已存在

| id | login | status | dataScope | partitionKey | weekStartDate | submittedAt |
| --- | --- | --- | --- | --- | --- | --- |
| `wr_f6d96e2ecf408970676e6808` | greatchef | `SUBMITTED` | `REAL` | `REAL` | `2026-05-24 16:00:00.000` | `2026-05-30 05:19:38.000` |
| `wr_b3f18d418c27145ced5e627c` | Han | `SUBMITTED` | `REAL` | `REAL` | `2026-05-24 16:00:00.000` | `2026-05-30 05:23:15.000` |
| `wr_3e8fad063c44a5bba1ee02f4` | lisali | `SUBMITTED` | `REAL` | `REAL` | `2026-05-24 16:00:00.000` | `2026-05-30 05:19:00.000` |
| `wr_c681a1d1666dd11fde497046` | lisali | `SUBMITTED` | `REAL` | `REAL` | `2026-05-31 16:00:00.000` | `2026-06-06 09:59:58.000` |
| `wr_b361a1934ab724cd56c5da14` | ChengCheng | `SUBMITTED` | `REAL` | `REAL` | `2026-06-07 16:00:00.000` | `2026-06-13 20:36:27.000` |
| `wr_6bf6e9ba0d49a18000a3fb7a` | lisali | `SUBMITTED` | `REAL` | `REAL` | `2026-06-07 16:00:00.000` | `2026-06-12 08:01:46.000` |

## 子表情况

| id | login | reviewItems | planItems | payloadLinks |
| --- | --- | ---: | ---: | ---: |
| `wr_f6d96e2ecf408970676e6808` | greatchef | 2 | 1 | 0 |
| `wr_b3f18d418c27145ced5e627c` | Han | 1 | 1 | 0 |
| `wr_3e8fad063c44a5bba1ee02f4` | lisali | 1 | 1 | 0 |
| `wr_c681a1d1666dd11fde497046` | lisali | 1 | 1 | 0 |
| `wr_b361a1934ab724cd56c5da14` | ChengCheng | 1 | 1 | 0 |
| `wr_6bf6e9ba0d49a18000a3fb7a` | lisali | 1 | 1 | 0 |

合计：

- `WeeklyReportReviewItem=7`
- `WeeklyReportPlanItem=6`
- `WeeklyReportPayload` direct links = 0

## payload 门禁

- `api_db_first_bridge / IMPORTED = 13`
- `legacy_weekly_workspace / IMPORTED = 3`
- `legacy_weekly_workspace / NEEDS_REVIEW = 3`
- `shared/shared/draft = 13`
- distinct `sourceSha16 = 13`

## 结论

本轮 write-plan 进入阻断状态：`blocked_existing_rows_precheck`。

建议 D 线复核后，将下一阶段改为：

1. 既有 6 条正式周报内容差异验收。
2. 既有 7 条 reviewItems、6 条 planItems 子表验收。
3. 已存在主管关系来源复核。
4. payload 未关联目标周报的原因复核。

未完成以上验收前，不应生成新的写库方案。
