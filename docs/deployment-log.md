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

## 2026-04-16 11:04:33

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260416-110433`
- 本地构建：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260416-110433.tar.gz`
- 对应详细记录：
  - [2026-04-16 11:04:33 生产同步记录](./deployments/2026-04-16-110433-production-sync.md)

## 2026-04-16 11:30:18

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260416-113018`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260416-113018.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260416-113018.tar.gz`
- 对应详细记录：
  - [2026-04-16 11:30:18 生产同步记录](./deployments/2026-04-16-113018-production-sync.md)

## 2026-04-16 13:40:56

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260416-134056`
- 本地构建：否
- 本地源码备份：否
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是


- 对应详细记录：
  - [2026-04-16 13:40:56 生产同步记录](./deployments/2026-04-16-134056-production-sync.md)

## 2026-04-16 14:56:30

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260416-145630`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：否
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260416-145630.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260416-145630.tar.gz`
- 对应详细记录：
  - [2026-04-16 14:56:30 生产同步记录](./deployments/2026-04-16-145630-production-sync.md)

## 2026-04-16 15:10:05

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260416-151005`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：否
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260416-151005.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260416-151005.tar.gz`
- 对应详细记录：
  - [2026-04-16 15:10:05 生产同步记录](./deployments/2026-04-16-151005-production-sync.md)

## 2026-04-16 22:16:53

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260416-221653`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260416-221653.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260416-221653.tar.gz`
- 对应详细记录：
  - [2026-04-16 22:16:53 生产同步记录](./deployments/2026-04-16-221653-production-sync.md)

## 2026-04-16 22:51:00

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260416-225100`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260416-225100.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260416-225100.tar.gz`
- 对应详细记录：
  - [2026-04-16 22:51:00 生产同步记录](./deployments/2026-04-16-225100-production-sync.md)

## 2026-04-17 06:04:09

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-060409`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-060409.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-060409.tar.gz`
- 对应详细记录：
  - [2026-04-17 06:04:09 生产同步记录](./deployments/2026-04-17-060409-production-sync.md)

## 2026-04-17 06:30:29

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-063029`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-063029.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-063029.tar.gz`
- 对应详细记录：
  - [2026-04-17 06:30:29 生产同步记录](./deployments/2026-04-17-063029-production-sync.md)

## 2026-04-17 06:38:53

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-063853`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-063853.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-063853.tar.gz`
- 对应详细记录：
  - [2026-04-17 06:38:53 生产同步记录](./deployments/2026-04-17-063853-production-sync.md)

## 2026-04-17 07:06:33

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-070633`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-070633.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-070633.tar.gz`
- 对应详细记录：
  - [2026-04-17 07:06:33 生产同步记录](./deployments/2026-04-17-070633-production-sync.md)

## 2026-04-17 08:23:44

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-082344`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-082344.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-082344.tar.gz`
- 对应详细记录：
  - [2026-04-17 08:23:44 生产同步记录](./deployments/2026-04-17-082344-production-sync.md)

## 2026-04-17 08:36:02

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-083602`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-083602.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-083602.tar.gz`
- 对应详细记录：
  - [2026-04-17 08:36:02 生产同步记录](./deployments/2026-04-17-083602-production-sync.md)

## 2026-04-17 08:41:50

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：手动热修（同步 Dockerfile 后远端 `docker compose build api` / `up -d api` / `migrate deploy` / `db:seed`）
- 部署标签：`api-openssl-hotfix-20260417-084150`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是

## 2026-04-22 12:09:25

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：定向手动同步（management 手机端 app 式导航）
- 部署标签：`production-sync-20260422-120925-management-mobile-shell`
- 本地构建：是
- 远端重建：`app`
- 远端 nginx：已重启
- 回滚备份：`/opt/huigui-backups/huigui-crm-management-mobile-shell-20260422-120926.tar.gz`
- 对应详细记录：
  - [2026-04-22 12:09:25 management 手机端导航壳层定向同步](./deployments/2026-04-22-120925-management-mobile-shell.md)
- 执行 HTTPS / 健康检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-084150.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-084150.tar.gz`
- 对应详细记录：
  - [2026-04-17 08:41:50 API OpenSSL 热修记录](./deployments/2026-04-17-084150-api-openssl-hotfix.md)

## 2026-04-17 11:36:26

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-113626`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-113626.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-113626.tar.gz`
- 对应详细记录：
  - [2026-04-17 11:36:26 生产同步记录](./deployments/2026-04-17-113626-production-sync.md)

## 2026-04-17 14:07:34

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-140734`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-140734.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-140734.tar.gz`
- 对应详细记录：
  - [2026-04-17 14:07:34 生产同步记录](./deployments/2026-04-17-140734-production-sync.md)

