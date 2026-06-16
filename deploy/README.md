# 腾讯云 CVM 部署手册

本文档对应当前 monorepo 结构：

- 前端：`apps/web`，Next.js 14
- 后端：`apps/api`，NestJS 11
- ORM：Prisma
- 数据库：MySQL / 腾讯云 TDSQL-C MySQL
- 文件：腾讯云 COS
- 进程：PM2
- 反向代理：Nginx

## 1. 服务器准备

推荐配置：

- CVM：Ubuntu 22.04 LTS，4 核 8G
- 数据库：TDSQL-C MySQL 8.0
- COS：私有读写 Bucket
- 域名：`crm.hui-health.com`

初始化命令：

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip vim build-essential nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 2. 部署目录

```bash
sudo mkdir -p /srv/huigui/current
sudo mkdir -p /srv/huigui/logs
sudo chown -R $USER:$USER /srv/huigui
```

克隆项目：

```bash
cd /srv/huigui/current
git clone <你的仓库地址> .
```

## 3. 安装依赖

```bash
cd /srv/huigui/current
npm install
```

## 4. 环境变量

后端：

```bash
cp apps/api/.env.example apps/api/.env
vim apps/api/.env
```

前端：

```bash
cp apps/web/.env.example apps/web/.env
vim apps/web/.env
```

如果你希望本地开发和服务器共用一份变量，也可以维护根目录 `.env` 作为补充。

## 5. Prisma 初始化

```bash
cd /srv/huigui/current
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

## 6. 构建

```bash
cd /srv/huigui/current
npm run build
```

## 7. PM2 启动

推荐使用仓库内的 PM2 配置：

```bash
cd /srv/huigui/current
pm2 start deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

如果你更喜欢命令式启动，可以直接执行：

```bash
cd /srv/huigui/current
PORT=3001 pm2 start "npm run start -w @huigui/api" --name huigui-api
PORT=3000 HOSTNAME=0.0.0.0 pm2 start "npm run start -w @huigui/web" --name huigui-web
pm2 save
```

## 8. Nginx 配置

复制示例配置：

```bash
sudo cp deploy/nginx/huigui.conf /etc/nginx/sites-available/huigui
sudo ln -sf /etc/nginx/sites-available/huigui /etc/nginx/sites-enabled/huigui
sudo nginx -t
sudo systemctl reload nginx
```

确认 `server_name`、证书路径和 DNS 解析都已指向 `crm.hui-health.com`。

## 9. 部署后检查

```bash
pm2 status
pm2 logs huigui-api
pm2 logs huigui-web
curl http://127.0.0.1:3001/api/health
```

浏览器检查：

- `https://crm.hui-health.com/login`
- `https://crm.hui-health.com/dashboard`

## 10. 第一阶段上线范围

- 客户管理
- 产品管理
- 农业方案报价
- 通用报价
- 报价记录与 PDF 导出

## 11. 企业微信与后续扩展

- COS 上传接口：`/api/files/upload-token`、`/api/files/callback`
- 企业微信登录、账号绑定、消息提醒、回调日志、日历同步、失败重试与管理端监控已完成代码接入。
- 企业微信生产配置、验收与排错步骤见 [`docs/wecom-integration-runbook.md`](../docs/wecom-integration-runbook.md)。

## 12. HTTPS 回归检查

证书续期、Nginx 重载或 Docker 重建后，可以直接运行仓库内的脚本做一轮入口回归：

```bash
cd /srv/huigui/current
CRM_DOMAIN=crm.hui-health.com ./scripts/ops/check-crm-https.sh
```

如果希望顺带校验登录接口，可临时传入管理员账号：

```bash
CRM_DOMAIN=crm.hui-health.com CRM_USERNAME=admin CRM_PASSWORD='Huigui@123' ./scripts/ops/check-crm-https.sh
```

脚本会默认校验企业微信公开配置接口 `/api/wecom/config` 是否可访问。企业微信环境变量全部填好后，可开启严格模式：

```bash
CRM_DOMAIN=crm.hui-health.com CRM_EXPECT_WECOM_ENABLED=true ./scripts/ops/check-crm-https.sh
```

如果 `management.hui-health.com` 的 DNS 已经指向正式机，并且正式机的 `deploy/nginx.conf` 已包含该域名，可以直接运行下面这条脚本完成证书扩展与双域名回归：

```bash
EXPECTED_IP=49.232.57.98 ./scripts/ops/enable-management-domain.sh
```

