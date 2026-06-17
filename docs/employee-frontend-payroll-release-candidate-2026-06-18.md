# 员工端薪资前端候选包记录（2026-06-18）

## 结论

已生成一个本地候选静态包，供后续灰度验收使用。

该候选包未部署、未切换 `current.release`、未写生产数据库、未发送企业微信通知。

## 候选包信息

- 候选 release id：`20260618063203`
- 候选包目录：`output/employee-frontend/release-candidates/employee-frontend-payroll-20260618063203`
- 状态：`candidate_not_deployed`
- 来源分支：`main`
- 来源 commit：`84b2498a5a967e70932b3420b595a369d9ce1dc3`
- 当前线上员工端 release：`20260616090241`
- 当前 `current` 指针：`releases/20260616090241`
- 构建来源：`apps/employee-frontend/dist`
- 候选包文件数：10

候选包包含：

- Vite build 后的 `dist/**`。
- sourcemap 文件。
- 从当前 release 复制的 `WW_verify_c3gCJkz4TJsbTeiJ.txt`。
- 从当前 release 复制的 `favicon.svg`。
- `manifest.json`。
- `checksums.sha256`。
- `README.md`。

## 已执行检查

```bash
npm run lint:employee
npm run build:employee
shasum -a 256 -c checksums.sha256
npm run test:payroll
npm run preflight:payroll -- --out output/payroll/salary-slip-preflight-current.json --markdown-out output/payroll/salary-slip-preflight-current.md
npm run lint
npm run build
git diff --name-only -- apps/web/public/employee-frontend/releases/20260616090241 apps/web/public/employee-frontend/current apps/web/public/employee-frontend/current.release
```

检查结果：

- `npm run lint:employee` 通过。
- `npm run build:employee` 通过。
- 候选包 `checksums.sha256` 全部通过。
- `npm run test:payroll` 通过，48/48。
- `npm run preflight:payroll` 通过，状态为 `passed_with_blockers`。
- `npm run lint` 通过。
- `npm run build` 通过。
- 现行 release、`current` 和 `current.release` diff 为空。

保留 blocker：

- `blocked_waiting_for_local_docker`：本机 Docker 不存在，仅阻塞 Docker 标准演练路径。

## 未执行事项

- 未部署候选包。
- 未上传到服务器。
- 未切换 `apps/web/public/employee-frontend/current`。
- 未改写 `apps/web/public/employee-frontend/current.release`。
- 未覆盖 `apps/web/public/employee-frontend/releases/20260616090241/**`。
- 未写生产数据库。
- 未发送企业微信真实通知。
- 未做真账号灰度验收。

## 候选包 manifest 摘要

```json
{
  "status": "candidate_not_deployed",
  "releaseId": "20260618063203",
  "sourceCommit": "84b2498a5a967e70932b3420b595a369d9ce1dc3",
  "currentProductionRelease": "20260616090241",
  "writesProduction": false,
  "switchesCurrentRelease": false,
  "sendsWecomNotification": false,
  "fileCount": 10
}
```

## 下一步

进入真账号灰度验收前，需要用户确认：

- 财务或管理员测试账号。
- 员工本人测试账号。
- 本次灰度验收月份。
- 测试 `publishBatchId`。
- 企业微信通知是否保持 dry-run 或测试应用。
- 是否允许把候选包放到服务器并行灰度路径，而不是切换正式 `current`。

正式切换仍需另行 Go / No-Go；本记录不授权部署。
