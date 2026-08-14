/* ============================================================
   赓续血脉・数绘红旅 — 页面控制器层 (Pages)
   职责：6 个页面（首页/导览/详情/政策/实践/留言）的初始化编排 + 点赞
   约束：只做"页面装配"，共享 UI 原子来自 ui/music/icons/heatmap；
         依赖 data/renderers/utils；被 app.js（autoInit）与 action-delegate.js（likePractice）引用
   ============================================================ */

import { loadJSON, loadAllVenues, filterVenues, getProvinces, getCategories, getVenueDetail } from './data.js?v=2026081515';
import { renderVenueCard, renderPracticeCard, renderMessageCard, renderPagination, renderSkeletonGrid, applyMessageCardStyles } from './renderers.js?v=2026081515';
import { getBasePath, safeAssetSrc, fallbackSrc, escapeHtml, escapeAttr, sanitizeUrl, safeStorage, likeDeltaKey, isPracticeLiked, isHomePage } from './utils.js?v=2026081515';
import { $, showToast, copyShareLink, bindImageFallbacks, initNavigation, initBackToTop, initCurtainTransition, initViewTransitions, initHeaderScroll, initScrollAnimations, initContextMenuBlock } from './ui.js?v=2026081515';
import { initBgMusic } from './music.js?v=2026081515';
import { icon } from './icons.js?v=2026081515';
import { initHomeHeatmap } from './heatmap.js?v=2026081515';
import { createGuideMap } from './guide-map.js?v=2026081515';
import { isFavorite } from './favorites.js?v=2026081515';

/* 导览页控制器暴露给 action-delegate 的私有动作（委托只分派，不碰页面闭包状态） */
let _guideCtx = null;

