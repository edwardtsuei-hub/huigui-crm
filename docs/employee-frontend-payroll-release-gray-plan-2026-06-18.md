# 员工端薪资前端 release / 灰度接入方案（不部署版，2026-06-18）

## 结论

本方案只用于评审和后续执行授权，不代表已经部署。

当前建议采用“先生成候选静态包，再走并行灰度验收，最后 Go / No-Go 后切换 release 指针”的方式接入 `apps/employee-frontend`。在用户明确确认执行前，不改 `apps/web/public/employee-frontend/current.release`，不切换 `current` 软链，不覆盖现行 release，也不发送企业微信真实通知。

## 当前事实

- 当前线上员工端静态 release 仍为 `20260616090241`。
- `apps/web/public/employee-frontend/current.release` 内容为 `20260616090241`。
- `apps/web/public/employee-frontend/current` 指向 `releases/20260616090241`。
- 现行 release 目录为 `apps/web/public/employee-frontend/releases/20260616090241/**`。
- 新的可维护员工端候选源码为 `apps/employee-frontend`，由 PR #32 合入 `main`。
- 候选工程构建命令为 `npm run build:employee`。
- 候选工程构建输出目录为 `apps/employee-frontend/dist`；该目录不纳入 git。
- 候选工程 build 已开启 sourcemap，后续排查不再只依赖压缩 bundle。

## 本方案禁止事项

- 禁止直接修改 `apps/web/public/employee-frontend/releases/20260616090241/**`。
- 禁止直接把 `apps/employee-frontend/dist/**` 覆盖到现行 release。
- 禁止在没有 Go / No-Go 记录前切换 `apps/web/public/employee-frontend/current`。
- 禁止在没有 Go / No-Go 记录前改写 `apps/web/public/employee-frontend/current.release`。
- 禁止以本方案替代真账号登录验收。
- 禁止以本方案触发生产数据库写入或企业微信真实通知。

## 推荐路径

### 阶段 1：候选包生成

执行前必须重新确认工作区干净，并确认现行 release 无 diff。

```bash
npm run lint:employee
npm run build:employee
git diff --name-only -- apps/web/public/employee-frontend/releases/20260616090241
```

候选包只从 `apps/employee-frontend/dist/**` 生成，不从现行压缩 release 反向改造。

建议 release id 使用时间戳：

```text
YYYYMMDDHHMMSS
```

建议交付包命名：

```text
employee-frontend-payroll-YYYYMMDDHHMMSS
```

交付包必须包含：

- `dist/**`。
- `manifest.json`，记录 release id、来源 commit、构建时间、构建命令和所有文件 SHA256。
- `checksums.sha256`。
- `README.md`，说明这是候选包，尚未切换生产 release。

如线上仍需要企业微信校验文件或 favicon，应从当前 release 复制以下静态文件到候选包，但必须在 manifest 中标记来源：

- `WW_verify_c3gCJkz4TJsbTeiJ.txt`
- `favicon.svg`

### 阶段 2：并行灰度

优先使用并行路径验收，不直接替换现行 `current`。

可选灰度路径：

- 服务器并行目录：`/opt/hui-health/employee-frontend/releases/<new-release-id>`。
- Nginx 临时灰度路径：例如 `/employee-frontend-gray/<new-release-id>/`。
- 仅内网可访问的预览路径。

灰度期间必须保留旧 release：

- 旧 release id：`20260616090241`。
- 旧 current 指针：`releases/20260616090241`。

灰度验收必须用测试账号完成，不以构建成功代替业务通过。

### 阶段 3：Go / No-Go

只有以下项目全部通过，才允许进入正式切换：

