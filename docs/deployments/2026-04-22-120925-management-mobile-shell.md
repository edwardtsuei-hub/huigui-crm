# 2026-04-22 12:09:25 management 手机端导航壳层定向同步

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：定向手动同步（management 手机端 app 式导航）
- 同步文件：
  - `apps/web/app/(dashboard)/DashboardLayoutClient.tsx`
  - `apps/web/components/system/shell.tsx`
  - `apps/web/app/globals.css`
- 远端重建：`app`
- 远端 nginx：已重启
- 回滚备份：`/opt/huigui-backups/huigui-crm-management-mobile-shell-20260422-120926.tar.gz`

## 本次变更

- 手机端不再把桌面侧栏直接堆在页面顶端，而是改成左侧抽屉导航。
- 新增手机端底部 `dock` 导航，保留：
  - `首页`
  - `周报`
  - `班表`
  - `更多`
- 顶部工具区改为更接近 app 的 compact app bar，并在滚动时自动收短。
- 手机端搜索改成独立搜索层，快捷创建改成浮动按钮与弹出面板。
- 打开手机端抽屉导航时会锁定背景滚动，避免页面与抽屉同时滚动。

## 远端执行

```bash
docker compose build app
docker compose up -d app nginx
docker compose restart nginx
```

## 验证

- `https://management.hui-health.com/login` 返回 `200`
- 登录页仍可读到：
  - `大愛歸心管理平台`
  - `像光一樣`
  - `旗下公司`
- 生产登录 API `https://management.hui-health.com/api/auth/login` 返回正常 token
- 已用手机视口验证 `https://management.hui-health.com/schedule/shifts`：
  - 顶部为 compact app bar
  - 底部存在移动端 `dock`
  - 左上菜单可打开抽屉式侧栏

## 测试入口

- 登录页：`https://management.hui-health.com/login`
- 手机端建议先测：`https://management.hui-health.com/schedule/shifts`
