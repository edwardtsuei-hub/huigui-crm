# 员工端薪资独立正式入口上线记录

时间：2026-06-18 20:32:59 +0800

## 结论

已在 `management.hui-health.com` 新增独立薪资入口：

```text
https://management.hui-health.com/employee-payroll/
https://management.hui-health.com/employee-payroll/finance/imports?type=salary_slip&month=2026-06
```

本次没有切换 `apps/web/public/employee-frontend/current.release`，没有替换原大爱归心工作平台首页，也没有覆盖旧正式 release `20260616090241`。

## 执行范围

- 新增 nginx 静态路径：
  - `/employee-payroll/assets/`
  - `/employee-payroll/`
- 上传正式子路径候选包到服务器：
  - `/opt/huigui-crm/apps/web/public/employee-payroll`
- 重启服务：
  - 仅重启 `nginx`

未执行：

- 未切换 `employee-frontend/current.release`
- 未切换 `employee-frontend/current` 软链
- 未执行数据库迁移
- 未重建 API / app 容器
- 未执行 seed
- 未真实发送企业微信
- 未覆盖旧 release `20260616090241`

## 候选包

- release id：`20260618202823`
- 本地候选包：`output/employee-frontend/release-candidates/employee-payroll-official-20260618202823`
- public base path：`/employee-payroll/`
- 回滚目标 release：`20260616090241`
- 来源 commit：`6df9312`
- 备注：候选包由当前工作区构建，manifest 已记录 `workingTreeDirty=true`。

## 服务器备份

- nginx 配置备份目录：`/opt/huigui-backups/nginx-payroll-subpath`
- 本次备份标记：`20260618-202915`
- nginx 配置备份：`/opt/huigui-backups/nginx-payroll-subpath/nginx-before-employee-payroll-20260618-202915.conf`

## 验证

- `npm run lint:employee`：通过
- `npm run test:payroll`：通过，53 项
- `npm exec -w @huigui/employee-frontend -- vite build --base=/employee-payroll/`：通过
- 本地候选包 `sha256sum -c checksums.sha256`：通过
- 服务器候选包 `sha256sum -c checksums.sha256`：通过
- `docker compose exec -T nginx nginx -t`：通过
- `https://management.hui-health.com/employee-payroll/`：HTTP 200，标题为「大愛歸心员工端」
- `https://management.hui-health.com/employee-payroll/finance/imports?type=salary_slip&month=2026-06`：HTTP 200，加载 `/employee-payroll/assets/index-DAZCwwon.js`
- `https://management.hui-health.com/payroll/batch`：HTTP 200，仍为旧「大爱归心工作平台」
- `https://management.hui-health.com/`：HTTP 200，仍为旧「大爱归心工作平台」
- `https://management.hui-health.com/employee-frontend-gray/20260618124806/...`：HTTP 200，灰度入口仍可用
- `https://management.hui-health.com/api/health`：HTTP 200
- 服务器 `current.release`：仍为 `20260616090241`

## 截图

- `output/screenshots/04-employee-payroll-official-subpath-20260618.png`

## 回滚

如果需要撤销本次独立入口：

1. 恢复 nginx 配置：
   - `deploy/nginx.conf` 可从 `/opt/huigui-backups/nginx-payroll-subpath/nginx-before-employee-payroll-20260618-202915.conf` 恢复。
2. 删除或保留静态目录均可：
   - `/opt/huigui-crm/apps/web/public/employee-payroll`
3. 执行 `docker compose exec -T nginx nginx -t`。
4. 重启 `nginx`。

旧正式员工端 release 不需要回滚，因为本次没有切换它。