## 2026-04-17 16:30:18

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-163018`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-163018.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-163018.tar.gz`
- 对应详细记录：
  - [2026-04-17 16:30:18 生产同步记录](./deployments/2026-04-17-163018-production-sync.md)

## 2026-04-17 19:47:58

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-194758`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-194758.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-194758.tar.gz`
- 对应详细记录：
  - [2026-04-17 19:47:58 生产同步记录](./deployments/2026-04-17-194758-production-sync.md)

## 2026-04-17 22:39:00

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-223900`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-223900.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-223900.tar.gz`
- 对应详细记录：
  - [2026-04-17 22:39:00 生产同步记录](./deployments/2026-04-17-223900-production-sync.md)

## 2026-04-17 22:54:05

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260417-225405`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260417-225405.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260417-225405.tar.gz`
- 对应详细记录：
  - [2026-04-17 22:54:05 生产同步记录](./deployments/2026-04-17-225405-production-sync.md)

## 2026-04-18 07:08:33

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260418-070833`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260418-070833.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260418-070833.tar.gz`
- 对应详细记录：
  - [2026-04-18 07:08:33 生产同步记录](./deployments/2026-04-18-070833-production-sync.md)

## 2026-04-19 20:07:28

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260419-200728`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260419-200728.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260419-200728.tar.gz`
- 对应详细记录：
  - [2026-04-19 20:07:28 生产同步记录](./deployments/2026-04-19-200728-production-sync.md)

## 2026-04-22 手动同步（补录）

- 环境：生产 `management.hui-health.com` / `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：手动热同步（补录）
- 范围：管理平台品牌切换、周报审阅流转、月底汇总来源调整、班表系统接入 management
- 备注：这是补录记录，原始同步未通过正式发版脚本生成部署文档
- 对应详细记录：
  - [2026-04-22 管理平台与工作管理手动同步补录](./deployments/2026-04-22-management-work-management-manual-sync.md)

## 2026-04-22 10:23:43

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：定向手动同步（部門週報公開版）
- 执行 migrate：是
- 执行 seed：否
- 远端重建：`api / app`
- 远端 nginx：已重启
- 回滚备份：`/opt/huigui-backups/huigui-crm-weekly-public-digest-sync-20260422-102343.tar.gz`
- 对应详细记录：
  - [2026-04-22 10:23:43 部門週報公開版同步記錄](./deployments/2026-04-22-102343-weekly-public-digest-sync.md)

## 2026-04-22 10:56:18

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：定向手动同步（management 导航收口）
- 远端重建：`app`
- 远端 nginx：已重启
- 回滚备份：`/opt/huigui-backups/huigui-crm-management-navigation-cleanup-20260422-105618.tar.gz`
- 对应详细记录：
  - [2026-04-22 10:56:18 management 导航收口定向同步](./deployments/2026-04-22-105618-management-navigation-cleanup.md)

## 2026-04-22 13:47:44

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：定向手动同步（周报页手机端收口 + 顶栏稳定性修正）
- 远端重建：`app`
- 远端 nginx：已重启
- 回滚备份：`/opt/huigui-backups/huigui-crm-weekly-mobile-stability-20260422-134744.tar.gz`
- 对应详细记录：
  - [2026-04-22 13:47:44 周报页手机端与顶栏稳定性定向同步](./deployments/2026-04-22-134744-weekly-mobile-stability.md)

## 2026-04-22 18:43:32

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：定向手动同步（班表原生工作台重构）
- 远端重建：`app`
- 远端 nginx：已重启
- 回滚备份：`/opt/huigui-backups/huigui-crm-shift-native-surface-20260422-184332.tar.gz`
- 对应详细记录：
  - [2026-04-22 18:43:32 班表原生工作台定向同步](./deployments/2026-04-22-184332-shift-native-surface-sync.md)

## 2026-05-11 20:13:44

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-201344`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-201344.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-201344.tar.gz`
- 对应详细记录：
  - [2026-05-11 20:13:44 生产同步记录](./deployments/2026-05-11-201344-production-sync.md)

## 2026-05-11 20:30:49

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-203049`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-203049.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-203049.tar.gz`
- 对应详细记录：
  - [2026-05-11 20:30:49 生产同步记录](./deployments/2026-05-11-203049-production-sync.md)

## 2026-05-11 20:33:14

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-203314`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-203314.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-203314.tar.gz`
- 对应详细记录：
  - [2026-05-11 20:33:14 生产同步记录](./deployments/2026-05-11-203314-production-sync.md)

## 2026-05-11 20:39:13

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-203913`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-203913.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-203913.tar.gz`
- 对应详细记录：
  - [2026-05-11 20:39:13 生产同步记录](./deployments/2026-05-11-203913-production-sync.md)

## 2026-05-11 21:04:05

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-210405`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-210405.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-210405.tar.gz`
- 对应详细记录：
  - [2026-05-11 21:04:05 生产同步记录](./deployments/2026-05-11-210405-production-sync.md)

## 2026-05-11 21:21:53

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-212153`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-212153.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-212153.tar.gz`
- 对应详细记录：
  - [2026-05-11 21:21:53 生产同步记录](./deployments/2026-05-11-212153-production-sync.md)

## 2026-05-11 21:34:04

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-213404`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-213404.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-213404.tar.gz`
- 对应详细记录：
  - [2026-05-11 21:34:04 生产同步记录](./deployments/2026-05-11-213404-production-sync.md)

## 2026-05-11 21:40:01

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-214001`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-214001.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-214001.tar.gz`
- 对应详细记录：
  - [2026-05-11 21:40:01 生产同步记录](./deployments/2026-05-11-214001-production-sync.md)

## 2026-05-11 21:54:26

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-215426`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-215426.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-215426.tar.gz`
- 对应详细记录：
  - [2026-05-11 21:54:26 生产同步记录](./deployments/2026-05-11-215426-production-sync.md)

## 2026-05-11 21:59:01

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-215901`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-215901.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-215901.tar.gz`
- 对应详细记录：
  - [2026-05-11 21:59:01 生产同步记录](./deployments/2026-05-11-215901-production-sync.md)

## 2026-05-11 22:39:21

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-223921`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-223921.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-223921.tar.gz`
- 对应详细记录：
  - [2026-05-11 22:39:21 生产同步记录](./deployments/2026-05-11-223921-production-sync.md)

## 2026-05-11 23:03:19

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260511-230319`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260511-230319.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260511-230319.tar.gz`
- 对应详细记录：
  - [2026-05-11 23:03:19 生产同步记录](./deployments/2026-05-11-230319-production-sync.md)

## 2026-05-12 00:13:02

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260512-001302`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260512-001302.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260512-001302.tar.gz`
- 对应详细记录：
  - [2026-05-12 00:13:02 生产同步记录](./deployments/2026-05-12-001302-production-sync.md)

## 2026-05-12 00:24:41

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`wecom-callback-20260512-002441`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-wecom-callback-20260512-002441.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-wecom-callback-20260512-002441.tar.gz`
- 对应详细记录：
  - [2026-05-12 00:24:41 生产同步记录](./deployments/2026-05-12-002441-production-sync.md)

