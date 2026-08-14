# 更新日志 (Changelog)

「赓续血脉・数绘红旅」shanhexu 的版本演进记录。版本号为 `js/version.js` 的 `ASSET_VERSION`（缓存破击号，格式 `YYYYMMDDNN`，NN 为当日递增序号）。

---

## 2026-08-14 · v2026081426 — 全站代码审查修复 + 背景音乐续播优化 + 黄麻起义主图更换

**全面代码审查修复（12 批次 56 文件，契约测试 40→41 项）**：
- 数据：15 条核心场馆 summary 从开发者备注改为用户向文案；红旗渠渡槽 152→151（权威数据）；九一八史实表述修正；practices 错别字；policies 重排日期倒序
- 聊天引擎：compare 正则贪心吞左操作数、类别查询示例落空、知识库 4 条缺场馆后缀否定（均实测复现修复）；pumpReplies 队列 try/finally；恢复链接强制 rel=noopener
- 长征页：cz-sound 首次开启不 resume（iOS/Safari 无声）、resize 印章 active 丢失、Escape 空态拦截、纪念卡代际防"重开旧卡"、粒子去每帧径向渐变 + 运行期响应 reduced-motion
- 导览地图：userMoved 被首次 fitBounds 污染、Leaflet 未就绪重试、marker 颜色令牌化
- 页面层：导览页搜索/视图切换改走 data-action 委托（16→18 case）、留言存储篡改不再静默丢、heatmap fetch 超时 + MutationObserver 节流
- 无障碍：答题反馈 aria-live、点赞/收藏 aria-pressed、图库键盘可达、focus-trap 排除 visibility:hidden
- 性能/安全：favorites 缓存、hero-carousel 无配置页不注册监听、server.js 拦截嵌套 node_modules + 补安全头
- 测试工具链：design-tokens transition delay 误判修正、emoji-clean 补 U+23F3 区段并扫 json/css、audit 根绝对报错 + 排除 tests、e2e 热力图不再假通过、data.test 新增 4 个 JSON 形状契约

**背景音乐续播优化**：跨页改为预加载（currentTime 定位 + load() 预缓冲）+ 无手势自动试播；被浏览器拦截时弹恢复横幅（`.music-resume-hint`）引导一键恢复，替代此前静默失败；修复恢复系统 `let` 状态 TDZ ReferenceError（函数中部声明会中断播放器整体初始化）

**黄麻起义主图**：详情页主图更换为「黄麻起义额外图片.webp」

## 2026-08-13 · v2026081320 — 长征终点成就弹窗 + 音乐按钮移动端适配

- **长征终点成就弹窗（`.cz-complete`）**：此前零移动端适配——184px 大圆像 + 长段落 + 按钮内容 ~670px 高，超过 URL 栏收起的手机有效视口，且弹窗无 `overflow-y`、居中溢出裁顶部，"领取长征纪念卡"按钮被裁且够不到。容器改 `align-items:flex-start` + `overflow-y:auto`，inner 用 `margin:auto` 双轴居中；≤768px 圆像 184→120px、文字/间距收紧。实测：844px 全可见；390×560 短视口可滚动、按钮可达
- **移动端音乐按钮白底矩形框**：点按触发 sticky-hover 让 `.music-player:hover` 渲染白底+边框+阴影+左 padding（音量滑条已隐藏，hover 无可展开内容），手机上看成一个长方形底框。修复：移动端压平 `.music-player:hover`（透明/无边框/无阴影/无 padding）；实测点击后保持 44px 透明圆钮

## 2026-08-13 · v2026081319 — 长征页移动端取消右上路线图窗口

- 用户决定：手机端（≤768px）隐藏右上角迷你路线图（`.cz-route-wrap`，fixed 小窗遮挡路线/印章）
- 安全性：`buildMiniRoute`/`updateMiniRoute` 全基于 viewBox 坐标，`display:none` 下不读客户端尺寸、不报错；跳站仍可经印章/小剧场/HUD 完成
- 实测：移动端隐藏、桌面（≥1024px）保留、17 圆点/17 笺纸照常构建、零 JS 错误

## 2026-08-13 · v2026081318 — 长征页移动端笺纸卡紧凑化（不再互相遮挡）

- **问题**：手机端 17 张笺纸卡 280-299px 宽 × 365-400px 高（占半屏），相邻站（站距 330px）卡间仅 ~9px 空隙再被随机倾斜 ±4° 吃掉，Playwright 实测 **8 对相邻卡全部像素重叠**（站3×站4 重叠 13×367px）
- **修复**（≤1023 定位块 + ≤768 手机块）：
  - 卡宽 `70vw` → `min(360px, 60vw)`（390px 屏 ~245px），左右偏移 `±24` → `±36`，相邻间隙 -8px → **+24px**
  - 卡高 ~380px → ~270px：照片在移动端隐藏（实景照小剧场已有）、头部/诗句/事件/文物图标全面收紧（字体、行距、内边距）
  - 所有 padding/margin 保持 4px 网格（设计令牌纪律）
- 实测 17 站笺纸卡重叠归零；桌面 ≥1024px 布局不受影响

## 2026-08-13 · v2026081317 — 详情页侧栏卡滚动错乱修复（漏网 blur 合成层）

