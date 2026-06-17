# 数据库 100 分全局 precheck 校验器

日期：2026-06-17
状态：`verifier_ready`

## 目标

新增一个本地校验器：

`scripts/migrations/employee-data/database-100-global-precheck-verify.mjs`

它不连接数据库、不读取密钥、不执行 SQL，只解析 `database-100-global-precheck.sql` 的 TSV 输出，自动判断硬门禁是否通过。

## 安全边界

- 不写数据库。
- 不执行 SQL。
- 不生成生产 SQL。
- 不改 schema、migration、API、前端。
- 不部署、不重启、不打 rollback tag。

## 使用方式

先只读执行全局 precheck：

```bash
ssh root@49.232.57.98 "docker exec -i huigui-mysql sh -lc 'mysql --default-character-set=utf8mb4 -uroot -p\"\$MYSQL_ROOT_PASSWORD\" \"\$MYSQL_DATABASE\" -N -B'" \
  < output/employee-data-migration/2026-06-16/database-100-global-precheck.sql \
  > output/employee-data-migration/2026-06-16/database-100-global-precheck.tsv
```

再校验：

```bash
node scripts/migrations/employee-data/database-100-global-precheck-verify.mjs \
  --input output/employee-data-migration/2026-06-16/database-100-global-precheck.tsv \
  --out output/employee-data-migration/2026-06-16/database-100-global-precheck-verify-result.json \
  --markdown-out output/employee-data-migration/2026-06-16/database-100-global-precheck-verify-result.md
```

## 判定规则

- `expectedValue = NULL`：观察项，不阻断。
- `expectedValue != NULL`：硬门禁，必须与 `actualValue` 完全一致。
- 若出现硬门禁 mismatch、重复 checkName、格式错误行，校验器退出码为 2。

## 本轮验证结果

已用当前生产只读输出验证：

- status：`passed`
- totalRows：38
- hardGates：29
- observations：9
- mismatches：0
- malformedRows：0
- duplicateCheckNames：0

这表示当前全局门禁可以作为后续 ROLLBACK 事务试跑前的机器校验步骤。