## 2026-05-12 00:35:56

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260512-003556`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260512-003556.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260512-003556.tar.gz`
- 对应详细记录：
  - [2026-05-12 00:35:56 生产同步记录](./deployments/2026-05-12-003556-production-sync.md)

## 2026-05-12 05:32:16

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`wecom-dynamic-origin-20260512-053216`
- 本地构建：否
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-wecom-dynamic-origin-20260512-053216.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-wecom-dynamic-origin-20260512-053216.tar.gz`
- 对应详细记录：
  - [2026-05-12 05:32:16 生产同步记录](./deployments/2026-05-12-053216-production-sync.md)

## 2026-05-12 06:05:31

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260512-060531`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260512-060531.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260512-060531.tar.gz`
- 对应详细记录：
  - [2026-05-12 06:05:31 生产同步记录](./deployments/2026-05-12-060531-production-sync.md)

## 2026-05-12 20:40:18

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`production-sync-20260512-204018`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：是
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/Huigui CRM & Quotation System/backups/huigui-crm-production-sync-20260512-204018.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-production-sync-20260512-204018.tar.gz`
- 对应详细记录：
  - [2026-05-12 20:40:18 生产同步记录](./deployments/2026-05-12-204018-production-sync.md)

## 2026-06-18 09:58:21

- 环境：生产 `crm.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：`scripts/ops/deploy-local-to-production.sh`
- 部署标签：`payroll-wecom-test-send-20260618`
- 本地构建：是
- 本地源码备份：是
- 执行 migrate：是
- 执行 seed：否
- 执行 HTTPS 回归检查：是
- 本地备份：`/Users/i-datsuei/Desktop/大爱归心系统/backups/huigui-crm-payroll-wecom-test-send-20260618.tar.gz`
- 回滚备份：`/opt/huigui-backups/huigui-crm-payroll-wecom-test-send-20260618.tar.gz`
- 对应详细记录：
  - [2026-06-18 09:58:21 生产同步记录](./deployments/2026-06-18-095821-production-sync.md)
