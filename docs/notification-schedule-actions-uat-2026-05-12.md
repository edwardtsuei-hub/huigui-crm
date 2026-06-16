# 通知 / 日程处理动作 V1（2026-05-12）

## 结论

- 通知中心已从“只读提醒列表”推进到“可直接处理任务通知”的 V1。
- TASK 类站内通知现在可直接完成、标记进行中、延后明天。
- 操作成功后会同步更新任务、企微日程，并把该通知标记为已读。

## 已实现

1. 通知快捷动作接口
   - 新增：`POST /api/notifications/:id/action`
   - 支持动作：
     - `TASK_DONE`
     - `TASK_DOING`
     - `TASK_TODO`
     - `TASK_DELAY_1D`
     - `TASK_DELAY_3D`
     - `TASK_DELAY_7D`
   - 接口会先确认通知属于当前用户，且 `relatedType = TASK`。

2. 任务快捷处理能力
   - `TasksService.quickAction` 统一处理任务状态与延后逻辑。
   - 标记完成 / 进行中 / 待处理会写入审计日志。
   - 延后会同步移动：
     - `startAt`
     - `endAt`
     - `reminderAt`
   - 更新后会触发企业微信日程同步。

3. 通知中心前端入口
   - `/notifications` 的 TASK 类站内通知新增快捷按钮：
     - 标记完成
     - 标记进行中
     - 延后明天
   - 操作后自动刷新通知列表与顶部铃铛摘要。
   - 操作成功后通知自动变为已读。

## 验收方式

1. 打开：
   - `https://crm.hui-health.com/notifications`
2. 筛选站内通知，找到 `工作计划提醒 / 计划提醒 / 工作计划指派` 类通知。
3. 对 TASK 类通知点击：
   - `标记完成`
   - 或 `标记进行中`
   - 或 `延后明天`
4. 确认：
   - 通知自动变为已读
   - 顶部铃铛未读数刷新
   - `/schedule` 中对应任务状态或日期已更新
   - 企业微信日程同步记录随任务更新

## 回归测试

- 新增脚本：`npm run test:notifications`
- 覆盖：
  - 任务快捷完成并同步企微日程
  - 任务快捷延后并移动相关时间
  - 只允许 TASK 通知进入快捷处理
  - 非 TASK 通知拒绝快捷处理

## 本轮验证

- `npm run test:notifications`
- `npm run lint -w @huigui/api`
- `npm run lint -w @huigui/web`

## 下一步

- 通知抽屉也可增加同样的 TASK 快捷动作。
- 审批类通知可增加 `通过 / 退回` 的轻量处理入口。
- 周报 / 月目标通知可增加 `前往审阅` 与 `催办已处理` 状态。