/* ---------- 分页公共助手（四个页面控制器复用，消除页码解析与跳转回调的四处拷贝） ---------- */
function normalizePage(raw, totalPages) {
  let page = parseInt(raw, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  return Math.min(page, totalPages || 1);
}
function navigateToPage(paramName) {
  return (newPage) => {
    const url = new URL(location.href);
    url.searchParams.set(paramName, newPage);
    location.href = url.toString();
  };
}
/* 分页切片公共助手：页码归一化 + 切片（消除四个控制器重复的 totalPages/page/pageItems 三行） */
function pagedSlice(items, pageSize, paramName) {
  const totalPages = Math.ceil(items.length / pageSize);
  const page = normalizePage(new URLSearchParams(location.search).get(paramName) || '1', totalPages);
  return { page, totalPages, pageItems: items.slice((page - 1) * pageSize, page * pageSize) };
}
/* 分页整页重载（navigateToPage → location.href）后锚定到列表区：仅当 URL 携带 page>1 时滚动到首个 .section。
   scrollRestoration='manual' 下重载停在顶部，不锚定用户会掉到列表上方空白 */
function anchorToListIfPaged(paramName) {
  const page = parseInt(new URLSearchParams(location.search).get(paramName) || '1', 10);
  if (page <= 1) return;
  requestAnimationFrame(function () {
    const sec = document.querySelector('.section');
    if (!sec) return;
    try { sec.scrollIntoView({ block: 'start' }); } catch (e) { sec.scrollIntoView(); }
  });
}
/* 详情页"返回导览"：尽量恢复进入详情前的导览筛选状态（无记录则回导览首页） */
function buildGuideBackLink() {
  let url = 'guide.html';
  try {
    const f = JSON.parse(sessionStorage.getItem('redguide_guide_filters') || 'null');
    if (f && typeof f === 'object') {
      const p = new URLSearchParams();
      if (f.search) p.set('search', f.search);
      if (f.province && f.province !== 'all') p.set('province', f.province);
      if (f.category && f.category !== 'all') p.set('category', f.category);
      if (f.page && f.page > 1) p.set('page', f.page);
      const qs = p.toString();
      if (qs) url += '?' + qs;
    }
  } catch (e) { }
  return url;
}

/* ---------- 点赞：权威存储只记用户增量 redguide_likes_delta_<id>（存在即已赞）；
   practices.json 编造基数仅作展示基线，不写入存储；旧 redguide_likes_<id>/redguide_likecount_<id> 仅迁移兼容 ---------- */
function likePractice(el, id) {
  const countEl = el.querySelector('.like-count');
  if (!countEl) return;
  if (isPracticeLiked(id)) {
    // 已赞过：确保高亮态存在（防弹窗新渲染的副本未带 active）
    el.classList.add('active');
    el.setAttribute('aria-pressed', 'true');
    el.style.transform = 'scale(0.9)';
    setTimeout(() => el.style.transform = '', 150);
    return;
  }
  // 写入权威增量（键存在即已赞，无需读-改-写算术——isPracticeLiked 已保证首次进入）
  const wrote = safeStorage.set(likeDeltaKey(id), 1, sessionStorage);
  if (!wrote) {
    // 写失败：回滚 UI，避免界面高亮与存储发散（与 favorites 的写失败契约一致）
    showToast('点赞保存失败，请检查浏览器存储');
    return;
  }
  const newCount = parseInt(countEl.textContent, 10) + 1;
  countEl.textContent = newCount;
  // 已赞保持高亮：红心填充 + 红色药丸
  el.classList.add('active');
  el.setAttribute('aria-pressed', 'true');
  // 同步更新页面上相同实践的所有点赞数（卡片+弹窗；统一用 data-action 选择器覆盖两种类名）
  const allLikes = document.querySelectorAll('[data-action="like-practice"]');
  allLikes.forEach(function (like) {
    // 通过 data-id 精确匹配，避免 practice-1 与 practice-10 子串误匹配
    if (like.dataset.id === id) {
      like.classList.add('active');
      like.setAttribute('aria-pressed', 'true');
      const c = like.querySelector('.like-count');
      if (c && c !== countEl) c.textContent = newCount;
    }
  });
  el.style.transform = 'scale(1.2)';
  setTimeout(() => el.style.transform = '', 200);
}

/* ---------- 页面私有动作（归属页面控制器，action-delegate 只做派发不碰页面 DOM） ---------- */
// 详情页"复制分享链接"：读 #detail-name（详情页私有标题）
function copyShareLinkFromDetail() {
  copyShareLink($('#detail-name')?.textContent || '');
}
// 留言页"重置表单"：读写 #message-form-card/#msg-form（留言页私有 DOM）
function resetMessageForm() {
  const fc = document.getElementById('message-form-card');
  if (!fc) return;
  const body = fc.querySelector('.form-body');
  const success = fc.querySelector('.form-success');
  const form = document.getElementById('msg-form');
  if (body) body.classList.remove('is-hidden');
  if (success) success.classList.remove('show');
  if (form) form.reset();
}

/* ---------- 留言表单 ---------- */
function initMessageForm() {
  const form = $('#msg-form');
  const formCard = $('#message-form-card');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const author = ($('#msg-author')?.value || '').trim();
    const title = ($('#msg-title')?.value || '').trim();
    const content = ($('#msg-content')?.value || '').trim();
    if (!author || !title || !content) {
      showToast('请填写所有必填字段');
      return;
    }
    if (content.length < 20) {
      showToast('心得内容请至少填写20个字');
      return;
    }

    // 前端模拟提交（时间戳用本地时间，与预设留言 reflections.json 的本地时制一致，避免 UTC 差 8 小时）
    const now = new Date();
    const pad2 = n => String(n).padStart(2, '0');
    const submitTime = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()) + ' ' + pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    const newMsg = {
      id: Date.now(),
      title,
      author,
      className: ($('#msg-class')?.value || ''),  // 选填，未选不编造班级
      studentId: ($('#msg-studentid')?.value || '***'),
      content,
      submitTime,
      status: 'pending',
      isDemo: false
    };

    // 保存到 sessionStorage（被篡改为非数组时按空数组重建，避免静默丢消息却显示成功）
    const rawStored = safeStorage.get('redguide_messages', [], sessionStorage);
    const stored = Array.isArray(rawStored) ? rawStored : [];
    stored.unshift(newMsg);
    const wrote = safeStorage.set('redguide_messages', stored.slice(0, 50), sessionStorage);
    if (!wrote) {
      // 写失败：不渲染成功 UI（与 likePractice/favorites 的写失败契约一致）
      showToast('留言保存失败，请检查浏览器存储');
      return;
    }

    // 印章动画
    const submitBtn = form.querySelector('.form-submit');
    if (submitBtn) {
      const rect = submitBtn.getBoundingClientRect();
      const stamp = document.createElement('div');
      stamp.className = 'submit-stamp';
      stamp.innerHTML = '<span class="stamp-star">★</span><span class="stamp-text">已收录</span>';
      stamp.style.left = (rect.left + rect.width / 2) + 'px';
      stamp.style.top = (rect.top + rect.height / 2 - 30) + 'px';
      document.body.appendChild(stamp);
      setTimeout(function () { stamp.remove(); }, 800);
    }

    // 稍后显示成功
    setTimeout(function () {
      if (formCard) {
        const formBody = formCard.querySelector('.form-body');
        if (formBody) formBody.classList.add('is-hidden');
        const successEl = formCard.querySelector('.form-success');
        if (successEl) successEl.classList.add('show');
      }
    }, 350);

    // 提交后回到第 1 页展示新留言（否则在 msg_page>1 上提交，新留言落在第 1 页但当前页看不见）
    const msgUrl = new URL(location.href);
    msgUrl.searchParams.delete('msg_page');
    try { window.history.replaceState({}, '', msgUrl.toString()); } catch (e) { }
    // 刷新留言列表
    refreshMessageList();
  });
}

