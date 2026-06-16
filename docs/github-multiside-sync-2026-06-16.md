# 大爱归心 GitHub 多端同步规则

日期：2026-06-16
仓库：https://github.com/edwardtsuei-hub/huigui-crm
服务器项目目录：`/opt/huigui-crm`

## 目标

两台本地电脑通过 GitHub 同步代码，服务器只作为部署目标。

不要把服务器当作日常编辑中心。服务器上的直接修改必须先整理成 Git 分支，再让两台电脑从 GitHub 拉取。

## 当前基线

本分支：

```bash
server-baseline-2026-06-16
```

用途：

- 保存 2026-06-16 从服务器 `/opt/huigui-crm` 下载并整理后的可协作代码基线。
- 排除 `.env`、`.env.bak*`、`.env.backup*`、`node_modules`、`storage`、`backups`、`output`、`.codex-*`、`._*`、`*.bak-*`。
- 作为两台电脑同步前的共同起点。

## 每台电脑第一次设置

如果电脑已安装 GitHub CLI：

```bash
gh auth login
gh auth setup-git
git clone https://github.com/edwardtsuei-hub/huigui-crm.git
cd huigui-crm
git fetch origin --prune
git switch -c local-work origin/server-baseline-2026-06-16
```

如果电脑使用 SSH key：

```bash
git clone git@github.com:edwardtsuei-hub/huigui-crm.git
cd huigui-crm
git fetch origin --prune
git switch -c local-work origin/server-baseline-2026-06-16
```

## 每天开始工作前

```bash
git fetch origin --prune
git status
git pull --rebase
```

如果本地有未提交改动，先提交或暂存，不要直接拉取覆盖。

## 每个任务开自己的分支

分支命名建议：

```text
feat/<功能名>
fix/<问题名>
docs/<文档名>
sync/<同步整理名>
```

示例：

```bash
git switch -c feat/employee-db-first
```

## 提交并同步给另一台电脑

```bash
git status
git add <本次任务相关文件>
git commit -m "feat: describe the change"
git push -u origin <当前分支名>
```

另一台电脑接手：

```bash
git fetch origin --prune
git switch <分支名>
git pull --rebase
```

## 合并到主线

先在 GitHub 开 Pull Request，确认：

- 没有 `.env` 或密钥文件。
- 没有 `node_modules`、`storage`、`backups`、`output`。
- 没有 macOS `._*` 文件。
- 本地构建或关键检查通过。
- 影响服务器的数据迁移已经写清楚回滚方式。

通过后合并到 `main`。

## 发布到服务器

只有合并后的稳定分支才能发布到服务器。

推荐流程：

```bash
git switch main
git pull --rebase origin main
bash ./scripts/ops/deploy-local-to-production.sh --dry-run --skip-local-build
bash ./scripts/ops/deploy-local-to-production.sh --note "说明本次发布内容"
```

发布脚本会备份服务器、同步代码、构建服务、执行数据库迁移、重启容器并写部署记录。

## 禁止事项

- 不要两台电脑同时直接同步到服务器。
- 不要在服务器上改完代码却不提交到 GitHub。
- 不要把 `.env` 或任何密钥备份文件推到 GitHub。
- 不要用 `git reset --hard` 清掉别人未确认的工作。
- 不要把运行数据目录 `storage` 当作代码提交。

## 冲突处理

如果两台电脑改了同一个文件，先停下来：

```bash
git status
git diff
```

确认冲突内容后再合并。业务文件冲突优先找对应负责人确认；部署脚本、Prisma schema、数据库迁移文件必须格外小心。

## 推荐分工方式

每个 Codex 对话框或每台电脑都只负责一个小范围：

- API：只改 `apps/api`、`prisma`、相关测试和文档。
- 前端：只改 `apps/web`、相关样式和页面文档。
- 数据迁移：只改 `prisma/migrations`、`scripts/migrations`、迁移文档。
- 发布控制：只改 `deploy`、`scripts/ops`、`docs/deployments`。

跨范围改动需要先在任务说明里写清楚。
