# 真实产品 UI 参考证据

检索日期：2026-10-09。此文件仅记录研究、截图和适配判断，没有生成新 UI 或应用代码。`research` 起初没有既有记录约定，按任务要求将研究笔记保存在这里。全部来源为英文官方站点。

核实方式：下载官方页面及其图片，使用 `view_image` 实际查看图片；Actual 另外用本机 Chrome 的 headless 模式打开官方 demo，在 1440px 桌面视口和 390px 移动 Web 视口进入示例数据并交互截图。390px 证据是实际响应式 Web 页面渲染，未在物理手机上测试。未创建账号，未发送第三方消息。

## 1. Actual Budget：账户历史、录入、H5 导航及 CSV 导入预览

### 页面及入口

- [官方 demo](https://demo.actualbudget.org/)：等待本地数据库初始化，然后选择 `Try the demo`。没有注册步骤；本次显示 App v26.10.0。
- [Budget 页面路由](https://demo.actualbudget.org/budget)。
- [Accounts 页面路由](https://demo.actualbudget.org/accounts)。进入示例数据后选择 `Bank of America` 可见真实账户记录页面。示例账户 UUID 每次重新生成，不能把本次 UUID 当作稳定的公开地址。
- [New Transaction 页面路由](https://demo.actualbudget.org/transactions/new)，在 H5 底导航选择 `Transaction`，或在账户详情点右上角加号进入。
- [官方 CSV 导入说明及应用截图](https://actualbudget.org/docs/transactions/importing)。
- [官方导出备份说明及应用截图](https://actualbudget.org/docs/backup-restore/backup)。
- [官方恢复备份说明及应用截图](https://actualbudget.org/docs/backup-restore/restore)。
- [官方 Reports 页面及应用截图](https://actualbudget.org/docs/reports/)。

分类：真实产品 Web 应用及官方产品文档中的应用截图，不是概念稿。demo 页初次有加载过程，本次在 4 秒时仍停留初始化，等待后能进入；最终参考使用加载完成的截图。

### 实际查看的本地截图

| 页面 | PC 截图 | H5 截图 |
| --- | --- | --- |
| 预算主页面 | [1440px](cat-ui-assets/products/actual-demo-budget-stable-1440.png) | [390px](cat-ui-assets/products/actual-demo-budget-stable-390.png) |
| 账户列表 | PC 使用侧栏账户列表 | [390px](cat-ui-assets/products/actual-demo-accounts-list-stable-390.png) |
| 账户记录 | [1440px](cat-ui-assets/products/actual-demo-account-stable-1440.png) | [390px](cat-ui-assets/products/actual-demo-account-stable-390.png) |
| 新增记录 | [PC 内联录入](cat-ui-assets/products/actual-demo-add-new-form-1440.png) | [H5 单列表单](cat-ui-assets/products/actual-demo-transaction-form-390.png) |
| 从账户新增 | PC 仍为内联录入 | [已预选账户及固定提交](cat-ui-assets/products/actual-demo-add-from-account-390.png) |
| 编辑已保存记录 | 未单独核实 PC 编辑 | [H5 编辑与固定保存区](cat-ui-assets/products/actual-demo-edit-record-390.png) |
| CSV 导入预览 | [本次在 demo 打开](cat-ui-assets/products/actual-demo-import-preview-1440.png) | 未核实 H5 导入界面 |

这些截图已用 `view_image` 实际查看。各次新建的 demo 环境生成不同示例金额和 UUID，截图用于比较结构，不用于比较金额。

### 可借鉴内容及匹配理由

账户记录是比预算首页更合适的主参考。PC 在标题下面展示一个主要金额，紧接 `Import`、`Add New`、`Filter`，右侧放搜索；主体是有细分隔线的紧凑表格，没有把每条记录包成独立大卡片。数据列右对齐，分组和表头用弱灰底、细边界区分。深蓝侧栏、浅灰主背景、白色数据面和紫色选中状态构成明确的操作层次。[账户页面](https://demo.actualbudget.org/accounts) 与 [本次 PC 截图](cat-ui-assets/products/actual-demo-account-stable-1440.png) 为证据。

H5 使用日期分组，单条记录以名称和附属信息占左侧，数值放右侧，不保留 PC 的七列表格。账户详情顶部保留返回、账户标题和加号，余额和搜索在记录前面。主页面底部固定 `Budget`、`Transaction`、`Accounts` 三个入口，实际保留新增操作。账户详情进入下一级后没有沿用底导航，返回和顶部加号仍在。[H5 主列表](cat-ui-assets/products/actual-demo-accounts-list-stable-390.png) 与 [H5 账户详情](cat-ui-assets/products/actual-demo-account-stable-390.png) 为证据。

可以借这些结构组织猫咪列表、体重记录、计算历史及食品记录。数值和单位需要额外明确排版，Actual 财务数据没有猫咪工具需要的 `kg`、`kcal/day`、`g` 或 `份`。

PC 新增记录直接在表格头部下方展开一行，行内日期输入触发日期弹层，确认和取消靠右；H5 新增记录则进入独立页面，顶部放金额，下面按字段排列，底部固定操作区。H5 未选择账户时，底部显示 `Select account`，可说明字段选择如何约束提交动作。[PC 新增](cat-ui-assets/products/actual-demo-add-new-form-1440.png) 与 [H5 新增](cat-ui-assets/products/actual-demo-transaction-form-390.png) 为证据。猫咪基础资料字段更多，适合借 H5 字段节奏与固定提交区，不宜直接复制 PC 的一行编辑密度。

另外实际进入账户右上加号后的 H5 新增页，账户已预选，底部固定 `Add transaction`；点击既有 Kroger 记录进入 H5 编辑页，已有值填入，底部固定 `Delete transaction` 与 `Save changes`。没有点击保存或删除。[已选账户新增截图](cat-ui-assets/products/actual-demo-add-from-account-390.png) 与 [记录编辑截图](cat-ui-assets/products/actual-demo-edit-record-390.png) 已用 `view_image` 核实。这类明确的保存区比把操作放到隐藏菜单里更适合猫咪工具。

CSV 导入是本参考对数据管理页最直接的贡献。本次仅上传一行本地虚拟 CSV，停留在预览，未点击导入确认。当前产品显示原始日期到解析日期的对应、原始记录预览、字段映射、格式选项与 `Import 1 transactions` 确认按钮。真实产品流程是先预览和配置，再确认导入。[官方导入说明](https://actualbudget.org/docs/transactions/importing) 与 [本次预览截图](cat-ui-assets/products/actual-demo-import-preview-1440.png) 为证据。

备份导出位于设置，官方文档明确提供 `Export Data`。ZIP 恢复与 CSV 导入是两条不同流程：官方 ZIP 恢复步骤是选择 Actual 类型并上传 ZIP，然后打开恢复文件进行检查，没有展示数据内容预览。因此，不能声称 Actual 的所有备份导入都具备预览确认。[导出说明](https://actualbudget.org/docs/backup-restore/backup)、[恢复说明](https://actualbudget.org/docs/backup-restore/restore) 为证据。

### 成熟组件适配判断

- Tailwind：深蓝侧栏、弱灰页面底、细边界表格、单列 H5 列表、数值右对齐、固定底导航与固定提交区。
- shadcn/ui：`Table`、`Button`、`Input`、`Select`、`Checkbox`、`Popover` 与日期选择、`Dialog` 用于 PC 预览，`Sheet` 或 `Drawer` 用于窄屏详情。PC 内联表格编辑需要额外状态处理，基础录入建议优先完整表单。
- Lucide：新增、筛选、搜索、上传、下载、返回等具备明确操作含义的图标。
- Recharts：官方独立 Net Worth 图表页的区间筛选和数值摘要可以借鉴，但猫咪体重应使用真实记录点和线性连线，不能沿用无点的面积图来暗示连续测量。

这些是适配建议，没有声称 Actual 本身使用以上组件。

### 不匹配及限制

当前账户记录出现多种彩色标签、已清算图标和计划交易状态，这是财务场景的信息；猫咪工具无须沿用这些徽章。初次 PC demo 会出现引导提示浮层，截图保留了现场状态，也不建议复制该提示。

预算主页面含多个月份和预算分配，不适合作为两组热量结果的完整计算页。官方 Reports Main 截图使用大数字卡片网格，和用户对主视图密度的要求不匹配，应优先取账户记录或单独图表页，而非 Reports Main。

当前 CSV 预览有很多编码、金额和合并高级选项，1440×900 视口下确认按钮需要在弹层内部滚动才能完整看到。猫咪工具若只导入自身备份格式，字段映射和多数 CSV 高级项无必要；应借预览到确认的顺序，不复制全部选项或超高弹层。未核实其 H5 导入/导出完整交互，不对手机版本作推断。

### 官方应用图片直达地址

- [CSV 导入截图](https://actualbudget.org/assets/images/import-csv@2x-42bca3494cf33b441a324725857200c2.webp)，[本地副本](cat-ui-assets/products/actual-csv-import.webp)。该官方截图较当前 demo 少一些高级选项。
- [备份导出设置截图](https://actualbudget.org/assets/images/settings-export-1f9728246df45b283a0ec18d93b00117.webp)，[本地副本](cat-ui-assets/products/actual-backup-settings.webp)。
- [ZIP 恢复选文件截图](https://actualbudget.org/assets/images/restore-import-file-select-file-27385a42d5194d66b8481015139aceea.webp)，[本地副本](cat-ui-assets/products/actual-restore-select.webp)。
- [独立 Net Worth 页面截图](https://actualbudget.org/assets/images/net-worth-0b5d32c239d7543894671a51f4ba3f3d.webp)，[本地副本](cat-ui-assets/products/actual-net-worth.webp)。
- [Reports Main 截图](https://actualbudget.org/assets/images/dashboard-eba5650499b7aa9635f6147fa58d1ab0.webp)，[本地副本](cat-ui-assets/products/actual-dashboard.webp)。仅作排除和结构比较。

## 2. Cronometer：Trends > Charts 与原生 Weight Goal

### 页面及截图入口

- [How To Use & Leverage Charts](https://cronometer.com/blog/charts/)：官方教程，包含真实 Web Charts 视图截图，并明确区分 Web `Trends > Charts` 和手机 app `Home > Charts`。
- [How To: Track Weight on Cronometer](https://cronometer.com/blog/weight-goal/)：官方教程，包含原生 iPhone Weight Goal 页面图，发布时间为 2025-03-17。
- [Web Charts 图像直达](https://blogcdn.cronometer.com/blog/wp-content/uploads/2019/06/Screenshot-2023-07-20-at-2.16.34-PM-1024x749.png)，[本地截图](cat-ui-assets/products/cronometer-web-charts.png)。图片文件名和内容时间是 2023 年，不能声称是 2026 年当前最新界面。
- [Weight Goal 手机图像直达](https://blogcdn.cronometer.com/blog/wp-content/uploads/2025/03/1200x580-Blog-Image-Weight-Goal.jpg)，[本地截图](cat-ui-assets/products/cronometer-weight-goal.jpg)。

分类：官方产品教程中的真实应用界面截图。Weight Goal 手机图片位于营销装饰背景中，手机内是应用页面，背景不能当应用布局依据。

### 实际观察及借鉴

已用 `view_image` 查看 Web Charts：两个上下排列的宽幅图表，上部是摄入热量，下部是体重。标题用小字号加粗，日期范围在其下；右上有时间、数据范围、指标/单位选择和更多操作。白色图表区域、细网格线、橙色体重线形成低装饰的数据面。比整套营养 Dashboard 更适合借给猫咪体重记录页。[官方 Charts 教程](https://cronometer.com/blog/charts/) 与 [实际截图](cat-ui-assets/products/cronometer-web-charts.png) 为证据。

截图的体重曲线图例明确是 `Weekly Average`，同时有 `Show Full Data` 选项，没有显示真实测量点。用户的体重页需要真实数据点，不能将这条平均曲线当作测量记录曲线。可借时间与单位控件位置，不应直接复用其平均线语义。

Weight Goal 手机页面里，顶部给当前目标；中间调节每周变化值，页面后部收纳计算结果。官方说明指出可查看 target breakdown 理解 Energy Target 的计算，也提供改变目标和记录体重的入口。这个选择后再更新结果的顺序与计算工具有关；但当前截图中没有完整公式/来源页，所以不能声称其详情包含我们需要的完整计算过程。[Weight Goal 教程](https://cronometer.com/blog/weight-goal/) 为证据。

### PC 与 H5

Web Charts 截图是 PC 页面。官方教程确认 Web 和手机 app 都有 Charts 功能，但本次没有登录用户账号，也没有核实窄屏 Web 应用，因此 H5 结构未知。Weight Goal 图片有 iOS 状态栏和原生导航，属于原生 app 证据，不能充当响应式 H5 证据。

### 适配判断

Tailwind 可直接实现小标题、紧凑筛选、浅网格和白色绘图区；shadcn/ui 的 `Select`、`DropdownMenu`、`Checkbox`、`Button` 适合控件；Recharts 能组织热量柱状图与体重线图，猫咪工具应只画需要的真实点和线，并显示实际单位。图例类别超过猫咪工具所需，不必继承多种宏量营养颜色。Lucide 只用于更多、返回、增加等有操作意义的图标。

Weight Goal 的减重/增重预测日期、奖励性图标和健康目标流程不适用猫咪工具，不建议复制。这个参考更适合局部图表控件和记录录入顺序，不能担任完整 PC/H5 视觉方案。

### 访问限制和排除

`https://support.cronometer.com/hc/en-us/articles/360018569691-Trends-Charts` 本次返回 HTTP 403，未访问其页面内容。官方博客可访问，不从受限页面推断界面。

官方品牌首页、`features/track-food.html` 和 `features/reports-and-charts.html` 本次均可访问，但主要图片实际是人物/食品营销照片叠加局部 UI，不是完整应用页。如下图片已实际查看，排除其作为整体应用布局依据：

- [人物视频封面本地副本](cat-ui-assets/products/cronometer-web.webp)。文件名含 Web Screenshot，但实际图像是人物运动画面。
- [营销体重图局部副本](cat-ui-assets/products/cronometer-charts-chart.webp)。有食品背景和图表卡片，无完整应用框架。
- [营销热量圈副本](cat-ui-assets/products/cronometer-track-food.webp)。大人物照片加热量圈，不符合主视图密度要求。

## 3. YNAB：保存证据，建议不列入最终主参考

### 已核实页面

- [YNAB Budget Reports: See Your Spending Trends](https://www.ynab.com/blog/ynab-reports-and-data)。官方文章当前可访问，页面日期为 2022-12-29，并说明最初发布于 2016 年。截图数据范围为 2021 年，所以必须标记历史版本。
- [旧 Net Worth 完整应用页图](https://cdn.prod.website-files.com/6410766c6141dc6c15cfe33c/67760348958381cd84854f69_646e6b1cb36b5fe43d3ccb4b_img_blog_122921_networth-1024x675.avif)，[转换后的本地 PNG](cat-ui-assets/products/ynab-networth-page.png)。
- [旧 Spending Trends 完整应用页图](https://cdn.prod.website-files.com/6410766c6141dc6c15cfe33c/67760347958381cd84854f23_646e6b1c1dbcc9cda43cff44_img_blog_122921_trendsreport-1024x720.avif)，[本地 PNG](cat-ui-assets/products/ynab-trends-page.png)。
- [交易详情弹窗图](https://cdn.prod.website-files.com/6410766c6141dc6c15cfe33c/67760348958381cd84854f55_646e6b1c285b642f32683cc9_img_blog_122921_grocerytransactions-1024x540.avif)，[本地 PNG](cat-ui-assets/products/ynab-transactions.png)。
- [官方 Features 页面](https://www.ynab.com/features)，含较新原生 iPhone Net Worth 图；[本地 PNG](cat-ui-assets/products/ynab-net-worth.png)。该页面整体是营销页，应用图是手机框内的局部证据。

分类：官方文章中的真实应用历史截图，以及营销页嵌入的原生手机应用截图。不是概念稿；未证实目前 Web 版本仍保留旧布局。

### 实际观察

已实际查看 Net Worth、Spending Trends、交易详情弹窗和手机 Net Worth 图。旧 PC Reports 顶部有 `Spending / Net Worth / Income v Expense` 标签，下一行放分类、日期、账户筛选和导出；左侧主图占约三分之二，右侧为区间、结果和明细列表。官方文案明确可点击图例/图表进一步钻取，并打开对应交易列表弹窗。因此，结果附近再查明细的交互很适合体重/计算历史的追溯。[官方文章](https://www.ynab.com/blog/ynab-reports-and-data) 为依据。

旧交易弹窗是表头加紧凑记录行，底部仅关闭按钮；可以借其详情密度，不借财务列。现在手机图把当前金额和资产/债务分解放在图表之前，下方还出现 Understanding Net Worth 的解释内容。本产品可以借数字与分解的顺序，解释内容应移到详情，避免首页复制大说明块。

### 不纳入最终主参考的原因

PC 主证据是 2021 年数据的旧界面，原生手机图片与 PC 历史版本不是同一时期，不能由这两组图片推断 PC 到 H5 的响应式变化；本次 H5 应用内部页面未核实。财务 stacked bar、多种类别颜色和过多筛选也超过猫咪工具的需求。已有更可重复核实的 Actual PC/H5，因此 YNAB 保留为历史交互研究，不建议占用最终 5 至 8 条的主要名额。

## 可直接转入最终比较的结论

1. Actual 的账户记录与 H5 新增页值得列入正式清单：同时有完整可操作 Web 证据、真实 H5 结构和导入预览。它更适合作为记录/数据管理/移动导航的主要参考。
2. Cronometer 可列为局部参考：官方 Web 图表的筛选、单位和数据范围组织有价值；H5 未核实，原生手机不替代 H5，体重平均线不替代真实记录点。
3. YNAB 只保留排除说明与历史截图，不建议选为最终整体方向。

以上涉及组件的部分均为实现适配判断；页面观察和未知项已分别标记，没有自行生成设计稿。

## 4. Plausible Analytics：公开 Dashboard 的 PC/H5 数据组织

### 页面及证据

- [公开站点 Dashboard](https://plausible.io/plausible.io)：无需登录即可查看 `plausible.io` 的公开统计页。页面顶部是真实 Dashboard，向下才是产品营销页，因此本次只把上方应用区域作为布局证据。
- [PC 实际截图](cat-ui-assets/screenshots/plausible-loaded-1440.png)；[390px 实际截图](cat-ui-assets/screenshots/plausible-loaded-390.png)。两张图均由公开页面在对应视口渲染得到。

分类：真实 Web 应用公开视图。它不是设计稿，但公开数据和游客访问状态会变化，截图只证明布局与交互位置，不证明指标数值。

### 可借鉴内容

PC 首屏将全局筛选放在右上，日期范围与过滤器保持同一操作带；一块宽图表承担趋势阅读，下面用并列数据区块呈现来源、页面、地域、设备和目标。标题、图例和表头字号较小，数字对齐依赖列宽与留白，整体没有大型插画或说明卡片。猫咪工具的记录页可以借用体重趋势图加历史列表的主次关系，并将日期范围、单位和猫咪选择放在图表同一行。

390px 页面没有简单隐藏所有内容，而是把 PC 的并列区块改为纵向连续区块，图表压缩为单列宽度，日期筛选仍留在顶部，表格列数减少但行内容仍可读。这是实际移动 Web 证据，适合验证体重曲线与历史列表的顺序。

### 组件适配与限制

- Tailwind 可实现浅灰页面底、白色分区、细分隔线、紧凑标题和纵向移动布局。
- shadcn/ui 的 `Select`、`DropdownMenu`、`Tabs`、`Table`、`Card` 可承载筛选、指标切换和历史表格；Lucide 只放筛选、更多和展开等明确操作图标。
- Recharts 可以实现体重折线、真实点、区间切换和 tooltip，但不应复制 Plausible 的六个指标卡。猫咪工具的主视图只保留与结果或记录直接有关的数字。

Plausible 的地域地图、来源渠道、目标漏斗和大量分析分组与猫咪资料无关。截图下方的注册营销区不是应用内部页面，不能用来推断产品导航。公开页没有提供独立 H5 应用路由，390px 证据是响应式 Web 截图。

## 5. shadcn/ui Dashboard Block：成熟组件的可运行参考

### 页面及证据

- [Dashboard block 运行页](https://ui.shadcn.com/view/new-york-v4/dashboard-01)：官方可运行 React 示例，页面包含侧栏、图表区域、表格和抽屉编辑。
- [官方 Dashboard 示例](https://ui.shadcn.com/examples/dashboard)：同一组件生态的示例入口。
- [PC 截图](cat-ui-assets/screenshots/shadcn-block-1440.png)、[390px 截图](cat-ui-assets/screenshots/shadcn-block-390.png)。
- [PC 详情 Drawer](cat-ui-assets/screenshots/shadcn-detail-1440.png)、[390px 底部 Drawer](cat-ui-assets/screenshots/shadcn-detail-390.png)。

分类：官方开源组件示例，不是第三方真实业务产品。它可以作为 React、Tailwind、Lucide 和 Recharts 的落地基线，不能作为某个具体行业流程的研究证据。

### 可借鉴内容

PC 使用固定侧栏、顶部上下文栏、图表区和数据表。示例的表格有列定制、分页、选择框和行级操作，适合映射到食品记录、体重历史或计算历史。打开一条记录后，PC 从右侧出现 Drawer，背景保留上下文；390px 变为底部 Drawer，内容带字段表单和底部提交按钮。这个变化正好适合把公式、参数、来源和完整计算过程放到详情层，而不是塞入计算首页。

移动版把四列指标卡变成纵向内容，图表范围选择变为单个下拉框，表格去掉次要列并保留分页和行标题。侧栏在移动视口不占空间，顶部保留页面名称和操作入口，说明移动端需要独立的顶部或底部导航策略。

### 组件适配与限制

- `Sidebar`、`Table`、`Field`、`Select`、`RadioGroup`、`Drawer`、`Dialog`、`Tabs` 可直接作为基础；`Chart` 组件的 Recharts 封装可承载体重线图。
- Lucide 已是该生态的默认图标选择；数字单位可用 `Input Group` 的 addon 放在输入右侧。
- Tailwind 可控制 PC/H5 的列数、间距、固定操作区和抽屉高度。

示例中的四个大指标卡、趋势徽章、状态徽章和重复说明文本会让猫咪计算页变成 Dashboard 拼贴，不符合结果优先和低装饰要求。示例图表有一段空白占位状态，不能把占位高度当作真实图表比例。它展示的是组件能力，不等于已经核实的生产级移动导航。

## 6. Numbr：计算器页面的表达式与结果记录

### 页面及证据

- [Numbr 产品页](https://numbr.dev/)：产品介绍入口。
- [实际计算器入口](https://numbr.dev/#new)：公开应用，可输入表达式并保存连续计算。
- [PC 计算页](cat-ui-assets/screenshots/numbr-calculations-1440.png)、[390px 计算页](cat-ui-assets/screenshots/numbr-calculations-390.png)。

分类：真实公开 Web 计算器。PC 与 390px 是同一应用的响应式渲染，不是营销 mockup。

### 可借鉴内容

页面把表达式、结果和单位放在同一条纵向记录中，`240 / 400 * 100`、`60 g` 和 `60 g in oz` 的关系无需额外说明卡片。结果记录按输入顺序保留，适合猫咪计算页显示两组独立结果，以及把每次换算保存到历史。数字使用等宽或近等宽的字符节奏，单位紧跟数值，减少扫描时的歧义。

PC 是大面积双栏编辑区，390px 保持同样的左右分界并缩小可用宽度，右下角保留浮动更多操作。核心计算区域没有因为移动端隐藏结果或导航而中断，这一点可用于确定 H5 的结果优先顺序。

### 组件适配与限制

Tailwind 可实现表达式行、单位列和响应式双栏；shadcn `Input`、`Input Group`、`Button`、`DropdownMenu` 可承载输入与操作，Lucide 可用于更多、复制、删除；Recharts 不适用于 Numbr 本身，但可在猫咪记录页独立加入体重图。

Numbr 没有猫咪资料、字段条件展开、图表、数据导入预览或完整公式来源页。它的空白编辑器和浮动菜单不适合直接作为产品壳层，复杂表单也不能采用它的单行表达式模型。它只适合承担计算页结果排版与连续历史的局部参考。

## 7. FinScope Finance Dashboard：浅色数据 Dashboard 概念稿

### 页面及证据

- [Dribbble 页面](https://dribbble.com/shots/27258613-FinScope-Finance-Dashboard-UI)。
- [已查看页面截图](cat-ui-assets/screenshots/finscope-page-1440.png)。截图包含 Dribbble 页面外壳和主图中的完整 Finance Dashboard 画面，页面本身不是可操作产品。

分类：概念设计稿。截图只证明设计师展示了哪些桌面布局，不能证明真实流程、响应式行为或可访问性。

### 可借鉴内容

主画面使用浅灰底、白色内容面、细边界和单一蓝色强调；左侧导航，中间趋势图与交易表，右侧放即将发生的项目和分析摘要。图表标题、时间范围和关键金额保持紧邻，数字字号明显高于辅助文字。这种主图加列表的分区可以转成体重曲线加历史记录，右侧摘要也可转成当前猫咪和计算基准，而不必增加额外指标卡。

可用 Tailwind 做三列到单列的网格，shadcn `Sidebar`、`Table`、`Select`、`Card` 和 `Separator` 覆盖基础结构，Lucide 覆盖导航与筛选，Recharts 覆盖折线、柱状图和 tooltip。

PC/H5 响应式没有核实，Dribbble 页面只提供概念展示。财务卡片、账户活动和圆环分析与猫咪工具的字段密度不匹配；如果照搬右侧多卡，会让计算结果被次要摘要挤压。此参考只用于浅色层级、数字和图表与列表的关系。

## 8. Fintrack 与 Payrix：只用于风格对照的概念稿

### Fintrack

- [Dribbble 页面](https://dribbble.com/shots/27554203-Fintrack-Personal-Finance-Dashboard)。
- [已查看桌面稿](cat-ui-assets/screenshots/fintrack.png)。

Fintrack 是深色金融 Dashboard 概念稿，展示侧栏、趋势图 tooltip、交易表和右侧卡片。可借 tooltip 的日期、两条指标和垂直定位线，以及表格上方的搜索与筛选位置。Tailwind 可以实现深色 token，shadcn `Table`、`Tabs`、`DropdownMenu` 和 Recharts 可覆盖结构，Lucide 可实现搜索、筛选和更多操作。

它使用霓虹青色、发光边缘、信用卡模块、升级广告和大量成功/失败状态，和猫咪工具的低装饰、低徽章要求冲突。没有真实移动稿或可操作应用入口，H5 结构未知，不能从桌面概念图推断响应式布局。

### Payrix Web/Mobile

- [Web 概念稿](https://dribbble.com/shots/26550987-Payrix-SaaS-Web-Finance-Dashboard)。
- [Mobile 概念稿](https://dribbble.com/shots/26660890-Payrix-SaaS-Mobile-Finance-Dashboard)。
- [桌面截图](cat-ui-assets/screenshots/payrix-desktop.png)、[手机截图](cat-ui-assets/screenshots/payrix-mobile.png)。

Payrix 同时展示桌面和手机方向，手机画面保留 Overview、账户金额、三项操作和底部导航，因此可以观察关键操作在窄屏中的保留方式。可借底部导航和金额加操作的顺序，Tailwind、shadcn `NavigationMenu`、`Button`、`Card` 和 Lucide 足以复现这些局部。

两张图都是设备模型中的营销展示，使用玻璃拟态、强渐变、摄影背景和超大标题，没有真实 DOM 或可操作流程。它们不能证明同一产品的响应式实现，也不适合用作猫咪工具的整体配色和容器样式。手机稿只能作为底部导航方向的概念灵感，不能替代 H5 证据。

## 局部组件参考

这些页面用于局部交互核对，不计入上面的八个整体参考。

- [Beautiful UI Diff Table](https://www.beautifului.dev/#diff-table)：[PC 截图](cat-ui-assets/screenshots/beautifului-diff-1440.png)、[390px 截图](cat-ui-assets/screenshots/beautifului-diff-390.png)。表格以行级变化、确认和移动端压缩为重点，可借历史记录的变更标记、导入预览的字段对照和确认动作。它是组件演示页，不是完整产品页面。
- [beUI Bottom Sheet](https://beui.dev/components/motion/bottom-sheet)：[390px 打开状态](cat-ui-assets/screenshots/beui-sheet-open-390.png)。页面展示 snap points、拖拽和移动底部抽屉，适合公式详情、历史详情和导入预览；动效可用 shadcn `Drawer` 实现，需控制长内容滚动和键盘遮挡。
- [shadcn Drawer 文档](https://ui.shadcn.com/docs/components/drawer)：官方文档给出 PC `Dialog`、移动端 `Drawer` 的响应式组合、snap points 和非模态选项。它是实现详情层的直接依据，不应当被当作产品视觉参考。
- [shadcn Input Group 文档](https://ui.shadcn.com/docs/components/input-group)：官方文档展示输入右侧/下方 addon、单位文本、复制按钮、下拉和保存状态。适合 `kg`、`kcal/kg`、`g/份` 等字段，基础组件可直接结合 Lucide 图标。
- [Rare UI 组件目录](https://www.rareui.com/components)：页面说明部分组件可通过 shadcn CLI 安装。当前目录更偏装饰和动效，未找到与本产品完整流程相同的页面，只建议按需抽取交互，不作为整体方向。

## 可比较结论与整体方向

### 方向 A：浅色记录工具

主要页面参考选 [Actual 账户记录](https://demo.actualbudget.org/accounts)，图表局部采用 [Plausible Dashboard](https://plausible.io/plausible.io) 的趋势图和筛选位置，公式详情采用 [shadcn Drawer](https://ui.shadcn.com/docs/components/drawer)。

这个方向适合记录页、历史列表和数据管理优先的产品：PC 使用侧栏和紧凑表格，H5 使用固定底部导航、日期分组列表和独立录入页；计算页只在主区域保留猫咪摘要、两组结果和换算选择，解释内容放 Drawer。选择依据是 Actual 同时有已核实的 PC/H5 应用和导入预览，Plausible 已核实曲线与下方列表的移动纵向变化，组件实现成本低。

### 方向 B：组件基线优先

主要页面参考选 [shadcn Dashboard block](https://ui.shadcn.com/view/new-york-v4/dashboard-01)，历史与录入行为采用 [Actual H5 新增/编辑页](https://demo.actualbudget.org/accounts)，数字字段采用 [shadcn Input Group](https://ui.shadcn.com/docs/components/input-group)。

这个方向适合希望快速统一 React、TypeScript、Tailwind 和 shadcn/ui 的团队：PC 保留侧栏和表格，H5 用顶部页面标题、底部关键导航和底部 Drawer；表单用 `Field`、`Select`、`RadioGroup` 做条件展开，Recharts 只承担体重图。必须删掉示例的四个指标卡和状态徽章，避免组件示例决定产品信息架构。选择依据是组件页面已实际核对 PC/H5 与 Drawer 的结构，且与用户指定技术栈直接一致。

### 方向 C：计算优先

主要页面参考选 [Numbr 计算页](https://numbr.dev/#new)，记录页图表采用 [Cronometer Web Charts](https://cronometer.com/blog/charts/) 的时间、指标和单位控件位置，详情层采用 [beUI Bottom Sheet](https://beui.dev/components/motion/bottom-sheet) 或 shadcn Drawer。

这个方向适合高频先算结果、再查看记录的使用方式：结果与单位紧邻，当前换算基准用 Select 或 RadioGroup，最多四种条件式换算以同一结果区的可切换视图呈现；PC 可以把公式和来源放右侧详情，H5 用底部抽屉。选择依据是 Numbr 对表达式与单位关系有直接证据，Cronometer 提供图表筛选的真实页面参考。需要补足 Numbr 没有的资料编辑、导入预览和历史详情，Cronometer 的 `Weekly Average` 不能直接代替猫咪真实测量点。

## 证据边界

- Actual、Plausible、Numbr 和 shadcn 示例有可重复查看的 Web 页面；其中 Actual、Plausible、Numbr 的截图来自实际页面，shadcn 是官方可运行示例。
- Cronometer 的 Web 图表来自官方教程中的应用截图，截图标注为较早版本；其手机证据是原生 app，不是 H5。
- FinScope、Fintrack、Payrix 是 Dribbble 概念设计稿。Payrix 有桌面和手机展示，但没有可操作产品，不能证明响应式实现。
- YNAB 的历史应用图和手机图已保留在前文，因版本和平台不一致，不纳入三套整体方向。
- 本报告没有声称任何参考产品内部使用 Tailwind、shadcn/ui、Lucide 或 Recharts；组件部分是基于已核实页面结构给出的实现适配判断。
