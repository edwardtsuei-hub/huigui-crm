# 2026-04-22 10:23:43 部門週報公開版同步記錄

## 概覽

- 部署標籤：`production-sync-20260422-102343-weekly-public-digest`
- 環境：`management.hui-health.com`
- 目標服務器：`root@49.232.57.98`
- 目標目錄：`/opt/huigui-crm`
- 部署方式：定向手動同步後重建 `api / app`

## 本次上線範圍

- 週報公開版改為「按部門、按週期」生成，不再混整家公司
- 公開版週報支持：
  - 自動生成稿
  - 主編編輯後保存公開版
  - 一鍵複製文字
  - 查看本次納入的部門周報來源清單
- 本地同步台帳與狀態檢查工具補上，之後可用 `npm run deploy:status` 查本地與正式機差異

## 本次同步的主要檔案

- `prisma/schema.prisma`
- `prisma/migrations/20260422163000_weekly_public_digest/migration.sql`
- `apps/api/src/work-management/dto/work-management.dto.ts`
- `apps/api/src/work-management/work-management.controller.ts`
- `apps/api/src/work-management/work-management.service.ts`
- `apps/web/lib/work-management.ts`
- `apps/web/app/(dashboard)/work-management/weekly-reports/page.tsx`

## 線上執行

```bash
docker compose build api app
docker compose run --rm api npx prisma migrate deploy
docker compose up -d api app nginx
docker compose restart nginx
```

## 線上結果

- `20260422163000_weekly_public_digest` migration 已成功套用
- `api / app / nginx` 已正常啟動
- `https://management.hui-health.com/login` 返回 `200`
- `https://management.hui-health.com/work-management/weekly-reports` 返回 `200`
- 線上登入頁仍可讀到：
  - `大愛歸心管理平台`
  - `像光一樣照亮自己的生命，服務全部的生命`

## 回滾線索

- 服務器備份：`/opt/huigui-backups/huigui-crm-weekly-public-digest-sync-20260422-102343.tar.gz`

## 測試入口

- 登入頁：`https://management.hui-health.com/login`
- 登入後測試頁：`https://management.hui-health.com/work-management/weekly-reports`
