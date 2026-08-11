/* ============================================================
   赓续血脉・数绘红旅 — 页面控制器层 (Pages)
   职责：6 个页面（首页/导览/详情/政策/实践/留言）的初始化编排 + 点赞
   约束：只做"页面装配"，共享 UI 原子来自 ui/music/icons/heatmap；
         依赖 data/renderers/utils；被 app.js（autoInit）与 action-delegate.js（likePractice）引用
   ============================================================ */

import * as RedData from './data.js?v=2026081008';
import * as RedRenderers from './renderers.js?v=2026081008';
import { getBasePath, resolveAssetPath, fallbackSrc, escapeHtml, escapeAttr, sanitizeUrl, safeStorage } from './utils.js?v=2026081008';
import { showToast, bindImageFallbacks, initNavigation, initBackToTop, initCurtainTransition, initViewTransitions, initHeaderScroll, initScrollAnimations, initContextMenuBlock } from './ui.js?v=2026081008';
import { initBgMusic } from './music.js?v=2026081008';
import { icon } from './icons.js?v=2026081008';
import { initHomeHeatmap } from './heatmap.js?v=2026081008';

const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

/* ---------- 数据层引用（委托给 RedData 纯数据模块） ---------- */
const loadJSON = (...a) => RedData.loadJSON(...a);
const loadAllVenues = (...a) => RedData.loadAllVenues(...a);
const filterVenues = (...a) => RedData.filterVenues(...a);
const getProvinces = (...a) => RedData.getProvinces(...a);
const getCategories = (...a) => RedData.getCategories(...a);

/* ---------- 渲染函数（委托给 RedRenderers 模块） ---------- */
const renderVenueCard = (venue, bp) => RedRenderers.renderVenueCard(venue, bp);
const renderPracticeCard = (practice, bp) => RedRenderers.renderPracticeCard(practice, bp);
const renderMessageCard = (msg) => RedRenderers.renderMessageCard(msg);
const renderPagination = (total, size, page, selector, fn) => RedRenderers.renderPagination(total, size, page, selector, fn);
const renderSkeletonGrid = (count, id) => RedRenderers.renderSkeletonGrid(count, id);

/* ---------- 点赞（统一 key：redguide_likes_<id> 存计数；旧 redguide_likecount_<id> 仅作迁移兼容） ---------- */
function likePractice(el, id) {
  const countEl = el.querySelector('.like-count');
  if (!countEl) return;
  const key = 'redguide_likes_' + id;
  const legacyKey = 'redguide_likecount_' + id;
  try {
    const liked = sessionStorage.getItem(key) != null || sessionStorage.getItem(legacyKey) != null;
    if (liked) {
      // 已赞过：确保高亮态存在（防弹窗新渲染的副本未带 active）
      el.classList.add('active');
      el.style.transform = 'scale(0.9)';
      setTimeout(() => el.style.transform = '', 150);
      return;
    }
  } catch (e) { }
  const newCount = parseInt(countEl.textContent) + 1;
  countEl.textContent = newCount;
  // 已赞保持高亮：红心填充 + 红色药丸
  el.classList.add('active');
  // 同步更新页面上相同实践的所有点赞数（卡片+弹窗；统一用 data-action 选择器覆盖两种类名）
  const allLikes = document.querySelectorAll('[data-action="like-practice"]');
  allLikes.forEach(function (like) {
    // 通过 data-id 精确匹配，避免 practice-1 与 practice-10 子串误匹配
    if (like.dataset.id === id) {
      like.classList.add('active');
      const c = like.querySelector('.like-count');
      if (c && c !== countEl) c.textContent = newCount;
    }
  });
  // 存下最新数值（统一 key，并清理旧的独立计数 key）
  try { sessionStorage.setItem(key, String(newCount)); sessionStorage.removeItem(legacyKey); } catch (e) { }
  el.style.transform = 'scale(1.2)';
  setTimeout(() => el.style.transform = '', 200);
}

