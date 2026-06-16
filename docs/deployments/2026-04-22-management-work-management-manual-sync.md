# 2026-04-22 管理平台与工作管理手动同步补录

## 说明

- 这是一条补录记录，用来回填 2026-04-22 已经手动同步到正式机的范围。
- 当时未通过 `scripts/ops/deploy-local-to-production.sh` 生成正式部署文档，因此这里不保留精确时分秒。
- 这条补录目前只存在本地仓库，还没有再次同步回服务器。

## 目标环境

- 服务器：`root@49.232.57.98`
- 目录：`/opt/huigui-crm`
- 域名：`management.hui-health.com`

## 已同步范围

- `management.hui-health.com` 登录页切换为大爱归心管理平台品牌文案与视觉版本
- 周报流转补全为 `草稿 -> 待主管审阅 -> 已退回 / 已通过`
- 月底汇总改为优先使用已提交且未退回的周报
- 班表系统正式接入 management 导航与云端保存
- `management.hui-health.com` 与 `crm.hui-health.com` 的 nginx / app / api 线上可用性修复

## 当时执行过的线上动作

- 定向 rsync 本地改动到正式机
- `docker compose build api app`
- `docker compose run --rm api npx prisma migrate deploy`
- `docker compose run --rm api npx tsx prisma/seed/seed.ts`
- `docker compose up -d api app nginx`
- 额外执行 `docker compose restart nginx` 解决 app 重建后的 upstream 502

## 线上核对

- `management.hui-health.com/login` 返回 `200`
- 管理平台 SSR 文案已显示 `大愛歸心管理平台`
- 权限 `action.work_management.review` 已存在并赋给 `SALES_MANAGER`
- `/api/work-management/weekly-reports` 与 `/api/settings/shift-roster` 线上接口返回正常

## 与当前本地状态的关系

- 这条补录作为当前“最后已知服务端基线”使用。
- 从这条补录之后产生的本地修改，一律先保留在本地，等你确认后再同步到服务器。