async function refreshMessageList() {
  const container = $('#message-list-container');
  if (!container) return;

  // 加载预设数据
  let preset;
  try { preset = await loadJSON('data/reflections.json'); } catch (e) { preset = []; }
  // 加载用户提交的
  let userSubmitted = safeStorage.get('redguide_messages', [], sessionStorage);
  if (!Array.isArray(userSubmitted)) userSubmitted = [];
  // 过滤掉被篡改的非对象项，避免后续渲染异常
  userSubmitted = userSubmitted.filter(m => m && typeof m === 'object');

  const all = [...userSubmitted, ...(preset || [])];

  let html = '';
  const pageSize = 4;
  const { page: currentPage, pageItems } = pagedSlice(all, pageSize, 'msg_page');

  if (pageItems.length === 0) {
    html = '<div class="empty-state"><div class="empty-icon">' + icon('chat') + '</div><h3>暂无留言</h3><p>快来写下你的学习感悟吧！</p></div>';
  } else {
    html = pageItems.map(m => renderMessageCard(m)).join('');
    html += renderPagination(all.length, pageSize, currentPage, '.message-list', navigateToPage('msg_page'));
  }

  container.innerHTML = html;
  applyMessageCardStyles(container);
  anchorToListIfPaged('msg_page');
}

/* ---------- 公共 UI 装配 ---------- */
async function initCommon() {
  initNavigation();
  initBackToTop();
  initCurtainTransition();
  initViewTransitions();
  initHeaderScroll();
  initScrollAnimations();
  // 长征沉浸页自带环境音开关（cz-sound-toggle），跳过全局背景音乐，避免双音频控件并存
  if (!location.pathname.includes('changzheng')) {
    initBgMusic();
  }
  initContextMenuBlock();
}

/* ---------- 页面控制器 ---------- */

// 首页
async function initHomePage() {
  await initCommon();

  // 加载数据（loadJSON 内部已容错，仅 loadAllVenues 可能抛错，捕获避免 unhandled rejection）
  let venues = [], practices = [], reflections = [];
  try {
    [venues, practices, reflections] = await Promise.all([
      loadAllVenues(),
      loadJSON('data/practices.json'),
      loadJSON('data/reflections.json')
    ]);
  } catch (err) {
    console.warn('[Pages] 首页数据加载失败', err);
    showToast('数据加载失败，请刷新重试');
  }

  // 更新统计数据
  const provinceCount = getProvinces(venues).length;
  const categoryCount = getCategories(venues).length;
  const practiceCount = practices.length;
  const reflectionCount = reflections.length;

  const statProvinces = $('#stat-provinces');
  const statCategories = $('#stat-categories');
  const statPractices = $('#stat-practices');
  const statReflections = $('#stat-reflections');

  if (statProvinces) statProvinces.textContent = provinceCount > 0 ? provinceCount + '+' : '0';
  if (statCategories) statCategories.textContent = categoryCount > 0 ? categoryCount : '0';
  if (statPractices) statPractices.textContent = practiceCount > 0 ? practiceCount + '+' : '0';
  if (statReflections) statReflections.textContent = reflectionCount > 0 ? reflectionCount + '+' : '0';

  // 初始化热力图（数据为官方名录分省统计，不再依赖本站场馆）
  initHomeHeatmap();
}

