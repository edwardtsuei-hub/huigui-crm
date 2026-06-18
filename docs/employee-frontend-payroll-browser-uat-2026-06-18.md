# 员工端薪资前端浏览器验收与候选包记录（2026-06-18）

## 结论

员工端薪资前端已完成本地可操作浏览器验收，并重新生成候选静态包。

- 验收页面：`apps/employee-frontend`
- 验收方式：本地浏览器 + 本地隔离接口
- 生产企微通道验证：已由双人 0 元测试批次覆盖
- 正式员工端入口：未切换
- 生产数据库：本次浏览器验收未写入
- 企业微信：本次浏览器验收未发送

## 浏览器验收结果

已通过：

- 登录页可输入账号和密码，并进入员工端。
- `/finance/imports?type=salary_slip&month=2026-06&returnTo=/payroll/batch` 能打开导入中心。
- 导入中心显示上传薪资表、薪资表类型、返回核对入口。
- `/payroll/batch?month=2026-06` 能显示薪资批量发送页。
- 页面能显示薪资草稿文件名、发布批次、2 行明细、2 人可企微通知。
- 发布按钮在未勾选“我已核对原始薪资表 / 我已确认通知名单”前保持禁用。
- 勾选两项确认后，发布按钮启用。
- 点击发布后，本地隔离接口完成 dry-run 闭环，页面显示发布成功、发布追溯、正式薪资条和通知记录。
- 浏览器控制台无 error。

本轮浏览器接口限制：

- 当前可操作浏览器 API 不能直接向 `<input type="file">` 注入本地文件。
- 因此文件选择动作只验证到上传 UI 可见；CSV/XLSX 解析能力由 `npm run build:employee`、既有 payroll 回归和本地隔离草稿继续覆盖。

## 候选包

- 候选 release id：`20260618121622`
- 候选包目录：`output/employee-frontend/release-candidates/employee-frontend-payroll-20260618121622`
- 来源 commit：`3b7bdfd8a2c4f4ef7fd44a2ede404600445cc3af`
- 当前仓库员工端旧 release：`20260616090241`
- 状态：`candidate_not_deployed`
- 文件数：10

候选包包含：

- `dist/**`
- sourcemap 文件
- `WW_verify_c3gCJkz4TJsbTeiJ.txt`
- `favicon.svg`
- `manifest.json`
- `checksums.sha256`
- `README.md`

校验结果：

```text
shasum -a 256 -c checksums.sha256
全部 OK
```

## 已执行检查

```text
npm run lint:employee
npm run build:employee
本地可操作浏览器验收
候选包 checksums.sha256 校验
```

## 当前上线判断

后台大爱归心企微通道已经上线，双人 0 元真实测试发送已通过。

员工端前端还未正式切换。进入正式可用仍需要下一步二选一：

1. 先把候选包放到服务器灰度 URL，财务用真实浏览器打开灰度路径做最后确认。
2. 用户明确 Go / No-Go 后，切换正式 `current` 到候选 release，并保留旧 release 回滚。
