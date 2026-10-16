# catFan 后端

Fastify + mysql2，把 `src/data/ports.ts` 的六个仓储端口映射成 REST 路由。服务端负责字段映射、两个事务和请求校验，前端 HTTP 仓储只透传。

## 跑起来

```bash
cp .env.example .env                # 填 MySQL 连接信息
pnpm --filter catfan-server dev     # tsx watch，监听 127.0.0.1:3000
pnpm --filter catfan-server build   # 编译到 dist/
```

本地连服务器上的 MySQL，先开隧道并保持开着：

```bash
ssh -N -L 3307:127.0.0.1:3307 -o ServerAliveInterval=30 root@117.72.221.110
```

凭据从服务器取：

```bash
ssh root@117.72.221.110 "cat /etc/catfan/catfan.env" > server/.env
```

在 Git Bash 或 cmd 里跑。PowerShell 的 `>` 默认写 UTF-16LE，Node 读不了；已经写成 UTF-16LE 的话用 `node -e "const f=require('fs');f.writeFileSync('server/.env',f.readFileSync('server/.env').toString('utf16le').replace(/^﻿/,''),'utf8')"` 转一下。

`dev` 和 `start` 用 `--env-file-if-exists=.env` 加载，文件不在也不报错。服务器上由 systemd 的 `EnvironmentFile` 注入，不读这个文件。

本地调试写进去的就是服务器上的真实数据。

## 建表

```bash
mysql -h 127.0.0.1 -P 3307 -u catfan_app -p catfan < schema.sql
```

## 路由

| 端口方法 | 路由 |
| --- | --- |
| `cats.list` / `get` | `GET /api/cats` / `GET /api/cats/:id` |
| `cats.createWithFirstWeight` | `POST /api/cats`（事务） |
| `cats.update` / `delete` | `PUT /api/cats/:id` / `DELETE /api/cats/:id`（事务，连带体重、草稿、快照） |
| `weights.listByCat` | `GET /api/cats/:catId/weights` |
| `weights.add` / `update` / `delete` | `POST /api/weights` / `PUT /api/weights/:id` / `DELETE /api/weights/:id` |
| `foods.list` / `get` / `save` | `GET /api/foods` / `GET /api/foods/:id` / `PUT /api/foods/:id` |
| `drafts.load` / `save` | `GET /api/cats/:catId/draft` / `PUT /api/cats/:catId/draft` |
| `snapshots.listByCat` / `get` / `add` / `delete` | `GET /api/cats/:catId/snapshots` / `GET /api/snapshots/:id` / `POST /api/snapshots` / `DELETE /api/snapshots/:id` |
| `backup.replaceAll` | `POST /api/backup`（事务） |

辅助接口：`GET /api/health`、`GET /api/backup/counts`。

## 约定

查不到一律返回 200 加 body `null`，不用 404 也不用 204。客户端据此区分「没有」和「读失败」，所以响应都带 `Cache-Control: no-store`。

`snapshots` 没有 UPDATE 路由，DELETE 只有删单条那一个入口。

事务用 `pool.getConnection()` 拿独占连接，`finally` 里 release。

`drafts` 和 `snapshots` 的排序键是从 payload 算出来的生成列。

`payload` 用 LONGTEXT，不用 MySQL 的 JSON 类型。

空备份硬拒，重复 ID 的写入当成功。

`bodyLimit` 是 10MB。

## 部署

`deploy/` 里有 systemd 单元和 nginx 的 `/api/` 反代配置。

```bash
cd /srv/services/catFan
sudo -u ubuntu git pull
sudo -u ubuntu pnpm install --frozen-lockfile
sudo -u ubuntu pnpm build           # 前端
sudo -u ubuntu pnpm build:server    # 后端
sudo systemctl restart catfan-api
```

`pnpm-lock.yaml` 要和 `server/package.json` 一起提交，否则 `--frozen-lockfile` 会失败。服务器上 `github.com:443` 不通，`git pull` 走 SSH。

## 没有鉴权

能访问站点的人都能读写全部数据，`POST /api/backup` 可以清空整库。现在只绑回环。要补的话在 nginx 的 `location /api/` 加 Basic Auth，应用代码不用动。