// 导览页
async function initGuidePage() {
  await initCommon();
  const container = $('#venue-grid');
  const mapContainer = $('#map-container');
  if (!container) return;

  // 骨架屏
  renderSkeletonGrid(8, 'venue-grid');

  let venues = [];
  try {
    venues = await loadAllVenues();
  } catch (err) {
    console.warn('[Pages] 导览数据加载失败', err);
    showToast('场馆数据加载失败，请刷新重试');
  }
  const provinces = getProvinces(venues);
  const categories = getCategories(venues);

  // 读取 URL 参数（用于初始化搜索/筛选状态）
  const initParams = new URLSearchParams(location.search);
  const initSearch = initParams.get('search') || '';
  const initProvince = initParams.get('province') || 'all';
  const initCategory = initParams.get('category') || 'all';

  // 填充筛选下拉
  const provinceSelect = $('#filter-province');
  const categorySelect = $('#filter-category');
  if (provinceSelect) {
    provinceSelect.innerHTML = '<option value="all">全部地区</option>' +
      provinces.map(p => `<option value="${escapeHtml(p)}" ${p === initProvince ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
  }
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="all">全部类别</option>' +
      categories.map(c => `<option value="${escapeHtml(c)}" ${c === initCategory ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
  }

  const searchInput = $('#search-input');
  if (searchInput && initSearch) searchInput.value = initSearch;

  // ---- 地图功能 ----
  const guideMapCtrl = createGuideMap(mapContainer);
  const toggleBtn = $('#toggle-view-btn');
  const guideMapEl = document.querySelector('.guide-map');
  const guideList = document.querySelector('.guide-list');
  let isMobile = window.matchMedia('(max-width: 860px)').matches;
  let mapVisible = !isMobile;

  // 移动端初始隐藏地图列
  if (isMobile && guideMapEl) {
    guideMapEl.classList.add('is-hidden');
    if (toggleBtn) toggleBtn.classList.remove('is-hidden');
  }

  // 跨 860px 断点响应：避免"加载时一次性判定"导致 resize 后布局与地图初始化状态永久错配
  let _respTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(_respTimer);
    _respTimer = setTimeout(async () => {
      const nowMobile = window.matchMedia('(max-width: 860px)').matches;
      if (nowMobile === isMobile) return;
      isMobile = nowMobile;
      if (isMobile) {
        // 桌面→移动：回列表视图，隐藏地图列，显示切换按钮
        mapVisible = false;
        if (guideMapEl) guideMapEl.classList.add('is-hidden');
        if (guideList) guideList.classList.remove('is-hidden');
        if (toggleBtn) {
          toggleBtn.classList.remove('is-hidden');
          toggleBtn.classList.remove('map-active');
          toggleBtn.innerHTML = icon('map') + ' 地图视图';
        }
      } else {
        // 移动→桌面：恢复桌面初始布局（列表+地图双栏、切换按钮隐藏），避免"仅地图"死态
        mapVisible = true;
        if (guideMapEl) guideMapEl.classList.remove('is-hidden');
        if (guideList) guideList.classList.remove('is-hidden');
        if (toggleBtn) toggleBtn.classList.add('is-hidden');
        await guideMapCtrl.initMap();
        guideMapCtrl.invalidateSize();
        // 地图新初始化后立即绘制场馆标记（此前只 initMap 不 plot，resize 后地图空白无星星）
        doRender(false, true);
      }
    }, 150);
  });

  // 卡片 hover → marker 联动
  container.addEventListener('mouseover', function (e) {
    const card = e.target.closest('.venue-card');
    if (!card) return;
    const id = card.dataset.id;
    if (id) guideMapCtrl.highlightMarker(id);
  });
  container.addEventListener('mouseleave', function (e) {
    const card = e.target.closest('.venue-card');
    if (!card || !e.relatedTarget || !e.relatedTarget.closest('.venue-card')) {
      guideMapCtrl.highlightMarker(null); // null → 全部复位默认图标
    }
  });

  // 移动端切换按钮（经 data-action 委托分派：guideToggleViewFromDelegate → 本函数）
  async function toggleGuideView() {
    mapVisible = !mapVisible;
    if (toggleBtn) {
      toggleBtn.innerHTML = mapVisible ? icon('list') + ' 列表视图' : icon('map') + ' 地图视图';
      toggleBtn.classList.toggle('map-active', mapVisible);
    }
    if (guideMapEl) guideMapEl.classList.toggle('is-hidden', !mapVisible);
    if (guideList) guideList.classList.toggle('is-hidden', mapVisible);
    const pagContainer = document.getElementById('pagination-container');
    if (pagContainer) pagContainer.classList.toggle('is-hidden', mapVisible);
    if (mapVisible) {
      await guideMapCtrl.initMap();
      guideMapCtrl.invalidateSize();
      doRender(false, true);
    }
  }

  // ---- 渲染函数（支持 URL 同步） ----
  function syncURL(query, province, category, page) {
    const url = new URL(location.href);
    if (query) url.searchParams.set('search', query); else url.searchParams.delete('search');
    if (province && province !== 'all') url.searchParams.set('province', province); else url.searchParams.delete('province');
    if (category && category !== 'all') url.searchParams.set('category', category); else url.searchParams.delete('category');
    if (page && page > 1) url.searchParams.set('page', page); else url.searchParams.delete('page');
    // file:// 或受限环境下 replaceState 可能抛错，不能中断渲染
    try { window.history.replaceState({}, '', url.toString()); } catch (e) { }
    // 记录当前筛选，供详情页"返回导览"恢复筛选状态
    try { sessionStorage.setItem('redguide_guide_filters', JSON.stringify({ search: query, province, category, page: page > 1 ? page : null })); } catch (e) { }
  }

  function doRender(resetPage, mapOnly) {
    const query = searchInput ? searchInput.value : '';
    const province = provinceSelect ? provinceSelect.value : 'all';
    const category = categorySelect ? categorySelect.value : 'all';
    const filtered = filterVenues(venues, { query: query, province: province, category: category });

    // 地图始终更新（桌面端）；mapOnly 短路必须在 isReady 之外，
    // 否则地图未就绪（Leaflet CDN 挂）时 mapOnly 会落到下方去渲染一个已被隐藏的列表
    if (guideMapCtrl.isReady()) {
      guideMapCtrl.plotVenuesOnMap(filtered);
    }
    if (mapOnly) return;

    // URL 同步
    const pageSize = 9;
    const { page, pageItems } = pagedSlice(filtered, pageSize, resetPage ? '' : 'page');
    syncURL(query, province, category, resetPage ? 1 : page);
    const countEl = $('#result-count');
    if (countEl) countEl.innerHTML = '共找到 <strong>' + filtered.length + '</strong> 个场馆，点击卡片可查看场馆详细介绍。';

    if (pageItems.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">' + icon('search') + '</div><h3>未找到匹配的场馆</h3><p>请尝试调整搜索条件或筛选选项</p></div>';
    } else {
      container.innerHTML = pageItems.map(function (v) { return renderVenueCard(v, undefined, isFavorite(v.id)); }).join('');
      bindImageFallbacks(container);
    }

    const pagContainer = $('#pagination-container');
    if (pagContainer) {
      pagContainer.innerHTML = renderPagination(filtered.length, pageSize, page, '#pagination-container', navigateToPage('page'));
    }
  }

  function render(resetPage) { doRender(resetPage, false); }

  // 事件监听
  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') render(true);
    });
    // 搜索按钮经 data-action 委托分派（guideSearchFromDelegate → _guideCtx.render）
  }
  if (provinceSelect) provinceSelect.addEventListener('change', function () { render(true); });
  if (categorySelect) categorySelect.addEventListener('change', function () { render(true); });

  // 桌面端立即加载地图，移动端按需加载
  if (!isMobile) {
    await guideMapCtrl.initMap();
  }
  render();
  // 首次加载带 ?page>1 时锚定到列表区（后续筛选/搜索渲染不重复滚动）
  anchorToListIfPaged('page');
  // 暴露私有动作给 action-delegate 分派（搜索 / 切换地图视图）
  _guideCtx = { render, toggleGuideView };
}