- **详情页"滑动时三张侧栏卡（场馆信息/官方链接/位置信息）变成同一张"**：与导览列表卡同源——Chrome Android 合成器滚动错绘。v1315 清了列表角标 blur，但详情侧栏卡 `backdrop-filter: blur(12px)` 是漏网常驻 blur 层
- 修复：删除 `.detail-sidebar .sidebar-card` 的 blur(12px)（背景是不透明 `--card-bg`，blur 物理上无可虚化，纯白养合成层，零视觉损失）；至此普通页面（首页/导览/详情/实践/政策/留言）**再无任何常驻 backdrop-filter**，仅剩聊天面板/答题遮罩/导航帷幕等瞬态弹层与长征沉浸页

## 2026-08-13 · v2026081316 — 修复 v1315 引入的 body 规则截断回归

- **回归**：v1315 在 body 规则中段插入 `@media (hover:none)` 时，把 `font-family`/`line-height`/`-webkit-font-smoothing` 和收尾 `}` 挤成了规则外孤立声明，被 CSS 解析器丢弃 → **全站 body 字体丢失**，浏览器默认链接样式漏出（页头「红」图标旁的品牌按钮「赓续血脉」出现蓝/紫下划线 + 默认字体渲染异常）
- 修复：body 规则恢复完整闭合，`@media (hover:none)` 移到完整规则之后；8 个 CSS 文件花括号全部平衡，Playwright 实测 `.brand` 无下划线、body 字体恢复 Noto Sans SC、页头无任何带下划线的链接

## 2026-08-13 · v2026081315 — 移动端滚动"整页卡片标签错乱成同一场馆"合成器修复

- **根因**：非数据/非 JS——多场景 Playwright（390/360/768/1280 × 拖拽/滚动 × URL 栏收起 resize）证实 DOM 卡片标签全部各异且 **0 次重渲染**，headless 软件光栅化无法复现；用户真实手机（GPU 合成器）上 Chrome Android 的合成器把错误卡片的纹理画到所有卡片上，滚动时换源 → "整页同时变成同一场馆的类别+地区、随滚动再变另一个"
- **修复（削减移动端常驻合成层）**：
  - `body { background-attachment: fixed }`（base + dark）在 `@media (hover:none)` 触屏下改 `scroll`——fixed 背景是 Chrome Android 滚动错误绘制的公认元凶
  - sticky 页头 `backdrop-filter: blur(16px)` 移除（背景本就 rgba(…,0.95) 近不透明，blur 几乎不可见，却是全宽 sticky blur 合成层）
  - 场馆卡片类别/地区角标 `backdrop-filter: blur(4px)` 移除（导览页 9 卡 ×2 = 18+ 独立 blur 层）
  - `.subpage-hero+.section::after` 全视口 `position:fixed` 装饰层在触屏下改 `absolute`
- 桌面不受影响（hover 设备保留 fixed 背景）；其余 backdrop-filter（聊天面板/答题遮罩/导航帷幕/详情侧栏/长征）均为瞬态或他页，未动

## 2026-08-13 · v2026081314 — 移动端导览卡片角标重叠修复 + CSS 语法修正

- **导览页移动端"滚动错乱"根因**：≤860px 卡片转横排后图片缩到 140px 宽，红色类别角标（左）与黑色地区角标（右）在每张卡上并排重叠 24px+（长省名如"广西壮族自治区"覆盖 72px），黑色徽章压在红色徽章上形成文字缠绕，视觉上"每张卡的地区标注都像同一个"（DOM 数据实际各异，Playwright 量测证实）
- 修复：移动端隐藏冗余的地区角标（地区已在卡身 `.card-meta` 以 📍 城市显示），只留类别角标；`.guide-map-sticky` 桌面 `margin-top:160px` 是给 sticky 让位的，移动端转 `position:static` 后未清零会在切地图视图时凭空多 160px 空隙，一并归零
- 另修：changzheng.css `font-size: 21` 缺单位（VSCode 报错）→ `21px`；注释内嵌 `*/` 提前闭合（1466 行）→ 改写为「mood-* 的 active」

## 2026-08-13 · v2026081312 — 交互测试扩到 17 项

- 新增 5 项：深色切换热力图缩放保持（heatmap 暴露 `window.__homeHeatmapChart` 供测试读缩放，ECharts 未加载时跳过）、详情页分享复制剪贴板（clipboard 权限）、详情页打印触发 window.print、导览搜索过滤、深色模式切换写 localStorage
- 交互测试累计 17 项，覆盖点赞/收藏/聊天跨页/聊天安全/答题断点/答题作答/留言提交/留言校验/地图 resize/长征跳站/长征文物弹窗/热力图缩放/详情分享/详情打印/搜索/深色

## 2026-08-13 · v2026081311 — 交互测试补全（12 项）+ 测试抓到 2 个真 bug

- 交互测试从 6 扩到 **12 项**：长征迷你地图跳站、文物弹窗 Esc、聊天安全注入拦截、收藏取消、答题作答/上一题、留言 20 字原生拦截
- **测试抓到并修复 2 个真 bug**：
  - `sanitizeBotHtml` 属性循环直接遍历活集合，`removeAttribute` 后下标错位会**跳过后续属性**——img 的 src 被移除后 `onerror` 漏网可执行（存储型注入面）
  - `.cz-note-relic` 未设 `pointer-events:auto`，继承便签的 `none`，**文物块实际点不开**
- 留言 textarea 已带 `minlength="20"`（原生拦截短提交），JS 层 toast 属冗余，测试改为断言"未提交"

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
