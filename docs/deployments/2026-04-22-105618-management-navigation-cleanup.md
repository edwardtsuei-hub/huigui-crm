# 2026-04-22 10:56:18 management 导航收口定向同步

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：定向手动同步（management 导航收口）
- 同步文件：
  - `apps/web/lib/navigation.ts`
  - `apps/web/components/system/shell.tsx`
  - `apps/web/app/(dashboard)/DashboardLayoutClient.tsx`
- 远端重建：`app`
- 远端 nginx：已重启
- 回滚备份：`/opt/huigui-backups/huigui-crm-management-navigation-cleanup-20260422-105618.tar.gz`

## 本次变更

- `management.hui-health.com` 改为按品牌读取专属导航配置。
- 侧栏移除不属于当前管理平台范围的旧 CRM 模块：
  - `客户`
  - `产品`
  - `方案`
  - `订单`
  - `档案`
- `日程` 在 management 站点收敛为 `班表管理`，入口直接指向 `/schedule/shifts`。
- 顶栏全局搜索改成 management 口径，只保留周报、班表、成员与管理入口文案。
- 侧栏底部、账号菜单、快捷创建同步按 management 站点权限与范围收口，避免隐藏入口残留。

## 验证

- 远端 `docker compose build app` 成功。
- 远端 `docker compose up -d app nginx` 成功。
- 浏览器硬刷新后，`management.hui-health.com/work-management/weekly-reports` 左侧导航已变为：
  - `首页`
  - `工作管理`
  - `班表管理`
  - `管理中心`
  - `设置`
- 浏览器验证确认旧入口 `客户 / 产品 / 方案 / 订单 / 档案` 已不再显示。
- 浏览器验证确认顶部搜索框占位文案已改为 `搜索周报、班表、成员或管理入口`。

## 备注

- 本次为定向同步，不包含其他本地未确认改动。