// 详情页
async function initDetailPage() {
  await initCommon();
  const container = $('#detail-container');
  if (!container) return;

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">' + icon('help') + '</div><h3>未指定场馆</h3><p>请从导览页面选择一个场馆查看详情</p></div>';
    return;
  }

  let venues = [];
  try {
    venues = await loadAllVenues();
  } catch (err) {
    console.warn('[Pages] 详情数据加载失败', err);
    showToast('场馆数据加载失败，请刷新重试');
    // 数据源整体失败：与"id 无效"区分开，给可重试的空态而非误导性的"场馆未找到"
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">' + icon('search') + '</div><h3>场馆数据加载失败</h3><p>请刷新页面重试</p></div>';
    return;
  }
  const venue = venues.find(v => String(v.id) === String(id));

  if (!venue) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">' + icon('search') + '</div><h3>场馆未找到</h3><p>该场馆可能已被移除或链接无效</p></div>';
    return;
  }

  const bp = getBasePath();
  const imgSrc = safeAssetSrc(venue.image, bp);
  const fb = fallbackSrc();
  const detail = getVenueDetail(venue.name);

  // 生成详细描述
  const detailedDesc = venue.summary
    ? `${venue.summary}\n\n该场馆作为${venue.province}重要的红色文化教育基地，承载着丰富的革命历史记忆。参观者可以在此深入了解中国共产党领导人民进行革命斗争的光辉历程，感受革命先辈的崇高精神和坚定信念。`
    : '暂无详细描述。';

  // 更新页面 hero 背景（图加载失败时兜底占位图）
  const heroBg = $('#detail-hero-bg');
  if (heroBg) {
    heroBg.src = imgSrc;
    heroBg.onerror = function () { this.onerror = null; this.src = fb; };
  }

  // 更新标题和副标题
  const titleEl = $('#detail-name');
  if (titleEl) titleEl.textContent = venue.name;
  const subtitleEl = $('#detail-subtitle');
  if (subtitleEl) subtitleEl.textContent = `${venue.province} · ${venue.city || ''} · ${venue.category}`;

  // 历史背景和教育意义
  const historyText = detail?.history || `${venue.name}是${venue.province}具有重要历史意义的红色文化地标。这里记录着中国共产党和中国人民在革命、建设和改革各个历史时期的光辉足迹，是传承红色基因、弘扬革命精神的重要场所。场馆通过丰富的文物、图片、史料和现代化展陈手段，生动再现了那段波澜壮阔的历史。`;
  const educationText = detail?.education || `作为爱国主义教育基地和红色旅游经典景区，${venue.name}在开展党史学习教育、革命传统教育和爱国主义教育方面发挥着重要作用。每一位到访者都能在这里汲取精神力量，坚定理想信念。`;

  // 详情主图（单主图；图集能力曾为数据 gallery 字段启用，现无数据源使用，已移除避免死代码）
  const detailImageHtml = `
      <div class="detail-photo">
        <img class="detail-photo-img" src="${escapeAttr(safeAssetSrc(venue.image, bp))}" alt="${escapeHtml(venue.name)} 图片" loading="lazy" data-fallback="${escapeAttr(fb)}">
      </div>
    `;

  const detailNavHtml = `
      <div class="detail-action-bar">
        <a href="${buildGuideBackLink()}" class="action-back">← 返回导览列表</a>
        <div class="action-right">
          <button class="action-btn" data-action="open-cardgen" data-name="${escapeHtml(venue.name)}" data-image="${escapeAttr(sanitizeUrl(venue.image))}" title="生成红色纪念卡">${icon('card')} 纪念卡</button>
          <button class="action-btn" data-action="copy-share-link" title="复制分享链接">${icon('link')} 分享</button>
          <button class="action-btn btn-print" data-action="print-page" title="打印场馆详情">${icon('print')} 打印</button>
        </div>
      </div>`;

  const html = `
      <div class="detail-layout">
        <div class="detail-main">
          ${detailNavHtml}
          ${detailImageHtml}
          <div class="detail-body">
            <div class="detail-tags">
              <span class="tag-category">${escapeHtml(venue.category || '红色场馆')}</span>
              <span class="tag-province">${icon('pin')} ${escapeHtml(venue.province || '')} ${escapeHtml(venue.city || '')} ${escapeHtml(venue.district || '')}</span>
            </div>
            <h2>${escapeHtml(venue.name)}</h2>
            <div class="detail-location">${icon('pin')} ${escapeHtml(venue.province || '')} ${escapeHtml(venue.city || '')} ${escapeHtml(venue.district || '')}</div>
            <div class="detail-desc">${escapeHtml(detailedDesc)}</div>
            <div class="detail-section">
              <h3>${icon('scroll')} 历史背景</h3>
              <p>${escapeHtml(historyText)}</p>
            </div>
            <div class="detail-section">
              <h3>${icon('target')} 教育意义</h3>
              <p>${escapeHtml(educationText)}</p>
            </div>
          </div>
        </div>
        <div class="detail-sidebar">
          <div class="sidebar-card">
            <h3>${icon('clipboard')} 场馆信息</h3>
            <div class="info-row"><span class="info-label">名称</span><span class="info-value">${escapeHtml(venue.standardName || venue.name)}</span></div>
            <div class="info-row"><span class="info-label">地区</span><span class="info-value">${escapeHtml(venue.province || '')} ${escapeHtml(venue.city || '')}</span></div>
            <div class="info-row"><span class="info-label">类别</span><span class="info-value">${escapeHtml(venue.category || '红色场馆')}</span></div>
            <div class="info-row"><span class="info-label">信息核验</span><span class="info-value">${escapeHtml(venue.officialVerificationStatus || '待核验')}</span></div>
          </div>
          ${venue.officialUrl ? `
          <div class="sidebar-card">
            <h3>${icon('link')} 官方链接</h3>
            <a class="official-link" href="${escapeAttr(sanitizeUrl(venue.officialUrl))}" target="_blank" rel="noopener">${icon('globe')} ${escapeHtml(venue.officialLinkType || '官方网站')}</a>
          </div>` : ''}
          ${(venue.author || venue.license || venue.sourcePage) ? `
          <div class="sidebar-card">
            <h3>图片来源与许可</h3>
            ${venue.author ? `<div class="info-row"><span class="info-label">作者</span><span class="info-value">${escapeHtml(venue.author)}</span></div>` : ''}
            ${venue.license ? `<div class="info-row"><span class="info-label">许可</span><span class="info-value">${escapeHtml(venue.license)}</span></div>` : ''}
            ${venue.sourcePage ? `<a class="official-link official-link-spaced" href="${escapeAttr(sanitizeUrl(venue.sourcePage))}" target="_blank" rel="noopener">${icon('globe')} 图片来源链接</a>` : ''}
          </div>` : ''}
          <div class="sidebar-card">
            <h3>${icon('map')} 位置信息</h3>
            ${venue.coordinates && venue.coordinates.lat && venue.coordinates.lng
      ? `<a class="amap-static-card" href="https://uri.amap.com/marker?position=${venue.coordinates.lng},${venue.coordinates.lat}&name=${encodeURIComponent(venue.name)}" target="_blank">
            <div class="amap-static-map">
              <span class="amap-static-pin">${icon('pin')}</span>
              <span class="amap-static-label">在高德地图中查看</span>
              <span class="amap-static-address">${escapeHtml(venue.province)} ${escapeHtml(venue.city || '')} ${escapeHtml(venue.district || '')}</span>
            </div>
          </a>`
      : `<div class="map-placeholder">${icon('pin')} ${escapeHtml(venue.province || '')} ${escapeHtml(venue.city || '')} ${escapeHtml(venue.district || '')}<br><small>详细地址请以官方发布为准</small></div>`
    }
          </div>
        </div>
      </div>
    `;

  container.innerHTML = html;
  bindImageFallbacks(container);
}

