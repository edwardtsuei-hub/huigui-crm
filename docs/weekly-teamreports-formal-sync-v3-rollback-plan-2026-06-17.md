# Weekly teamReports 正式同步 v3 rollback plan

日期：2026-06-17
状态：`blocked_existing_rows_precheck`

## 安全边界

- 本文件不是回滚授权。
- 本文件不包含可执行回滚 SQL。
- 本轮未写数据库、未部署、未重启、未打 rollback tag。
- `deploymentAllowed=false` 继续保持。

## 只读 precheck 结果

SELECT-only precheck 已确认以下 6 条 `WeeklyReport` 父记录当前已经存在，并且已有子表记录：

- `wr_b3f18d418c27145ced5e627c`
- `wr_f6d96e2ecf408970676e6808`
- `wr_3e8fad063c44a5bba1ee02f4`
- `wr_c681a1d1666dd11fde497046`
- `wr_b361a1934ab724cd56c5da14`
- `wr_6bf6e9ba0d49a18000a3fb7a`

因此，本文件不得作为“新写入后的回滚计划”使用。当前更接近“既有同步结果验收后的人工修正预案”。

## 回滚前必须确认

未来如需回滚，必须先确认：

1. 这些记录确实由哪一次历史同步创建。
2. 这些记录没有用户后续编辑。
3. 这些记录没有新增 `WeeklyReportReviewItem`。
4. 这些记录没有新增 `WeeklyReportPlanItem`。
5. 这些记录没有被 `WeeklyReportPayload` 关联。
6. D 线重新完成只读门禁。
7. 用户明确授权回滚。

## 回滚策略

只读 precheck 已显示目标记录有子表引用，因此当前不允许自动回滚。

若后续确需处理，只能先做人工差异复核，确认每条记录、子表和用户编辑状态后，再另开单独回滚方案。

## 回滚后 postcheck

未来如果人工回滚方案被授权并执行，必须确认：

- 6 个 proposed id 不再存在。
- 目标用户其他 `WeeklyReport` 不受影响。
- `WeeklyReportReviewItem` 不出现孤儿记录。
- `WeeklyReportPlanItem` 不出现孤儿记录。
- `WeeklyReportPayload` 分组未发生非授权变化。
- `shared/shared/draft` 未增长。

## 停止条件

- 发现任何目标记录已被用户编辑。
- 发现任何目标记录已有子表引用。
- 发现任何目标记录已被 payload 关联。
- D 线门禁失败。
- 用户未明确授权。

本阶段只保留回滚原则，不生成可执行语句。
