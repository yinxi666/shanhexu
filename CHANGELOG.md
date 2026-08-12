# 更新日志 (Changelog)

「赓续血脉・数绘红旅」shanhexu 的版本演进记录。版本号为 `js/version.js` 的 `ASSET_VERSION`（缓存破击号，格式 `YYYYMMDDNN`，NN 为当日递增序号）。

---

## 2026-08-13 · v2026081310 — 交互行为测试 + 系统令牌化

- **新增交互行为测试** `tests/e2e/interactions.test.js`（6 项，并入 smoke 顺序执行）：实践点赞自增+持久、导览收藏写 localStorage、聊天跨页恢复 base 路径（不 404）、答题断点续答、留言提交、地图移动→桌面 resize 后标记出现（拦截此前 resize 空白回归）。修复了 smoke+interactions 并发跑时 `_site` 构建竞态（改 `&&` 顺序）
- **系统令牌化**：新增 `--status-ok/warn/err-bg/fg`、`--scrollbar-thumb/-hover/-color` 令牌（base+dark 双份）；替换聊天头文字、官方链接 hover、地图/图片占位、留言状态徽章、表单成功色、滚动条、深色输入/卡片/地图表面等 ~15 处裸 hex；保留打印块/热力图图例/视频黑底/艺术渐变（设计豁免，与既有打印豁免同级）

## 2026-08-13 · v2026081309 — 第二轮审查修复（回归 + 残留）

针对第二轮全仓审查（37 条/确认 16）的修复：

- **回归修复**：移动→桌面 resize 后导览地图补 plotVenuesOnMap（不再空白）；聊天历史恢复把相对路径 rebase 到当前页 base（跨页不再 404）；长征 JS 站距断点(vw<1024)与 CSS 便签断点对齐（≤1023 块，横屏手机便签不再滑出屏）；findVenueByName 补别名映射（金寨县革命博物馆等别名可命中）；入场遮罩改 `inert`（真正挡 Tab 焦点）；迷你地图 svg 改 `role="group"`（不吞跳站圆点）
- **焦点栈加固**：closeModal 只弹"传入元素"对应的 trap（不误弹栈顶）；openQuiz 加已开守卫；聊天面板移除失配的 aria-modal（未接 trap 不声明 modal 语义）；Esc 连关两层已在工作区修复一并提交
- **低危**：留言提交写失败不显示成功 + 提交后回第 1 页；sanitize 白名单补 TABLE/TR/TD（对比表恢复不拍平）；跳过持久化 ai-thinking 临时气泡（不再恢复出卡死转圈）；热力图深色重渲染保留用户缩放/中心；背景网格重建后还焦点 + aria-pressed；卡片容器补 aria-label；.section 加 scroll-margin-top（分页锚点不再被 header 盖）；雨花台详情键改名与馆名一致（删魔法别名）
- **死代码/文档**：删 cardgen GOLD、practice-detail-section、longmarch stamp 的 --note-tilt、dark.css 冗余 gold 令牌；cz-card-modal closeCardModal 复用 closeModal；修长 march 陈旧注释；README 场馆图 34→32（图标 43 经核实正确不改）；smoke boot 超时不再静默（记入 errors）；政策 ≤480 隐藏残留时间线

## 2026-08-13 · v2026081308 — 时事政策页移动端密度

- ≤480px 收走政策时间线左侧 90px 时间列（日期徽章移到卡上方、圆点隐藏），卡恢复全宽
- 政策卡改横向缩略图（图 120×90 左 + 文字右，覆盖 pages.css ≤640 的全宽大图竖排）——卡 288×414 → 358×234，信息列 114→184px

## 2026-08-13 · v2026081307 — 长征移动端"卡片大内容少"密度修复

- **站间距自适应**（longmarch.js）：移动端（vw<1024）站间距 660px→330~540px（竖屏 390 取 330），手卷总宽 11566→~5960、垂直滚动路程减半；桌面 ≥1024 保持 ≥660 不变
- **便签跟随站点滚动**：移除移动端"停靠左缘 left:-14px"（旧规则让便签随手卷平移整体滑出视口、滚动后看不到内容）；便签改 `translateX(-50%)` 居中于站点坐标，与桌面一致随纸滚动；宽度 86vw→70vw（不再溢出视口）
- **首站初始居中**：移动端 sidePad 收紧为 (vw−每站宽)/2，初始即见首站完整便签
- **留言卡**：移动端 padding 24/28→16/20 收紧（压矮）；实践页保持 2 列网格（单列实测更占屏，放弃）

## 2026-08-13 · v2026081306 — 移动端长征页 header/HUD 重叠修复