// 时事政策页
async function initPolicyPage() {
  await initCommon();
  const container = $('#policy-list');
  if (!container) return;

  let policies;
  try { policies = await loadJSON('data/policies.json'); } catch (e) { policies = []; }
  // 按日期从晚到早排列（最新政策在前，符合资讯阅读习惯；拷贝排序避免原地修改 loadJSON 缓存数组）
  policies = [...policies].sort(function (a, b) {
    return (b.publishedAt || '').localeCompare(a.publishedAt || '');
  });

  const bp = getBasePath();
  const fb = fallbackSrc();

  // 分页：5条/页
  const pageSize = 5;
  const { page, pageItems, totalPages } = pagedSlice(policies, pageSize, 'page');

  let html = pageItems.map(function (p) {
    const imgSrc = p.image ? safeAssetSrc(p.image, bp) : (bp + 'assets/页面通用图片/时事政策模块封面.webp');
    const hasUrl = p.url && p.url.trim();
    const pubDate = p.publishedAt || '';
    return `
        <div class="policy-row">
          <div class="policy-timeline">
            <span class="policy-date-badge">${escapeHtml(pubDate)}</span>
            <span class="policy-dot"></span>
          </div>
          <div class="policy-card">
            <div class="policy-img">
              <img src="${escapeAttr(sanitizeUrl(imgSrc))}" alt="${escapeHtml(p.title)}" loading="lazy" data-fallback="${escapeAttr(fb)}">
            </div>
            <div class="policy-info">
              <h3>${escapeHtml(p.title)}</h3>
              <p class="policy-summary">${escapeHtml(p.summary || '')}</p>
              <div class="policy-meta">
                <span class="policy-source">${escapeHtml(p.source || '未知来源')}</span>
              </div>
            </div>
            ${hasUrl ? `
            <div class="policy-link">
              <a href="${escapeAttr(sanitizeUrl(p.url))}" target="_blank" rel="noopener">阅读全文 →</a>
            </div>` : ''}
          </div>
        </div>
      `;
  }).join('');

  // 分页（拼进同一 innerHTML，避免 += 重解析整列表导致 bindImageFallbacks 的图片回退失效）
  if (totalPages > 1) {
    html += renderPagination(policies.length, pageSize, page, '.policy-list', navigateToPage('page'));
  }
  container.innerHTML = html;
  bindImageFallbacks(container);
  anchorToListIfPaged('page');
}

