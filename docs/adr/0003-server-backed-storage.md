# 数据存到服务器 MySQL，Dexie 退成构建期开关

数据从浏览器搬到服务器的 MySQL。前端只通过 `/api` 读写，`src/data/ports.ts` 的仓储端口是唯一切换点，`domain` 一行不动。

## 为什么要有后端

浏览器连不上 MySQL。它只能发 HTTP 和 WebSocket，开不了裸 TCP 连接，而 MySQL 说的是二进制 TCP 协议；JS 里能用的 MySQL 客户端依赖 Node 的 `net` 和 `tls`，打包进浏览器跑不起来。要让浏览器直连，就得把数据库暴露到公网并把密码写进前端产物。

中间那个进程选择自己写，而不是换成 Postgres 用 PostgREST，因为服务器上的 MySQL 容器已经建好，而且只有两处需要真事务。

## 分层

服务端负责字段映射、两个事务和请求校验，前端 HTTP 仓储只透传。`eslint.config.js` 把 `@/data/http` 也加进了 `app`、`ui`、`backup` 的禁用列表，界面层仍然只能通过仓储端口访问数据。

这修订了实施规格里「不创建多套可切换数据库适配器」的字面表述。原约束要防的是同一份数据同时写两边然后分叉，那个仍然禁止。`src/data/dexie/` 保留下来当构建期开关的另一端：`VITE_DATA_BACKEND=dexie` 时走 IndexedDB，默认走 HTTP。两个产物各自只有一个真相源，没有双写。Dexie 那一端现在只服务于离线构建和 Playwright 回归，后者依赖「每个 browser context 的 IndexedDB 天然是空的」这个前提。

## 删除是「历史永不改写」的有意例外

快照仍然只追加，服务端不注册 UPDATE 路由。但用户要能删掉自己存错的一条，所以 `snapshots` 有 `DELETE /api/snapshots/:id`，删猫时它的快照也随外键一起走。删除是硬删除，没有回收站，界面上二次确认。

这条改动让 `src/backup/format.ts` 里两条校验失效了。删掉一条体重之后，快照里冻结的 `weightInputCopy.sourceWeightId` 会悬空，而原来「引用的体重记录不存在」是硬错误。悬空引用不影响快照渲染，因为里面存的是副本，所以那两条检查被移除，否则用户自己导出的备份会导不回来。

## 多猫只铺数据模型，不做界面

`cats` 端口从 `getSingle()` 换成 `list()`、`get()`、`delete()`，不再假设只有一只猫。界面仍然只用建档最早的那只，没有切换器。表结构本来就是多猫就绪的，`weights`、`drafts`、`snapshots` 都有 `cat_id` 外键。多猫界面做好后，改 `cat-data-context` 里取第一只的那行就行。

这取代了 [一期单猫界面与稳定关联](0001-single-cat-stable-associations.md) 里「不加入猫咪切换」的部分，那条 ADR 关于「用稳定 ID 保留关联」的判断继续有效。
