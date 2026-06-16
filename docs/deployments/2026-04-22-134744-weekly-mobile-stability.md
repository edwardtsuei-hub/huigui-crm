# 2026-04-22 13:47:44 周报页手机端与顶栏稳定性定向同步

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：定向手动同步（周报页手机端收口 + 顶栏稳定性修正）
- 同步文件：
  - `apps/web/app/(dashboard)/DashboardLayoutClient.tsx`
  - `apps/web/components/system/shell.tsx`
  - `apps/web/app/(dashboard)/work-management/weekly-reports/page.tsx`
  - `apps/web/app/globals.css`
- 远端重建：`app`
- 远端 nginx：已重启
- 回滚备份：`/opt/huigui-backups/huigui-crm-weekly-mobile-stability-20260422-134744.tar.gz`

## 本次变更

- 收掉周报页手机端本地出现的 `Internal server error` 相关交付阻塞，先在本地完成缺失 migration 修复，再同步前端页面收口版本到正式机。
- 周报页手机端改成更接近 app 的结构：
  - 压缩重复页头
  - 顶部操作按钮改为更易点按的双栏布局
  - 首次引导改为横向滑动短卡
  - 公开版汇总与历史归档动作在手机端改为整齐分栏
- 手机顶部栏滚动收合逻辑改为带阈值的稳定版本，避免轻微滚动时来回跳动。
- 手机模式下页面副标题改为平滑收起，不再因为 DOM 出现 / 消失造成顶栏高度抖动。

## 远端执行

```bash
rsync -az --relative \
  apps/web/app/(dashboard)/DashboardLayoutClient.tsx \
  apps/web/components/system/shell.tsx \
  apps/web/app/(dashboard)/work-management/weekly-reports/page.tsx \
  apps/web/app/globals.css \
  root@49.232.57.98:/opt/huigui-crm/

ssh root@49.232.57.98 "cd /opt/huigui-crm && docker compose build app && docker compose up -d app nginx && docker compose restart nginx"
```

## 验证

- `https://management.hui-health.com/login` 返回 `200`
- 线上登录页仍可读到：
  - `大愛歸心管理平台`
  - `像光一樣照亮自己的生命`
  - `旗下公司`
- 生产登录 API `https://management.hui-health.com/api/auth/login` 返回正常 token
- `https://management.hui-health.com/api/work-management/weekly-reports` 返回 `200`

## 测试入口

- 登录页：`https://management.hui-health.com/login`
- 登录后测试页：`https://management.hui-health.com/work-management/weekly-reports`
