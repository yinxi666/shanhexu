# CLAUDE.md — 山河序 · 赓续血脉数绘红旅（shanhexu）

红色文旅数字导览平台，2026 网页设计竞赛作品。纯静态站点：原生 HTML/CSS/JS + 原生 ES Modules，零框架、零打包、无后端。GitHub Pages 子路径部署（https://yinxi666.github.io/shanhexu/）。

**给 AI 助手：改动前必读。违反下述约定（尤其缓存版本号、路径、令牌、data-action、数据形状）会让 `npm test`/`npm run audit` 红，或部署后静默失效。**

## 页面与结构

7 个页面：`index.html`（首页）+ `pages/` 下 6 页（guide 全国导览 / detail 场馆详情 / changzheng 重走长征 / policy 时事政策 / practice 实践成果 / message 留言墙）。每页唯一入口 `<script type="module" src="js/app.js?v=...">`（子页为 `../js/app.js`）。

- `js/`：app.js 唯一入口 + 39 个高内聚 ES 模块（见"依赖方向"）
- `css/`：8 文件设计系统（见"CSS 设计系统"）
- `data/`：9 个 JSON（见"数据层"）
- `templates/`：共享 header/footer（运行时 `{{BASE}}` 注入）
- `scripts/`：bump-version / audit / converge-design-tokens（CommonJS，零依赖）
- `tests/`：node:test 契约测试 + Playwright 冒烟

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm start` | 本地静态服务 http://localhost:9876（PORT 可覆盖）。**必须 HTTP，file:// 下 ES Module/fetch 全挂** |
| `npm test` | 40 项零依赖契约测试（node --test tests/*.test.js，零网络，~200ms） |
| `npm run smoke` | Playwright + 系统 Chrome：7 页加载冒烟 + 17 项交互行为测试（点赞/收藏/聊天跨页/聊天安全/答题断点/答题作答/留言/地图 resize/长征跳站/文物弹窗/热力图缩放/详情分享/详情打印/搜索/深色；需 npm ci + 本机 Chrome/Edge；自起随机端口，顺序执行避免 _site 构建竞态） |
| `npm run audit` | 提交前体检：版本一致性 / import 完整 / 死引用 / 资源存在性（硬失败 exit 1） |
| `npm run bump` | 同步缓存版本号到所有 HTML `?v=` 与 js/ 相对 import（见缓存破击） |
| `npm run converge` | CSS 魔法值→令牌幂等收敛（保护 transition/animation 的 delay 位） |
| `git push main` | CI 自动 audit + test → npm ci → smoke → 打包 _site → 部署 Pages |

## 缓存破击（?v=）— 最容易翻车的点

单一版本源：`js/version.js` 的 `ASSET_VERSION`（以该文件当前值为准，必须 `/^\d{10,16}$/` 纯数字，否则 bump 抛错）。

**改任何 js/css/html 后必做：① 改 version.js → ② `npm run bump` → ③ `npm run audit`。**

不 bump 的后果：GitHub Pages/浏览器强缓存旧模块，改动"不生效"或新旧混用，smoke 报同源 404。
命名：bump/audit 的 import 正则现支持 `./`、`../` 与大小写混合文件名（2026-08-13 修复漏刷新盲区）；**新模块仍建议小写连字符命名**，保持全站一致与可读性。

## 路径三件套（禁止硬编码 './' 或裸相对路径）

- `getBasePath()`：pathname 含 `/pages/` 返回 `'../'`，否则 `''`。所有 fetch/图片/链接都经它组装。
- `resolveAssetPath(imagePath, bp)`：http(s) 与 `/` 开头透传，空值回退 `assets/页面通用图片/暂无图片.png`。
- 模板 `{{BASE}}` 占位符：`templates/*.html` 内所有根相对 href/src（logo、index.html、pages/*.html 链接）必须写，layout-loader 运行时按当前页替换为 `'../'` 或 `''`。
- 中文资产目录名（`assets/页面通用图片/`、`assets/全国红色场馆图片/`、`assets/通用/`、`assets/学校实践图片/` 等）必须字节级保留（UTF-8），不得改名。

## 交互：data-action 委托（禁止内联 onclick）

全站交互走 `[data-action='值']` + document 级委托（`js/action-delegate.js` 单一 switch，现 18 个 case：含 `open-practice-video`/`close-practice-video` 实践视频弹窗、`guide-search`/`guide-toggle-view` 导览页搜索与视图切换）。
**新增交互三步：① 元素加 data-action + 所需 data-* 属性 → ② switch 加对应 case → ③ 逻辑实现放进所属模块（页面私有动作如 copy-share-link 实现在 pages.js，委托只分派）。** 漏加 case 会让 `tests/data-action.test.js` 静态扫描红。

## 模块依赖方向（单向无环，禁 import app.js）

叶子（零 import）：`utils` / `version` / `icons` / `focus-trap` → `data` → `venue-store` → `ui` / `renderers` → `chat` / `chat-engine` / `quiz` / `pages` / 各页面模块 → `app.js`（唯一入口，import 全部）。

规则：新模块只 import 叶子/上游；一文件一导出 initX()；文件头注释块（职责/约束/依赖）；**纯逻辑模块（data.js / chat-engine.js / venue-store.js）不写 DOM**（Node 下 location.pathname 会抛错）。

## 启动编排（app.js boot() 固定顺序）

1. `loadLayout()`（注入 header/footer，{{BASE}} 替换；header/footer 失败互不阻塞）
2. 非 `/pages/` 才 `initEntranceAnimation()` + `initHeroCarousel()`（仅首页）
3. `initActionDelegate()`
4. `RedPages.autoInit()`（pages.js 按 pathname 路由 → 各页控制器，每控制器先 await `initCommon()`）
5. `await loadVenues()`（必须早于 chat + timeline）
6. 非 changzheng：`initChatWidget/initDarkMode/initQuiz`；ALWAYS `initMobileNav/initHomepageInnovation/initFlagVideo`
7. `RedCardGen.init()`
8. 仅 changzheng：`RedLongMarch.init()`

**changzheng 是特殊沉浸页，三处 gate 都要照顾**：app.js 跳过 chat/dark/quiz、pages.initCommon 跳过背景音乐、app.js 单独 initLongMarch。改滚动/跳转/自动行军前先读 `longmarch.js` 的 onScroll + scrollToStation + `cz-theater.js` theaterLock 三处协作（防滚动锁死/跳站被吞）。

## 数据层（data.js 唯一权威缓存）

- `data.js` 是唯一缓存（loadJSON 内存 Promise 缓存；失败返回 `[]` 且删缓存可重试；makeObjectLoader 校验非空对象才缓存）。`venue-store.js` 只做薄门面，**不要另建第二份场馆缓存**（防 split-brain）。
- 场馆合并 = 15 核心（venues.json，数字 id 1-15）+ 22 候选按名去重（撞核心/5 别名即静默丢弃；2026-08-12 已剔除 9 个死候选）→ 17 扩展（id = `'ext-短省名'`）= **32 个**。
- 扩展场馆坐标**只来自** `extended-venues-meta.json`（meta.coordinates），不新开坐标源。
- **id 一律 `String(v.id) === String(id)` 比较**（详情查找/地图弹窗/收藏/点赞/卡片 data-id）。
- 9 个 JSON：venues / province-candidates / venue-aliases / extended-venues-meta / venue-details（**name 为键**，getVenueDetail 带别名映射）/ policies / practices / reflections / china.json（ECharts GeoJSON）。

## Storage key 契约（不发明新 key）

- localStorage：`redguide_favs`（收藏，string[]）、`redguide_dark`（'1'/'0'）
- sessionStorage：`redguide_likes_delta_<id>`（点赞**用户增量** canonical；practices.json 的编造基数仅作展示基线，不写入存储）、旧 `redguide_likes_<id>`/`redguide_likecount_<id>`（仅迁移兼容）、`redguide_messages`（留言 ≤50 unshift）、`bgmusic_time/playing/volume`、`entrance_done_v2`、`redguide_quiz`（知识挑战赛**断点续答**：题目题号/当前题/得分/答案，整轮完成才清）、`redguide_chat`（聊天历史：机器人消息存 **innerHTML**，恢复时经 `chat.sanitizeBotHtml` 白名单净化防篡改注入）
- 点赞/留言 = sessionStorage（关标签清零）；收藏/深色 = localStorage（持久）。不要把点赞挪到 localStorage。

## CSS 设计系统（8 文件 + 令牌纪律）

- 分工：base（令牌/reset/全局 keyframes/reduce 块）、home（共享页头/导航/按钮/hero，**每页加载**）、components（搜索/卡片/地图/空态）、pages（详情/政策/实践/留言/音乐/页脚/分页/toast）、widgets（响应式/聊天/答题/移动底栏）、effects（打印/焦点/主图/lightbox/纪念卡/时间线）、dark（深色覆盖）、changzheng（仅长征页）。
- **每页固定加载顺序 `base→home→components→pages→widgets→effects→dark`（dark 必须最后）**，changzheng 末尾追加 changzheng.css。
- 令牌纪律（`tests/design-tokens` 强制）：间距 px 必须 4 的倍数；border-radius 只取 `{0,4,6,8,10,14,20,999}px / 50% / var(--radius-*)`；≤0.6s 时长走 `--transition/--duration-*`；font-size ≥12px；颜色一律令牌不写裸 hex。
- 深色模式：`html.dark` 类（documentElement 非 body）+ localStorage `redguide_dark` + 每页 head 反 FOUC 内联脚本。dark.css 必须最后加载。
- 新增令牌 = base.css `:root` 定义 + dark.css `html.dark` 同名覆盖**双份**（含 changzheng 的 `--cz-*`，否则 `changzheng-dark` 测试红）。
- **红底文字用 `--on-primary`，禁用 `--white`**（深色下 `--white` = #1e293b 表面色）。

## 测试契约（改数据/样式前先读对应测试）

- 数据形状硬约束（`tests/data.test.js` 正则+eval 断言精确声明形状）：quizData 恰 30 题×4 选项；heatmap `OFFICIAL_ATTRACTIONS` 31 省求和恰 300（新疆=12，港澳台 0）；venues.json 恰 15 项、坐标 lat 15-55/lng 70-140；china.json 34 命名要素 + 末位无名南海诸岛；extended-venues-meta 键 ⊆ 候选且不撞核心/别名。
- data-action 闭环：每个 data-action 值必须有 switch case。
- CSS：令牌刻度 / 8 个语义令牌收敛（base + dark 双份）/ dark-mode 对比度 ≥4.5:1 / keyframes ≥5 个文件（reduced-motion）。
- 全站禁 emoji（仅 ★✕✦☰ 排版符号，用 `js/icons.js` 的 icon()）。
- 死文件禁令：`common.js` / `features.js` / `styles.css` 已删，引用即 audit 红；勿重建 `venues.csv` / `coordinateMap`。
- smoke 契约：7 页（/ 与 /pages/ 下 6 页）加载零 JS 异常/零同源资源失败。

## 已拍板延期项（用户决定暂不修复，勿主动改，除非演示场景变化）

- ~~热力图掺水~~ **已修复**（2026-08-11 改为官方《全国红色旅游经典景区名录》300 处分省数据，勿再改计数）。
- 收藏无列表页（localStorage 有 redguide_favs，但全站无收藏集合/管理视图）。
- 留言墙 15 条演示留言直接上线（`isDemo` 不过滤、保留"演示"徽章）；practices 点赞数为编造值（2026-08-12 起**存储改存用户增量** `redguide_likes_delta_<id>`，编造基数仅作展示基线不再写入权威存储；虚构数值本身仍保留）。
- 长征 17 站中 13 站无"探访"链接（合并 32 场馆中无同名馆，按钮静默不渲染）。
- AI 聊天"离线可用"名不副实（venuesCache 空时所有问题回"场馆数据正在加载中…"）。
- 场馆坐标无 WGS-84→GCJ-02 转换，画在高德瓦片/导航上约 200-500m 偏移。
- 音乐跨页"续播"仍按位置重载（浏览器自动播放策略限制，跨页无法无手势自动播放）；2026-08-14 已优化为预加载 + 无手势试播 + 被拦截时恢复横幅引导（`.music-resume-hint`），但"完全无缝持续播放"需 SPA 化，未做。

## 已知坑速查

- 实践页**有**视频卡片功能（2026-08-12 从 git 历史恢复）：`practices.json` 的 practice-2/8 带 `video` 字段，卡片渲染 `has-video-badge` 脉动徽章 + `play-btn` 播放按钮，弹窗 `.video-modal-overlay` 经 `modals.openPracticeVideo` 使用（data-action `open-practice-video`/`close-practice-video`）。改 practice 卡片渲染/弹窗时不要丢视频分支。
- detail 页为**单主图**（`.detail-photo-img`，2026-08-13 由陈旧的 `.detail-carousel-img` 改名），轮播已删（2026-08-12 移除 carousel.js），勿再引用 carousel 相关类/模块。
- detail 返回链接经 `buildGuideBackLink()` 从 sessionStorage `redguide_guide_filters` 恢复导览筛选状态（search/province/category/page），无记录才回 `guide.html`；地图筛选/搜索不再强制 `fitBounds` 重置视口（`guide-map.js` 的 userMoved 守卫：用户手动缩放/平移后保持）。
- guide-map 暴露 `invalidateSize()`：容器显隐/跨断点 resize 后须调用（移动端切地图视图、resize 分支已接），否则瓦片错位/空白。
- chat-engine 区域查询用 `matchRegion()` **数据驱动**提取地区名（非通配正则），改聊天地域逻辑先读它；省份名统一经 `utils.stripProvinceSuffix`。
- 移动端滚动"卡片错乱成同一张/重复"是 **Chrome Android 合成器**问题（headless 软件光栅化复现不了）：`body` 在 `(hover:none)` 下已改 `background-attachment:scroll`；普通页面卡面/页头**禁用 backdrop-filter**（不透明背景上 blur 无意义且养合成层——导览卡角标、页头、详情侧栏卡的 blur 移除即为此）。别在卡片/页头上重新加 backdrop-filter。
- 导览卡移动端（≤860px）隐藏地区角标（140px 图放不下"类别+地区"两个角标，地区在卡身 card-meta 显示）；`.guide-map-sticky` 移动端须 `margin-top:0`（桌面 160px 是给 sticky 让位）。
- 长征页移动端（≤768px）右上路线图 `.cz-route-wrap` 已隐藏（`display:none`，JS 基于 viewBox 坐标不受影响），跳站靠印章/小剧场/HUD；移动端笺纸卡已紧凑化（照片隐藏、宽 `min(360px,60vw)`、左右偏移 ±36），改笺纸定位须保持相邻间隙 ≥24px 且 padding/margin 对齐 4px 网格。
- 场馆坐标 lat=0 会被当缺失（`plotVenuesOnMap` 过滤 `v.coordinates.lat && v.coordinates.lng`）。
- showToast 用 innerHTML：只传常量文案，**禁传用户输入**。
- 所有动态文本 `escapeHtml/escapeAttr` + URL `sanitizeUrl`（留言 sessionStorage 回填是存储型 XSS 面）。
- server.js：默认 :9876、无 SPA fallback、404 掉 dotfiles/node_modules；浏览器代码勿引用 server.js/node 文件。
- 服务端路径：`data/` JSON、`assets/`、`templates/`、`sw.js` 必须随部署一起带上（CI 的 _site 打包已包含；build-site.js 固定文件清单含 sw.js）。
- 首页纪念卡走 `renderHomeCard`（剪纸「赓续血脉」版），详情页/长征入口走 `renderCard`（证书版）——按 `currentVenueName` 是否为空分流，改卡面别动错分支。
- hero 背景轮播图清单单源在页面容器 `[data-hero-images]`（首页 + 全国导览 + 实践成果页），改轮播图改该属性即可。
- music.js 跨页续播恢复系统：`_autoResumeTried`/`_resumeBanner` 等 `let` 状态**必须在 `initBgMusic` 函数顶部声明**（2026-08-14 踩坑：放函数中部时，`attemptAutoResume()` 在 `if (wasPlaying)` 分支早期调用触发 TDZ ReferenceError，中断整个播放器初始化——按钮/滑条/手势监听全失效，页面看似正常）。改恢复逻辑时不要把这些 `let` 挪回函数中部。
- sw.js（Service Worker，2026-08-14 新增）：离线可用 + 资源缓存。带 `?v=` 的 js/css 缓存优先、导航网络优先离线回退首页、图片/data stale-while-revalidate、跨源（CDN 字体/高德瓦片）不缓存。**版本由资源 URL 的 `?v=` 驱动，无需 bump 同步 sw.js**（它不在 js/ 下、不挂 `?v=`）。e2e 测试（smoke/interactions）已 block Service Worker 避免缓存旧资源干扰。
- 首页时间线「漫漫长路」（2026-08-15 重设计，告别"一根横线"）：`.tl-route` SVG 蜿蜒山路由 `js/timeline.js` 的 `buildRoute()` 动态生成（红色 `route-base` + 金色 `route-lit` 两层 path），节点按同一条正弦曲线经 `--tl-off` 变量定 Y 偏移（波形参数在 buildRoute：`baseY=28`/`amp=13`/`wavelength=240`，改波形改那里；reduce-motion 时 amp=0 退化水平线）。「走过之路点亮」靠 `route-lit` 的 `stroke-dasharray` 从起点延伸到激活节点（`litTo(idx)`，showEvent 内调用）；resize 跨 860px 断点会重建。终点 1964 金星（`.tl-node:last-child .tl-dot` clip-path 五角星）。时间线已**退出 feature-stage 3D**（`feature-stage.js` 的 `ITEM_SELECTOR` 只含 `.feature-card`，勿把 `.timeline-scroll` 加回去）。画卷底框在 `.timeline-scroll`（红金边框/宣纸淡底/圆角）。
- 子页 hero 白色渐变陷阱（2026-08-15）：`.subpage-hero::before` 渐变终点若用 `var(--bg)` 浅色不透明收尾，会把图片下缘整片盖成白光（曾踩坑）。**渐变终点只能用黑色系或 transparent，不能用浅色**；标题贴底（`flex-end`）需压暗时用黑色半透明罩。用户已取消整图压暗，金字可读性靠 `.subpage-hero-content::before` 局部暗晕衬托（radial-gradient 暗底）。
- 亮色调 hero 图（policy/message 页，avgLum≈165/179）：hero 加 `hero-bright` 类整图 0.25 黑罩（`.subpage-hero.hero-bright::before`）。新增页面若 hero 图偏亮（avgLum>150）须加此类，暗调图不用。