- 移动端品牌文字（strong/small）改为单行省略，header 高度 106px→69px（此前窄屏折行把 header 撑高，全站受影响）
- 长征页移动端 HUD `top: 60px→76px`（落在 header 之下），消除"顶部两个条重叠"；移动端下拉菜单 `top:72px` 也随之对齐 69px 头部

## 2026-08-13 · v2026081305 — 移动端国旗视频隐藏

- `.flag-video`（hero 左上角装饰旗视频）在 <1024px 隐藏：移动端浏览器禁止自动播放，视频只剩静态 poster（且 poster 与 hero 背景图同源，角落会贴"背景小图"）；隐藏后移动端 hero 由照片轮播承接。与 app.js `initFlagVideo` 自动播放阈值（≥1024px）对齐

## 2026-08-13 · v2026081304 — 小瑕疵清理批

- 首页统计首帧闪旧值：`stat-categories` 硬编码 6→8（与实际类别数一致，JS 加载前不再闪错值）
- 分页补读屏语义：`role="navigation" aria-label="分页"` + 当前页 `aria-current="page"` + 上/下页 `aria-label`
- `.detail-carousel` 改名 `.detail-photo`（单主图，名字不再误导为轮播）
- `images/longmarch/` 合并进 `assets/长征图片/`（消除双媒体根目录分裂，引用同步 3 处模块）
- 两处可安全令牌化的裸 hex：`.card-img` 占位 `#e5e7eb`→`var(--img-placeholder)`（深色自动适配）、热力图缩放条 `#ccc/#fff`→`var(--line)/var(--card-bg)`
- `.claude/settings.local.json` 精简：清除历史一次性 curl/sed/资产下载权限，保留 Web 检索 + JS 语法检查

## 2026-08-13 · v2026081303 — Leaflet 自托管

- 导览地图库 Leaflet 1.9.4 从 unpkg CDN 改为自托管 `assets/leaflet/`（js + css + 图标资源，BSD-2-Clause），国内/离线/评审现场不再依赖 unpkg 可达性
- 移除 guide.html 的 unpkg preconnect 与 CDN integrity；地图瓦片仍走高德在线服务（运行时数据依赖，无法自托管）

## 2026-08-13 · v2026081302 — 移动端适配加固

- 触达目标提升到 44px（WCAG 2.5.5）：移动端浮动按钮栈（chat/quiz/music/back-to-top）38→44px 并重排底部偏移，分页按钮 38/32→44px（`flex-wrap` 防窄屏溢出），热力图缩放条 28→40px
- 热力图触屏双指缩放：`roam` 按设备分流（触屏 `true` / 桌面 `'move'`），scaleLimit 1-5 仍生效
- 长征页 `.cz-atmos` 固定层 `100vh→100dvh`（地址栏收展跟随可见区，vh 兜底旧浏览器）
- 浮动按钮栈补 `:active` 按压反馈（触屏无 hover）

## 2026-08-13 · v2026081301 — 全仓审查修复批次（安全/正确性/冗余/文档）

针对 88 条全仓审查发现的修复（34 条经对抗复核确认）：

- **高危**：data.js 合并成功门禁补 `province-candidates`（瞬时失败不再被静默固化为截断缓存，17 扩展馆不再无声消失）；chat.js 聊天历史恢复注入修复（无 html 回退走 textContent）+ `sanitizeBotHtml` 协议白名单（堵 data: 子 scheme）
- **正确性**：app.js boot 拆逐子系统独立降级；hero 轮播 pageshow 不再抢跑入场 gating；长征 resize 重建补投便签 + 首站剧场不再回访补播 + venue 链接单路径；弹窗双开守卫 + focus-trap 改栈式（嵌套弹窗不丢焦点圈禁）；聊天回复串行化（不再乱序）；纪念卡背景选择器恢复高亮；`pageFadeIn` 排除长征 `#cz-main`；热力图深色适配 + 缩放钳制对齐 scaleLimit；bump/audit import 正则支持 `../` 与大小写混合名
- **死代码/数据**：venue-details 死 `gallery` 字段剥离；venues `author/license` 渲染进详情页（CC 合规）；`isCompleteShown`/`_completeShown` 死状态删除；venue-store 分叉消除（`_lastMerged`）；practices 11/12 并入 2（20→18 条）；reflections id 统一字符串；findVenueByName 空串守卫 + 前缀回退收紧
- **冗余重构**：chat-engine/timeline/homepage 复用 data.js 权威实现；`likeDeltaKey`/`FALLBACK_IMAGE`/`safeAssetSrc`/`isHomePage` 单源；`pagedSlice` 分页助手消 4 处拷贝；cardgen 提取 canvas 样板/日期/做旧/星形几何；`closeModal` 关闭序列；entrance 星火单源 + resize 泄漏门控
- **a11y**：长征页补 h1/SVG 可访问名/HUD aria-live/诗词层 aria-hidden 同步/剧场 role；聊天面板 role=dialog + Esc 关闭 + 焦点归还；卡片背景键盘可达；入场遮罩回访不再闪黑 + skip 聚焦 + 背景 inert
- **工程卫生**：CLAUDE.md 过时修正（版本号不再写死/已知坑速查/模块数统一 39）；README 补 guide-map；settings.local 清陈旧条目；emoji-clean 跳过 `_site`；smoke 过滤 `net::ERR_ABORTED` + `waitForFunction` 替代固定 sleep；新增 head CSS 加载序一致契约测试（39→40 项）

