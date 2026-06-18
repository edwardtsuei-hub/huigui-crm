# 员工端薪资灰度 URL 收口记录（2026-06-18）

## 结论

已在生产 `management.hui-health.com` 增加独立灰度入口：

```text
https://management.hui-health.com/employee-frontend-gray/20260618124806/
```

该入口用于薪资上传、薪资条发布、企微通知链路的并行验收；未切换正式员工端入口，未改 `current.release`，未覆盖现行员工端 release。

## 本次变更

- `apps/employee-frontend/src/App.tsx`
  - 支持非根路径部署，灰度地址下的路由可正确识别 `/payroll/batch` 等页面。
  - 灰度构建中，企微群发接口强制使用 `dryRun` 预览模式。
  - 灰度按钮文案显示为「发布并预览企微」；正式入口仍显示「发布并发送企微」。
- `deploy/nginx.conf`
  - 为 `management.hui-health.com` 增加 `/employee-frontend-gray/20260618124806/` 静态入口。
  - 灰度 JS/CSS 资源独立走 `/employee-frontend-gray/20260618124806/assets/`。

## 生产状态

- 灰度静态目录：

```text
/opt/huigui-crm/apps/web/public/employee-frontend-gray/20260618124806
```

- 当前正式员工端未切换：

```text
current.release = 20260616090241
current -> releases/20260616090241
```

## 安全边界

- 灰度入口不会真实群发企业微信薪资条通知。
- 灰度入口仍连接生产 API；有权限的财务账号若点击发布，薪资条数据仍会写入生产数据库。
- 本次未切换正式入口，正式 `https://management.hui-health.com/payroll/batch?month=2026-06` 仍返回原有工作平台入口。

## 验证记录

- `npm run lint:employee`：通过。
- `npm run build:employee`：通过。
- `npm exec -w @huigui/employee-frontend -- vite build --base=/employee-frontend-gray/20260618124806/`：通过。
- 灰度候选包 `checksums.sha256`：通过。
- 生产 nginx：
  - `nginx -t`：通过。
  - 容器内配置已加载 `employee-frontend-gray/20260618124806` 灰度规则。
- 公网 HTTP 验证：
  - `https://management.hui-health.com/employee-frontend-gray/20260618124806/`：HTTP 200，标题为「大愛歸心员工端」。
  - `https://management.hui-health.com/employee-frontend-gray/20260618124806/payroll/batch?month=2026-06`：HTTP 200，返回灰度员工端入口。
  - 灰度 JS：HTTP 200，`application/javascript`，包含「发布并预览企微」。
  - 灰度 CSS：HTTP 200，`text/css`。
  - `https://management.hui-health.com/api/health`：HTTP 200。
  - `https://management.hui-health.com/payroll/batch?month=2026-06`：HTTP 200，仍为旧正式入口标题「大爱归心工作平台」。

## 备注

服务器原 `deploy/nginx.conf` 已有灰度规则，但 nginx 容器最初仍读取旧 inode 上的配置文件。本次通过重建 nginx 容器重新挂载配置后，灰度规则已在容器内生效。

可操作浏览器在本轮打开公网灰度 URL 时等待超时，未作为验收依据；本次以公网 HTTP、资源类型、构建产物和 nginx 实际加载配置作为收口依据。

## 下一步

1. 发送灰度 URL 给你和立猛做登录与页面验收。
2. 灰度验收通过后，再决定是否切换正式员工端入口。
3. 正式切换前需要单独 Go / No-Go，不在本次灰度收口内。