- 财务或管理员测试账号可进入 `/payroll/batch`。
- `/payroll/batch` 能看到上传入口和空状态入口。
- `去导入中心` 能跳转 `/finance/imports?type=salary_slip&month=YYYY-MM&returnTo=/payroll/batch`。
- `/finance/imports` 能完成 CSV / XLSX 解析、草稿保存和返回。
- 未处理差异会阻断发布。
- 正式发布会调用 `salary-slips/sync`，并写入同一 `publishBatchId`。
- 通知记录会调用 `salary-notify-logs`，并写入同一 `publishBatchId`。
- `/payroll/batch` 可按发布批次读回薪资条和通知记录。
- 员工本人账号只能读回自己的薪资条。
- 同名员工不能互相看到薪资条。
- 无企业微信账号、合作老师等跳过通知场景与 UAT 预期一致。
- 企业微信真实通知仍处于关闭、测试应用或 dry-run 状态，直到另有授权。
- 现行 release 目录没有被修改。
- 回滚命令和旧 release id 已在执行记录中写明。

Go / No-Go 记录建议包含：

- 候选 release id。
- 来源 commit。
- 验收账号角色，不记录密码或 token。
- 验收月份。
- 测试 `publishBatchId`。
- 通过与失败项。
- 是否允许切换 `current`。
- 是否允许企业微信真实通知。

### 阶段 4：正式切换

正式切换必须另行确认后执行。本文件不授权切换。

切换时只能做以下动作：

1. 保留旧 `current.release` 内容作为回滚 release id。
2. 上传候选 release 到新目录。
3. 校验 `checksums.sha256`。
4. 将 `current` 软链切到新 release。
5. 将 `current.release` 写为新 release id。
6. 执行页面 smoke test。
7. 如 smoke test 失败，立即切回旧 release id。

## 回滚规则

回滚目标固定为切换前记录的旧 release id，本轮当前值为 `20260616090241`。

回滚必须恢复：

- `current` 软链。
- `current.release` 内容。
- Nginx 静态资源访问结果。

回滚后必须检查：

- `/payroll/batch` 页面可访问。
- `/finance/imports` 页面可访问。
- `apps/web/public/employee-frontend/releases/20260616090241/**` 未被覆盖。

## 发布前检查命令

正式切换前至少重新执行：

```bash
npm run lint:employee
npm run build:employee
npm run test:payroll
npm run preflight:payroll -- --out output/payroll/salary-slip-preflight-current.json --markdown-out output/payroll/salary-slip-preflight-current.md
npm run lint
npm run build
git diff --name-only -- apps/web/public/employee-frontend/releases/20260616090241
```

期望结果：

- `npm run test:payroll` 通过 48/48。
- `npm run preflight:payroll` 不能有 failures。
- 如本机 Docker 仍不存在，`blocked_waiting_for_local_docker` 可保留为 Docker 标准演练路径 blocker，但不能新增 payroll 功能 blocker。
- `git diff --name-only -- apps/web/public/employee-frontend/releases/20260616090241` 必须为空。
- `apps/employee-frontend/dist` 只作为构建输出，不纳入 git。

## 人工确认清单

执行正式切换前，仍需用户确认：

- 是否接受 `apps/employee-frontend` 作为新的员工端源码基线。
- 使用哪个测试账号做财务、管理员和员工本人验收。
- 哪些账号具备 `FINANCE` 或 `action.payroll.publish` 权限。
- 是否采用并行灰度路径，还是直接新 release 目录后切 `current`。
- 企业微信通知是否只走测试应用或 dry-run。
- 发生失败时是否立即回滚到 `20260616090241`。

## 当前完工判断

代码与文件层面，PR #32 合入后已具备可维护员工端候选源码。

正式完工不能只按 PR 合并计算，还需要完成以下事项：

1. 本方案评审通过。
2. 候选静态包生成并留存 manifest。
3. 真账号灰度验收通过。
4. Go / No-Go 明确允许切换。
5. 正式切换后 smoke test 通过。
6. 如启用企业微信真实通知，另有通知授权与回执记录。

在这些完成前，项目状态应继续标记为：

```text
blocked_waiting_for_employee_frontend_go_no_go
```