## 2026-08-12 · v2026081035 — 实践成果页顶部轮播

- 实践成果页顶部背景改为轮播（6 张代表性实践照片），与全国导览页共用通用化 hero-carousel 与 `data-hero-images` 单源

## 2026-08-12 · v2026081034 — 素材归位整理

- 5 张根目录素材（天安门.webp / 长征.webp / 毛主席雕像.webp / ai图标.webp / 挑战赛.webp）移入 `assets/通用/`
- 引用统一走 `getBasePath()/resolveAssetPath`，根页与子页路径均正确；根目录仅保留入口文件与 favicon

## 2026-08-12 · v2026081033 — 实践成果内容扩写（基于官网真实报道）

- 抓取学院官网 6 篇源文章（xxgc.sicau.edu.cn），将 20 条实践 summary 从 45-92 字扩写到 117-198 字，内容与真实报道一致（77 名党员、17 省 50 余地、牌坊村冬令营、蒙顶山茶文化等）
- 纠偏：原数据中"制作纪录片 / 服务 5000 人次"等无据细节改为真实叙述
- 实践卡片 summary 行数 clamp 2→4 行，显示更多文字

## 2026-08-12 · v2026081030~1032 — 交互体验

- **v1030 知识挑战赛断点续答**：答题中途退出/切页不再丢进度，回合状态实时存 sessionStorage（`redguide_quiz`），重开直接恢复，整轮完成才清
- **v1031 AI 富文本切页恢复**：修复切页后场馆按钮/小卡片变纯文本——机器人消息历史改存 innerHTML，恢复时经 `sanitizeBotHtml` 白名单净化（防篡改注入）
- **v1032 聊天示例按钮常驻**：底部推荐示例按钮提问后不再隐藏

## 2026-08-12 · v2026081024~1029 — 首页剪纸纪念卡

- 新增首页专属卡面 `renderHomeCard`：剪纸「赓续血脉」横批、精神词牌、散落星火、长征路线、三层剪纸山镂空孔、祥云角饰、天安门剪影水印、朱砂印章
- 经多轮打磨：渐变取代平涂、纸纹颗粒、分层金字、留白调整；移除被否的月洞门/竖红纸条；修复印章被底部带遮挡
- 首页入口走剪纸卡面，详情页/长征入口保持原证书卡

## 2026-08-12 · v2026081023 — 审查清单收尾批次

- smoke 改为构建并测部署产物 `_site`（新增 `scripts/build-site.js`，server.js 支持 `ROOT_DIR`，CI 复用同一打包逻辑）
- detail 返回链接保留导览筛选参数（sessionStorage）
- 地图用户缩放/平移后筛选不再 fitBounds 重置视口
- data.js 子加载器失败重试死代码修复（全成功才固化缓存）
- AI：排名模式提前，"全国一共/哪个省场馆最多"答错修复
- Hero 图片单源（`data-hero-images`）、cz-card 重复样式合并、页脚"关于"列单源、Leaflet integrity、changzheng `1var` 修复

## 2026-08-12 · v2026081022 — 子页面 Hero 高度

- `.subpage-hero` 高度 50vh→62vh，修复顶部背景图竖裁过重导致的"显示不全"

## 2026-08-12 · v2026081021 — 全国导览页顶部轮播

- 导览页顶部背景改为轮播：hero-carousel 通用化（`data-hero-images` 单源配置），首页/导览共用，尊重减少动效

## 2026-08-12 · v2026081020 — 质量加固与审查清理（三）

针对全库审查清单的"高风险/中风险功能问题"批次：

