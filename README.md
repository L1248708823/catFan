# catFan

根据猫咪资料算出每日热量参考区间，再换算成你自己那款食品的克数或包装数量，并记录体重和历史计算。数据存在服务器上的 MySQL，换设备、清缓存都不丢。同一份代码可以构建成离线版，数据退回浏览器 IndexedDB。

产品范围见 [PRD](cat-feeding-calculator-prd.md)，实施细节见 [实施规格](docs/spec-cat-feeding-calculator.md)，术语见 [领域词汇](GLOSSARY.md)。

## 跑起来

前端：

```bash
pnpm install
pnpm dev          # 开发服务器 :5173，/api 转发到本地后端
pnpm typecheck    # 类型检查
pnpm lint         # 代码规范与分层边界
pnpm build        # 生产构建（联网版，数据走 /api）
pnpm build:offline # 离线构建（数据走 IndexedDB）
pnpm preview      # 预览生产构建
pnpm e2e          # 端到端测试（需要先 pnpm build:offline）
```

后端：

```bash
cp server/.env.example server/.env   # 填上 MySQL 连接信息
pnpm dev:server                      # tsx watch，监听 127.0.0.1:3000
pnpm build:server                    # 编译到 server/dist
```

本地连的是服务器上的 MySQL，需要先开一条隧道并保持开着：

```bash
ssh -N -L 3307:127.0.0.1:3307 -o ServerAliveInterval=30 root@117.72.221.110
```

建表用 `server/schema.sql`，部署细节见 [server/README.md](server/README.md)。注意本地调试写进去的就是服务器上的真实数据。

端到端测试用 Playwright，覆盖 PC 1440px 与 H5 412px 两个视口，产出的截图在 `e2e-artifacts/`。它跑的是离线构建，因为每个测试新建 browser context 时 IndexedDB 天然是空的，换成共享 MySQL 会互相污染。

## 已经做完的部分

- 猫咪档案与体重记录，建档时同时写入第一条体重。
- FEDIAF 2025 与 AAHA 2021 两个模型独立计算，各自展示区间与完整计算过程。
- 食品库，支持 kcal/kg、kcal/100g、kcal/包装单位与对应 kJ 单位。
- 四个食品位驱动的四种换算视图：单纯干粮、单纯湿粮、干湿混合、餐包加干粮。四个位选齐时四种视图同时出现。
- 混合计算从区间两端分别扣除辅助食品热量，含恰好进入区间与超过上限的边界状态。
- 计算快照，保存后不再被后续修改改写。只有用户主动删除才会消失。
- 草稿恢复，重新打开时继续上次的模型、食品与数量。
- 删除猫咪（连带它的体重、草稿和快照）、删除单条体重记录、删除单条快照。
- PWA 安装、应用资源离线缓存和新版本更新提示。

## 数据存在哪

`pnpm build` 把数据写在服务器的 MySQL 里，前端只通过 `/api` 读写。`pnpm build:offline` 构建出来的产物走浏览器 IndexedDB。切换点是 `src/data/index.ts`，`domain` 一行不动。

离线能力只在离线构建里有。联网版断网就打不开，PWA 缓存的是应用资源，不是业务数据。

## 安装与离线使用

生产构建已包含安装清单、桌面和手机图标，以及 Service Worker。在「数据管理 → 安装到设备」中可以找到安装入口。Chrome / Edge 支持安装时会显示「安装 catFan」按钮，也可以从浏览器菜单安装。iPhone / iPad 使用 Safari 的「分享 → 添加到主屏幕」。安装后从桌面或主屏幕打开，应用使用独立窗口。

发现新版本后，页面会提示更新。先保存当前输入，再点击「更新并重新打开」；更新可能重新加载其他已打开的 catFan 页面。选择「稍后」可以继续使用当前版本，重新打开时会再次提示仍在等待的更新。

部署时将完整的 `dist/` 发布到网站根目录，通过 HTTPS 提供访问。`sw.js`、`index.html` 和 `manifest.webmanifest` 应使用 `Cache-Control: no-cache`，让浏览器重新校验版本；带内容哈希的 `assets/` 文件可以长期缓存。发布时先上传完整资源再切换版本，保留上一版带哈希的资源，避免已打开的页面找不到文件。`/api` 请求不会被离线页面回退规则接管。

安装功能需要 HTTPS，localhost 可用于本机开发。离线构建的记录按站点地址隔离，更换域名、协议或端口前需要先导出备份。联网版没有这个问题。

## 代码结构

依赖方向是单向的：`ui -> app -> data -> domain`。

```
src/
  domain/    纯 TypeScript，零依赖。月龄、模型规则、食品标准化、喂养换算。
  data/      持久化层，只对外暴露仓储端口。dexie/ 和 http/ 是同一组端口的两种实现。
  backup/    JSON/CSV 备份格式、校验、导出与导入。
  app/       应用状态与流程，连接领域、数据与界面。
  ui/        展示层，唯一允许出现 Tailwind 和组件库的地方。
server/      Fastify + mysql2，字段映射、事务和独立校验。
```

四条边界由 `eslint.config.js` 强制执行，违反会直接报错：

1. `domain/` 不得 import React、Dexie、DOM 或任何界面代码。
2. `domain/` 不得使用 `Date`，时间必须作为参数传入。
3. `app/`、`ui/` 和 `backup/` 不得直接 import Dexie 或 HTTP 客户端，只能通过 `@/data` 的仓储端口访问。

这样设计是为了让展示层和存储层可以各自重写，而计算规则、快照格式和备份格式都不用动。

## 几个容易踩的地方

**中间结果不取整。** 取整只发生在 `domain/display.ts`。先对 kcal 取整再换算克数会累积误差。混合换算的比较也走全精度，所以按界面上显示的整数下限输入辅助食品时，严格来说仍然低于真实下限。

**三个版本号互不联动。** `DB_SCHEMA_VERSION` 只随表和索引变化，`EXPORT_FORMAT_VERSION` 只随备份文件字段变化，每个模型的 `ruleVersion` 只随系数和来源变化。改一个不影响另外两个。

**时间字段成对出现。** 带时区偏移的 ISO 字符串字典序不等于时间序，所以记录里同时存 ISO 字符串（展示与导出用）和 epoch 毫秒（排序与索引用）。

**模型规则版本仍是 `transcribed_from_spec`。** 系数来自 PRD 记录的指南表格数值，还没有重新打开原始 PDF 逐项核对。计算详情页会如实说明这一点。要改成已核对状态，需要先做一次逐项比对。

**界面上不写系数。** 模型设置里的「已绝育 1.2～1.4」这类文字是从 `MODEL_RULES` 里读出来的，改规则数据会同步改文案。界面上出现硬编码的系数就是 bug。

**四个食品位各有分工。** 干粮位同时是两个混合视图里被扣减后剩下的主粮，所以混合视图要求干粮位已选。湿粮位只出单纯湿粮，混合湿粮和餐包各自只驱动一个混合视图。

**超时不等于没提交。** 建档和保存快照的重试复用同一组 ID，导入备份失败时只说结果未知，写入成功但界面没刷新时提示重载。这四处都按「服务端可能已经写进去了」处理，否则用户重试会拿到第二条记录。

**草稿读取要区分「没有」和「读失败」。** 服务端用 200 加 body `null` 表示确实没有，其余异常都进失败分支，界面切到恢复界面不让编辑。判错会拿空草稿覆盖掉真草稿。