/* ---------- 图片轮播（详情页内部使用） ---------- */
function initCarousel(total) {
  const carouselEl = $('.detail-carousel');
  const track = $('.carousel-track', carouselEl);
  const prevBtn = $('.carousel-prev', carouselEl);
  const nextBtn = $('.carousel-next', carouselEl);
  // 限定在当前轮播内部，避免将来页面新增轮播时串扰
  const dots = $$('.carousel-dot', carouselEl);
  const counter = $('.carousel-counter', carouselEl);
  if (!track || !prevBtn || !nextBtn) return;

  let current = 0;
  let autoplayTimer = null;

  function showSlide(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    if (counter) counter.textContent = `${current + 1} / ${total}`;
  }

  function next() { showSlide(current + 1); }
  function prev() { showSlide(current - 1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  const dotHandlers = dots.map(dot => {
    const handler = () => showSlide(parseInt(dot.dataset.index));
    dot.addEventListener('click', handler);
    return { dot, handler };
  });

  function startAutoplay() {
    autoplayTimer = setInterval(next, 5000);
  }
  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  track.addEventListener('mouseenter', stopAutoplay);
  track.addEventListener('mouseleave', startAutoplay);
  prevBtn.addEventListener('mouseenter', stopAutoplay);
  nextBtn.addEventListener('mouseenter', stopAutoplay);

  startAutoplay();

  // 返回清理函数，供页面卸载时调用
  return function destroy() {
    stopAutoplay();
    prevBtn.removeEventListener('click', prev);
    nextBtn.removeEventListener('click', next);
    dotHandlers.forEach(({ dot, handler }) => dot.removeEventListener('click', handler));
    track.removeEventListener('mouseenter', stopAutoplay);
    track.removeEventListener('mouseleave', startAutoplay);
    prevBtn.removeEventListener('mouseenter', stopAutoplay);
    nextBtn.removeEventListener('mouseenter', stopAutoplay);
  };
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

    // 前端模拟提交
    const newMsg = {
      id: Date.now(),
      title,
      author,
      className: ($('#msg-class')?.value || '计算机2026级'),
      studentId: ($('#msg-studentid')?.value || '***'),
      content,
      submitTime: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'pending',
      isDemo: false
    };

    // 保存到 sessionStorage
    const stored = safeStorage.get('redguide_messages', [], sessionStorage);
    if (Array.isArray(stored)) {
      stored.unshift(newMsg);
      safeStorage.set('redguide_messages', stored.slice(0, 50), sessionStorage);
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
  const totalPages = Math.ceil(all.length / pageSize);
  let currentPage = parseInt(new URLSearchParams(location.search).get('msg_page') || '1', 10);
  if (!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;
  if (currentPage > (totalPages || 1)) currentPage = totalPages || 1;

  const start = (currentPage - 1) * pageSize;
  const pageItems = all.slice(start, start + pageSize);

  if (pageItems.length === 0) {
    html = '<div class="empty-state"><div class="empty-icon">' + icon('chat') + '</div><h3>暂无留言</h3><p>快来写下你的学习感悟吧！</p></div>';
  } else {
    html = pageItems.map(m => renderMessageCard(m)).join('');
    html += renderPagination(all.length, pageSize, currentPage, '.message-list', (page) => {
      const url = new URL(location.href);
      url.searchParams.set('msg_page', page);
      location.href = url.toString();
    });
  }

  container.innerHTML = html;
  RedRenderers.applyMessageCardStyles(container);
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
  let leafletMap = null;
  let venueMarkerMap = {}; // venue.id → marker 映射
  const toggleBtn = $('#toggle-view-btn');
  const guideMap = document.querySelector('.guide-map');
  const guideList = document.querySelector('.guide-list');
  const isMobile = window.matchMedia('(max-width: 860px)').matches;
  let mapVisible = !isMobile;

  // 移动端初始隐藏地图列
  if (isMobile && guideMap) {
    guideMap.classList.add('is-hidden');
    if (toggleBtn) toggleBtn.classList.remove('is-hidden');
  }

  async function initMap() {
    if (leafletMap) return;
    // guide.html 已通过 <script defer> 静态加载 Leaflet（同一 CDN），此处无需再动态注入兜底
    if (!window.L || !mapContainer) return;
    leafletMap = L.map(mapContainer, {
      center: [35, 110],
      zoom: 3.4,
      minZoom: 3.4,
      maxBounds: [[10, 60], [55, 155]],
      maxBoundsViscosity: 0.8
    });
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
      attribution: '© 高德地图'
    }).addTo(leafletMap);
  }

  // 默认五角星 marker
  function makeDefaultIcon() {
    return L.divIcon({
      className: 'red-star-marker',
      html: '<div class="rsm-inner"><svg width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 20,12 31,13 23,20 25,30 16,24 7,30 9,20 1,13 12,12" fill="#b91c1c" stroke="#7f1d1d" stroke-width="0.5"/></svg><div class="rsm-shadow"></div></div>',
      iconSize: [32, 38],
      iconAnchor: [16, 36],
      popupAnchor: [0, -38]
    });
  }

  // 金色高亮 marker
  function makeHighlightIcon() {
    return L.divIcon({
      className: 'red-star-marker marker-highlight',
      html: '<div class="rsm-inner"><svg width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 20,12 31,13 23,20 25,30 16,24 7,30 9,20 1,13 12,12" fill="#e8a820" stroke="#b91c1c" stroke-width="0.8"/></svg><div class="rsm-shadow"></div></div>',
      iconSize: [38, 45],
      iconAnchor: [19, 43],
      popupAnchor: [0, -43]
    });
  }

  function plotVenuesOnMap(filteredVenues) {
    if (!leafletMap) return;
    // 先收集再移除，避免在 eachLayer 迭代过程中修改 _layers 集合导致部分 marker 残留
    const staleMarkers = [];
    leafletMap.eachLayer(layer => {
      if (layer instanceof L.Marker) staleMarkers.push(layer);
    });
    staleMarkers.forEach(layer => leafletMap.removeLayer(layer));
    venueMarkerMap = {};
    const withCoords = filteredVenues.filter(function (v) { return v.coordinates && v.coordinates.lat && v.coordinates.lng; });
    if (withCoords.length === 0) return;

    const defIcon = makeDefaultIcon();
    const hlIcon = makeHighlightIcon();

    withCoords.forEach(function (v) {
      const marker = L.marker([v.coordinates.lat, v.coordinates.lng], { icon: defIcon })
        .bindPopup('<b>' + escapeHtml(v.name) + '</b><br>' + escapeHtml(v.province) + ' ' + escapeHtml(v.city || '') + '<br><a href="' + escapeAttr(getBasePath() + 'pages/detail.html?id=' + encodeURIComponent(v.id)) + '">查看详情 →</a>');
      marker.addTo(leafletMap);
      venueMarkerMap[String(v.id)] = { marker: marker, def: defIcon, hl: hlIcon };
    });

    const allMarkers = Object.values(venueMarkerMap).map(function (m) { return m.marker; });
    if (allMarkers.length > 0) {
      const group = L.featureGroup(allMarkers);
      leafletMap.fitBounds(group.getBounds().pad(0.15), { maxZoom: 6 });
    }
  }

  function highlightMarker(venueId) {
    Object.keys(venueMarkerMap).forEach(function (k) {
      venueMarkerMap[k].marker.setIcon(venueMarkerMap[k].def);
      venueMarkerMap[k].marker.setZIndexOffset(0);
    });
    const entry = venueMarkerMap[String(venueId)];
    if (entry) {
      entry.marker.setIcon(entry.hl);
      entry.marker.setZIndexOffset(1000);
    }
  }

  // 卡片 hover → marker 联动
  container.addEventListener('mouseover', function (e) {
    const card = e.target.closest('.venue-card');
    if (!card) return;
    const id = card.dataset.id;
    if (id) highlightMarker(id);
  });
  container.addEventListener('mouseleave', function (e) {
    const card = e.target.closest('.venue-card');
    if (!card || !e.relatedTarget || !e.relatedTarget.closest('.venue-card')) {
      Object.keys(venueMarkerMap).forEach(function (k) {
        venueMarkerMap[k].marker.setIcon(venueMarkerMap[k].def);
        venueMarkerMap[k].marker.setZIndexOffset(0);
      });
    }
  });

  // 移动端切换按钮
  if (toggleBtn) {
    toggleBtn.addEventListener('click', async function () {
      mapVisible = !mapVisible;
      toggleBtn.innerHTML = mapVisible ? icon('list') + ' 列表视图' : icon('map') + ' 地图视图';
      toggleBtn.classList.toggle('map-active', mapVisible);
      if (guideMap) guideMap.classList.toggle('is-hidden', !mapVisible);
      if (guideList) guideList.classList.toggle('is-hidden', mapVisible);
      const pagContainer = document.getElementById('pagination-container');
      if (pagContainer) pagContainer.classList.toggle('is-hidden', mapVisible);
      if (mapVisible) {
        await initMap();
        doRender(false, true);
      }
    });
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
  }

  function doRender(resetPage, mapOnly) {
    const query = searchInput ? searchInput.value : '';
    const province = provinceSelect ? provinceSelect.value : 'all';
    const category = categorySelect ? categorySelect.value : 'all';
    const filtered = filterVenues(venues, { query: query, province: province, category: category });

    // 地图始终更新（桌面端）
    if (leafletMap) {
      plotVenuesOnMap(filtered);
      if (mapOnly) return;
    }

    // URL 同步
    const pageSize = 9;
    const rawPage = resetPage ? 1 : parseInt(new URLSearchParams(location.search).get('page') || '1', 10);
    const currentPage = (Number.isFinite(rawPage) && rawPage > 0) ? rawPage : 1;
    const totalPages = Math.ceil(filtered.length / pageSize);
    const page = Math.min(currentPage, totalPages || 1);
    syncURL(query, province, category, page);

    const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
    const countEl = $('#result-count');
    if (countEl) countEl.innerHTML = '共找到 <strong>' + filtered.length + '</strong> 个场馆，点击卡片可查看场馆详细介绍。';

    if (pageItems.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">' + icon('search') + '</div><h3>未找到匹配的场馆</h3><p>请尝试调整搜索条件或筛选选项</p></div>';
    } else {
      container.innerHTML = pageItems.map(function (v) { return renderVenueCard(v); }).join('');
      bindImageFallbacks(container);
    }

    const pagContainer = $('#pagination-container');
    if (pagContainer) {
      pagContainer.innerHTML = renderPagination(filtered.length, pageSize, page, '#pagination-container', function (newPage) {
        const url = new URL(location.href);
        url.searchParams.set('page', newPage);
        location.href = url.toString();
      });
    }
  }

  function render(resetPage) { doRender(resetPage, false); }

  // 事件监听
  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') render(true);
    });
    const guideSearchBtn = $('#guide-search-btn');
    if (guideSearchBtn) {
      guideSearchBtn.addEventListener('click', function () { render(true); });
    }
  }
  if (provinceSelect) provinceSelect.addEventListener('change', function () { render(true); });
  if (categorySelect) categorySelect.addEventListener('change', function () { render(true); });

  // 桌面端立即加载地图，移动端按需加载
  if (!isMobile) {
    await initMap();
  }
  render();
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
  }
  const venue = venues.find(v => String(v.id) === String(id));

  if (!venue) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">' + icon('search') + '</div><h3>场馆未找到</h3><p>该场馆可能已被移除或链接无效</p></div>';
    return;
  }

  const bp = getBasePath();
  const imgSrc = resolveAssetPath(venue.image, bp);
  const fb = fallbackSrc();
  const detail = RedData.getVenueDetail(venue.name);

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

  // 构建轮播图片数组（主图 + gallery）
  const carouselImages = [venue.image].concat(detail?.gallery || []).concat(venue.gallery || []);
  const uniqueCarousel = [...new Set(carouselImages.filter(Boolean))];
  const hasMultipleImages = uniqueCarousel.length > 1;

  // 历史背景和教育意义
  const historyText = detail?.history || `${venue.name}是${venue.province}具有重要历史意义的红色文化地标。这里记录着中国共产党和中国人民在革命、建设和改革各个历史时期的光辉足迹，是传承红色基因、弘扬革命精神的重要场所。场馆通过丰富的文物、图片、史料和现代化展陈手段，生动再现了那段波澜壮阔的历史。`;
  const educationText = detail?.education || `作为爱国主义教育基地和红色旅游经典景区，${venue.name}在开展党史学习教育、革命传统教育和爱国主义教育方面发挥着重要作用。每一位到访者都能在这里汲取精神力量，坚定理想信念。`;

  // 构建轮播HTML
  const carouselHtml = `
      <div class="detail-carousel">
        <div class="carousel-track">
          ${uniqueCarousel.map((img, idx) => `
            <div class="carousel-slide ${idx === 0 ? 'active' : ''}" data-index="${idx}">
              <img src="${escapeAttr(sanitizeUrl(resolveAssetPath(img, bp)))}" alt="${escapeHtml(venue.name)} 图片${idx + 1}" loading="lazy" data-fallback="${escapeAttr(fb)}">
            </div>
          `).join('')}
        </div>
        ${hasMultipleImages ? `
        <button class="carousel-prev" aria-label="上一张">‹</button>
        <button class="carousel-next" aria-label="下一张">›</button>
        <div class="carousel-indicators">
          ${uniqueCarousel.map((_, idx) => `
            <button class="carousel-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="切换到第${idx + 1}张"></button>
          `).join('')}
        </div>
        ` : ''}
        <div class="carousel-counter">${uniqueCarousel.length > 0 ? `1 / ${uniqueCarousel.length}` : ''}</div>
      </div>
    `;

  const detailNavHtml = `
      <div class="detail-action-bar">
        <a href="guide.html" class="action-back">← 返回导览列表</a>
        <div class="action-right">
          <button class="action-btn" data-action="open-card-gen" data-name="${escapeHtml(venue.name)}" data-image="${escapeAttr(sanitizeUrl(venue.image))}" title="生成红色纪念卡">${icon('card')} 纪念卡</button>
          <button class="action-btn" data-action="copy-share-link" title="复制分享链接">${icon('link')} 分享</button>
          <button class="action-btn btn-print" data-action="print-page" title="打印场馆详情">${icon('print')} 打印</button>
        </div>
      </div>`;

  const html = `
      <div class="detail-layout">
        <div class="detail-main">
          ${detailNavHtml}
          ${carouselHtml}
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
            ${venue.sourcePage ? `<a class="official-link official-link-spaced" href="${escapeAttr(sanitizeUrl(venue.sourcePage))}" target="_blank" rel="noopener">${icon('globe')} 图片来源</a>` : ''}
          </div>` : ''}
          <div class="sidebar-card">
            <h3>${icon('map')} 位置信息</h3>
            ${venue.coordinates && venue.coordinates.lat
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

  // 初始化轮播
  if (hasMultipleImages) {
    const destroyCarousel = initCarousel(uniqueCarousel.length);
    if (destroyCarousel) {
      window.addEventListener('pagehide', destroyCarousel, { once: true });
    }
  }
}