// 实践成果页
async function initPracticePage() {
  await initCommon();
  const container = $('#practice-grid');
  if (!container) return;

  let practices;
  try { practices = await loadJSON('data/practices.json'); } catch (e) { practices = []; }

  const bp = getBasePath();
  const pageSize = 6;
  const { page, pageItems, totalPages } = pagedSlice(practices, pageSize, 'page');

  container.innerHTML = pageItems.map(p => renderPracticeCard(p, bp)).join('');
  bindImageFallbacks(container);

  const pagContainer = $('#pagination-container');
  if (pagContainer && totalPages > 1) {
    pagContainer.innerHTML = renderPagination(practices.length, pageSize, page, '#pagination-container', navigateToPage('page'));
  }
  anchorToListIfPaged('page');
}

// 留言墙页
async function initMessagePage() {
  await initCommon();
  await refreshMessageList();
  initMessageForm();
}

/* ---------- 自动页面检测 ---------- */
async function autoInit() {
  const path = location.pathname;

  if (isHomePage()) {
    await initHomePage();
  } else if (path.includes('guide.html')) {
    await initGuidePage();
  } else if (path.includes('detail.html')) {
    await initDetailPage();
  } else if (path.includes('policy.html')) {
    await initPolicyPage();
  } else if (path.includes('practice.html')) {
    await initPracticePage();
  } else if (path.includes('message.html')) {
    await initMessagePage();
  } else {
    await initCommon();
  }
}

/* action-delegate 分派入口：导览页搜索 / 地图视图切换（_guideCtx 为空时 no-op，非导览页不报错） */
function guideSearchFromDelegate() { if (_guideCtx) _guideCtx.render(true, false); }
function guideToggleViewFromDelegate() { if (_guideCtx) _guideCtx.toggleGuideView(); }

export { autoInit, likePractice, copyShareLinkFromDetail, resetMessageForm, guideSearchFromDelegate, guideToggleViewFromDelegate };
