# 生产部署记录

用于记录每一次实际发布到服务器的时间、范围、验证结果和回滚线索，避免未来只记得“好像改过”，却忘了到底改了什么、怎么上的线。

## 2026-04-16

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署范围：
  - 管理中心总览、成员管理、角色权限、审批规则、操作日志
  - 左侧导航新增“管理中心 / 日程 / 档案 / 方案”结构整理
  - 顶部工具区调整为全域搜索、页面新增按钮、通知铃铛、账号菜单
  - 首页按角色展示差异化工作台
  - 报价列表与详情页补充审批状态、审批动作、导出限制
  - 后端同步补齐 RBAC、数据范围、审批规则、审计日志与相关 API
  - Prisma 新增管理中心所需 schema、seed 与 migration
- 发布后验证：
  - 容器重建并启动成功
  - `https://crm.hui-health.com/login` 正常
  - `https://crm.hui-health.com/api/health` 正常
  - 管理员登录后 `https://crm.hui-health.com/api/management/overview` 返回正常数据
  - 服务器已执行 `npm run db:seed`
- 回滚线索：
  - 服务器源代码备份位于 `/opt/huigui-backups/huigui-crm-ui-sync-20260416-103627.tar.gz`
  - 后续发布脚本会继续按时间戳生成 `huigui-crm-ui-sync-*.tar.gz`
- 对应详细记录：
  - [2026-04-16 生产同步记录](./deployments/2026-04-16-production-sync.md)