这条脚本会先验证公网 DNS，再临时停止 Docker Nginx，用 `certbot standalone` 把 `management.hui-health.com` 加进现有 `crm.hui-health.com` 证书，最后恢复 Nginx 并检查两个域名的 HTTPS 可用性。

如果是在正式机本机执行，把 `DEPLOY_HOST=local` 一起带上即可：

```bash
DEPLOY_HOST=local EXPECTED_IP=49.232.57.98 ./scripts/ops/enable-management-domain.sh
```

如果后续希望把 `crm.hui-health.com` 和 `management.hui-health.com` 的证书续期切到 DNSPod 自动加删 TXT，可以使用仓库内这组脚本：

```bash
cp ./scripts/ops/dnspod-certbot.env.example /root/.config/huigui/dnspod-certbot.env
vim /root/.config/huigui/dnspod-certbot.env
bash ./scripts/ops/configure-dnspod-certbot-renewal.sh
```

说明：

- `scripts/ops/certbot-dnspod-auth.sh` / `scripts/ops/certbot-dnspod-cleanup.sh` 会读取 `/root/.config/huigui/dnspod-certbot.env`
- 其中 `DNSPOD_ROOT_DOMAIN` 当前应设置为 `hui-health.com`
- `scripts/ops/configure-dnspod-certbot-renewal.sh` 会把 `/etc/letsencrypt/renewal/crm.hui-health.com.conf` 改成使用 DNSPod hook，并在续期后自动执行 `docker exec huigui-nginx nginx -s reload`
- 这一步不会主动签发新证书，只是把后续 `certbot renew` 的方式切成可自动续期

如果要立即把当前证书从“手动 TXT”切到“可自动续期”的签发方式，建议在凭据文件就绪后手动执行一次：

```bash
source /root/.config/huigui/dnspod-certbot.env
certbot certonly \
  --manual \
  --preferred-challenges dns \
  --manual-auth-hook /opt/huigui-crm/scripts/ops/certbot-dnspod-auth.sh \
  --manual-cleanup-hook /opt/huigui-crm/scripts/ops/certbot-dnspod-cleanup.sh \
  --deploy-hook /opt/huigui-crm/scripts/ops/huigui-nginx-certbot-deploy-hook.sh \
  --force-renewal \
  --expand \
  --cert-name crm.hui-health.com \
  -d crm.hui-health.com \
  -d management.hui-health.com
```

建议在执行这条命令前，先确认：

- 腾讯云子账号或主账号已经具备 DNSPod 记录新增 / 查询 / 删除权限
- `management.hui-health.com` 和 `crm.hui-health.com` 仍由 `hui-health.com` 这组 DNSPod 解析托管
- 生产机上可以直接访问 `dnspod.tencentcloudapi.com`

## 13. 本地工作区直推生产

如果当前修改还没有整理成 Git 提交，但需要把“本地当前状态”完整同步到生产服务器，优先使用：

```bash
bash ./scripts/ops/deploy-local-to-production.sh
```

这条脚本会自动执行：

- 备份服务器当前源代码到 `/opt/huigui-backups/`
- 备份本地当前源代码到 `./backups/`
- 用 `rsync` 将本地工作区同步到 `/opt/huigui-crm`
- 启动远端 `mysql` 容器并等待健康检查（可跳过）
- 重建 `api / app` 镜像
- 执行 `npx prisma migrate deploy`
- 按需执行 `npm run db:seed`
- 重启 `api / app / nginx`
- 等待 API 健康检查恢复
- 运行 HTTPS 回归脚本
- 自动写入 `docs/deployment-log.md` 和 `docs/deployments/`

常用参数：

```bash
bash ./scripts/ops/deploy-local-to-production.sh --dry-run --skip-local-build
bash ./scripts/ops/deploy-local-to-production.sh --note "管理中心与审批流上线"
bash ./scripts/ops/deploy-local-to-production.sh --skip-seed --skip-mysql
bash ./scripts/ops/deploy-local-to-production.sh --skip-local-backup
```

说明：

- `--dry-run` 只做远端连通性检查和 `rsync` 预演，不会改动服务器
- `--skip-local-build` 适合你已经手动跑过本地构建时使用
- `--skip-mysql` 用于生产数据库不走本机容器的场景
- `--skip-seed` 用于本次明确不需要刷新系统初始化数据的场景
- `--skip-local-backup` 用于你明确不需要额外保留本地源码压缩包的场景
- `--note` 会进入本地部署记录，建议每次都写清本次上线范围