- **AI 助手区域问答修复**：新增数据驱动地区名提取（`matchRegion`），修复 `.{2,4}` 通配吞疑问词导致"延安有多少个场馆""介绍延安有哪些场馆"答错
- AI 助手：位置查询支持前置语序（"怎么去延安革命纪念馆"）、长征知识条不再抢答场馆查询、类别/统计输出补转义
- 导览页：修复移动端→桌面缩放后列表永久消失（恢复双栏布局）；Leaflet 补 `invalidateSize` 防瓦片错位
- 修复：政策分页 `innerHTML +=` 重解析、留言未选班级编造、时间线 400ms 覆盖用户点击、长征成就弹窗隐藏态可聚焦、热力图 SVG 降级缩放条僵尸控件

## 2026-08-12 · v2026081019 — 质量加固与审查清理（二）

针对审查清单的"低风险/数据一致性"批次：

- 点赞改存**用户增量**（`redguide_likes_delta_<id>`），practices.json 编造基数仅作展示基线、不再污染权威存储
- 数据一致性：province-candidates 31→22（剔除 9 个与核心重复的死候选并对齐冲突 URL）、venue-details 红岩键名对齐场馆名并删除硬编码别名、reflections 班级年份与学号前缀对齐
- 修复：高德跳转判据补 lng、policy 日期未转义、deep 下 select 自绘箭头丢失、省份后缀正则三处集合不一致（统一 `stripProvinceSuffix`）、粒子预算随 resize 重算
- 移除：manifest 强制竖屏、收藏写失败无反馈等

## 2026-08-12 · v2026081018 — 质量加固与审查清理（一）

针对审查清单的"死代码与冗余/测试盲区/文档漂移"批次：

- 删除详情页轮播死代码（`carousel.js`，`hasMultipleImages` 恒 false）；地图图标两套 SVG 合并
- 清理 homepage 魔法延迟、server.js 不可达 try/catch、timeline 重复 guard、data-action 双拼写、data.js 死兜底
- 测试加固：audit 拦截缺失/非法 `?v=`、设计令牌契约支持 `ms`、typography 支持 `clamp()/calc()`
- 文档漂移：README 图标数/模块清单、项目说明测试数、素材清单 `.txt` 引用

## 2026-08-12 · v2026081017 — 恢复实践成果页视频卡片

- 从 git 历史还原重构时丢失的视频功能：`practices.json` 补回 `video` 字段（practice-2/8 → 演示视频01/02）
- 卡片层"视频"脉动徽章 + 全图播放按钮、详情弹窗"播放视频"按钮、`.video-modal-overlay` 视频弹窗（按当前 data-action/focus-trap/令牌规范实现）
- 14MB 演示视频重新被引用，消除"零引用冗余"

## 2026-08-12 · v2026081016 — 全面质量修复与高内聚重构（上轮）

- 深层文档化 + CLAUDE.md 项目操作手册建立

## 2026-08-10 · v2026081008 — 详情页深度内容

- 5 个核心场馆（一大会址/井冈山/遵义/延安/西柏坡）历史与教育意义扩写（280-307 字，含关键人物/日期/数据/精神内涵）

## 2026-08-10 · v2026081007 — 高内聚重构（上一批）

- longmarch 拆分为 cz-content（内容数据）/cz-sound（音景引擎）等模块
- quiz/chat/heatmap 数据抽离独立模块；modals 关闭逻辑去重
- 实践点赞已赞保持高亮

## 2026-08-09 · v2026081006 — 全量审计修复

- JS 逻辑 bug（聊天省份/历史/长征竞态/弹窗锁/数据缓存）、CSS 非法 var 拼接/quiz 对比度/深色输入框
- 键盘可达（a11y）；死代码清理（JS 死图标字段/CSS 死选择器/孤儿资产）
- 工具链（README/CI 跑测试/数据回归测试）；坐标对齐 venues.json

## 2026-08-08 · v2026081005 — 长征交互 + 热力图官方化

- 长征 HUD 按钮可点击；深色下 dark-toggle/音乐按钮可见性
- 知识挑战赛上一题/下一题、随机 10/30 题、取消自动进题
- 热力图改用官方《全国红色旅游经典景区名录》300 处分省数据（去除虚增，数据可溯源）

## 2026-08-05 · v2026080520 及更早

- 部署修复（GitHub Pages `_site` 打包、`.nojekyll`）、AI 助手图标换新、伪 webp 修复、emoji→SVG 图标替换、ES Module 高内聚架构重构、移动端适配、留言墙/政策时间轴/实践卡片美化、背景音乐播放器、入场动画增强等（详见 git 历史）

---

> 版本与 git 提交一一对应（见 `git log`）；`npm run bump` 会把 `ASSET_VERSION` 同步到全站 `?v=`。