// 时事政策页
async function initPolicyPage() {
  await initCommon();
  const container = $('#policy-list');
  if (!container) return;

  let policies;
  try { policies = await loadJSON('data/policies.json'); } catch (e) { policies = []; }
  // 按日期从早到晚排列（拷贝排序，避免原地修改 loadJSON 缓存数组）
  policies = [...policies].sort(function (a, b) {
    return (a.publishedAt || '').localeCompare(b.publishedAt || '');
  });

  const bp = getBasePath();
  const fb = fallbackSrc();

  // 分页：5条/页
  const pageSize = 5;
  const totalPages = Math.ceil(policies.length / pageSize);
  let currentPage = parseInt(new URLSearchParams(location.search).get('page') || '1', 10);
  if (!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;
  const page = Math.min(currentPage, totalPages || 1);
  const pageItems = policies.slice((page - 1) * pageSize, page * pageSize);

  const html = pageItems.map(function (p) {
    const imgSrc = p.image ? resolveAssetPath(p.image, bp) : (bp + 'assets/页面通用图片/时事政策模块封面.webp');
    const hasUrl = p.url && p.url.trim();
    const pubDate = p.publishedAt || '';
    return `
        <div class="policy-row">
          <div class="policy-timeline">
            <span class="policy-date-badge">${pubDate}</span>
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

  container.innerHTML = html;
  bindImageFallbacks(container);

  // 分页
  if (totalPages > 1) {
    container.innerHTML += renderPagination(policies.length, pageSize, page, '.policy-list', function (newPage) {
      const url = new URL(location.href);
      url.searchParams.set('page', newPage);
      location.href = url.toString();
    });
  }
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
  const params = new URLSearchParams(location.search);
  let currentPage = parseInt(params.get('page') || '1', 10);
  if (!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;
  const totalPages = Math.ceil(practices.length / pageSize);
  const page = Math.min(currentPage, totalPages || 1);
  const pageItems = practices.slice((page - 1) * pageSize, page * pageSize);

  container.innerHTML = pageItems.map(p => renderPracticeCard(p, bp)).join('');
  bindImageFallbacks(container);

  const pagContainer = $('#pagination-container');
  if (pagContainer && totalPages > 1) {
    pagContainer.innerHTML = renderPagination(practices.length, pageSize, page, '#pagination-container', (newPage) => {
      const url = new URL(location.href);
      url.searchParams.set('page', newPage);
      location.href = url.toString();
    });
  }
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

  if (path.endsWith('/') || path.endsWith('index.html')) {
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

export { autoInit, likePractice };
