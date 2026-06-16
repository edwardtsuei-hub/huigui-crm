# 2026-04-22 18:43:32 班表原生工作台定向同步

- 环境：生产 `management.hui-health.com`
- 服务器：`root@49.232.57.98`
- 部署目录：`/opt/huigui-crm`
- 部署方式：定向手动同步（班表原生工作台重构）
- 同步文件：
  - `apps/web/app/(dashboard)/schedule/shifts/`
  - `apps/web/components/shift-roster/`
  - `apps/web/lib/shift-roster.ts`
  - `apps/web/package.json`
  - `package-lock.json`
- 远端重建：`app`
- 远端 nginx：已重启
- 回滚备份：`/opt/huigui-backups/huigui-crm-shift-native-surface-20260422-184332.tar.gz`

## 本次变更

- 班表页不再维持旧版被锁在长方容器里的嵌入感，改成直接在 management 工作台内原生渲染。
- 手机端班表从横向宽表切成当天卡片排班：
  - 顶部保留周切换与部门切换
  - 中段改成日期条 + 人员卡片
  - 每位成员可直接点按班次或打开详细编辑
- 保留桌面端整周矩阵视图，手机端则改为更接近 app 的交互结构。
- 班表云端保存、活动 / 备注 / 预约、人员管理、班次设置与 JPG 生成仍接在同一条数据流里。
- 同步 `html2canvas` 依赖到生产构建环境，确保班表图片导出可用。

## 远端执行

```bash
rsync -az --relative \
  apps/web/app/(dashboard)/schedule/shifts/ \
  apps/web/components/shift-roster/ \
  apps/web/lib/shift-roster.ts \
  apps/web/package.json \
  package-lock.json \
  root@49.232.57.98:/opt/huigui-crm/

ssh root@49.232.57.98 "cd /opt/huigui-crm && docker compose build app && docker compose up -d app nginx && docker compose restart nginx"
```

## 验证

- 远端 `docker compose build app` 成功，生产构建产物包含 `/schedule/shifts`
- `https://management.hui-health.com/login` 返回 `200`
- `https://management.hui-health.com/schedule/shifts` 返回 `200`
- 线上登录页仍可读到：
  - `大愛歸心管理平台`
  - `像光一樣照亮自己的生命`
  - `旗下公司`
- 生产登录 API `https://management.hui-health.com/api/auth/login` 返回正常 token
- 生产班表 API `https://management.hui-health.com/api/settings/shift-roster` 返回 `200`

## 测试入口

- 登录页：`https://management.hui-health.com/login`
- 登录后测试页：`https://management.hui-health.com/schedule/shifts`
