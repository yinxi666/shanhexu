/* ============================================================
   赓续血脉・数绘红旅 — 公共脚本
   数据加载 / 搜索筛选 / 动态渲染 / 交互逻辑
   ============================================================ */

window.RedGuide = (() => {
  /* ---------- 基础工具 ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  function getBasePath() {
    const path = location.pathname;
    if (path.includes('/pages/')) return '../';
    return '';
  }

  /** 安全拼接资源路径 — 处理绝对路径 /assets/… 和相对路径 */
  function resolveAssetPath(imagePath, basePath) {
    const bp = basePath || getBasePath();
    const fallback = bp + 'assets/页面通用图片/暂无图片.png';
    if (!imagePath) return fallback;
    if (/^https?:\/\//.test(imagePath)) return imagePath;
    // 已是以 / 开头的绝对路径（从服务器根目录），直接使用
    if (imagePath.startsWith('/')) return imagePath;
    return bp + imagePath;
  }

  function fallbackSrc() {
    const bp = getBasePath();
    return bp + 'assets/页面通用图片/暂无图片.png';
  }

  /* ---------- 数据层引用（委托给 RedData 纯数据模块） ---------- */
  const loadJSON = (...a) => RedData.loadJSON(...a);
  const loadAllVenues = (...a) => RedData.loadAllVenues(...a);
  const filterVenues = (...a) => RedData.filterVenues(...a);
  const getProvinces = (...a) => RedData.getProvinces(...a);
  const getCategories = (...a) => RedData.getCategories(...a);

  /* ---------- 渲染函数（委托给 RedRenderers 模块） ---------- */
  const renderVenueCard = (venue, bp) => window.RedRenderers.renderVenueCard(venue, bp);
  const renderPolicyCard = (policy, bp) => window.RedRenderers.renderPolicyCard(policy, bp);
  const renderPracticeCard = (practice, bp) => window.RedRenderers.renderPracticeCard(practice, bp);
  const renderMessageCard = (msg) => window.RedRenderers.renderMessageCard(msg);
  const renderPagination = (total, size, page, selector, fn) => window.RedRenderers.renderPagination(total, size, page, selector, fn);
  const renderSkeletonGrid = (count, id) => window.RedRenderers.renderSkeletonGrid(count, id);

  /* ---------- 交互功能 ---------- */

  // 导航
  function initNavigation() {
    const navToggle = $('.nav-toggle');
    const navLinks = $('.nav-links');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        navToggle.setAttribute('aria-label', isOpen ? '收起导航' : '展开导航');
        navToggle.textContent = isOpen ? '✕' : '☰';
      });
      navLinks.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') navLinks.classList.remove('open');
      });
    }

    // 高亮当前页
    const current = location.pathname.replace(/\/$/, '') || '/index.html';
    $$('.nav-links a').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const target = href.replace(/^\.\.\//, '/').replace(/^\.\//, '/');
      const cur = current.replace(/^\/+/, '/');
      // 详情页属于导览模块，同时高亮"全国导览"
      const isDetailPage = cur.includes('/detail.html');
      const targetIsGuide = target.includes('guide.html');
      if (cur.endsWith(target) || (cur === '/index.html' && target === '/index.html') || (isDetailPage && targetIsGuide)) {
        link.classList.add('active');
      }
    });
  }

  // 返回顶部
  function initBackToTop() {
    if ($('.back-to-top')) return;
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', '返回顶部');
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          btn.classList.toggle('visible', window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // 图片轮播
  function initCarousel(total, basePath) {
    const track = $('.carousel-track');
    const prevBtn = $('.carousel-prev');
    const nextBtn = $('.carousel-next');
    const dots = $$('.carousel-dot');
    const counter = $('.carousel-counter');
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
    dots.forEach(dot => dot.addEventListener('click', () => showSlide(parseInt(dot.dataset.index))));

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
  }

  // 视频弹窗
  function openVideo(src) {
    let overlay = $('.video-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'video-modal-overlay';
      overlay.innerHTML = `
        <div class="video-modal">
          <button class="video-close" aria-label="关闭视频">✕</button>
          <video controls autoplay src=""></video>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay || e.target.classList.contains('video-close')) {
          closeVideo();
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeVideo();
      });
    }
    const video = overlay.querySelector('video');
    video.src = src;
    video.onerror = function () {
      closeVideo();
      showToast('视频加载失败');
    };
    overlay.style.zIndex = '10001';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    function closeVideo() {
      overlay.classList.remove('open');
      video.pause();
      video.src = '';
      video.onerror = null;
      document.body.style.overflow = '';
    }
  }

  // 实践成果详情弹窗
  async function openPracticeDetail(id) {
    let practices;
    try { practices = await loadJSON('data/practices.json'); } catch (e) { practices = []; }
    const p = practices.find(x => String(x.id) === String(id));
    if (!p) { showToast('未找到该实践成果'); return; }

    const bp = getBasePath();
    const imgSrc = resolveAssetPath(p.image, bp);
    const fb = fallbackSrc();

    // Build gallery HTML
    let galleryHtml = '';
    if (p.gallery && p.gallery.length > 0) {
      galleryHtml = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">' +
        p.gallery.map(g => `<img src="${resolveAssetPath(g, bp)}" style="width:120px;height:90px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="event.stopPropagation();window.RedGuide.openLightbox('${resolveAssetPath(g, bp)}')" onerror="this.onerror=null;this.src='${fb}'">`).join('') +
        '</div>';
    }

    let overlay = document.createElement('div');
    overlay.className = 'video-modal-overlay';
    overlay.id = 'practice-detail-overlay';
    overlay.innerHTML = `
      <div class="quiz-modal" style="max-width:640px;max-height:85vh;overflow-y:auto;padding:0;">
        <button class="quiz-close" style="position:sticky;top:8px;right:8px;z-index:1;float:right;" onclick="document.getElementById('practice-detail-overlay').remove();document.body.style.overflow=''">✕</button>
        <img src="${imgSrc}" alt="${p.title}" style="width:100%;aspect-ratio:16/10;object-fit:cover;" onerror="this.onerror=null;this.src='${fb}'">
        <div style="padding:24px;">
          <h2 style="margin:0 0 4px;font-size:22px;">${p.title}</h2>
          <p style="color:var(--red);font-weight:600;margin:0 0 12px;">👥 ${p.team || '实践团队'}</p>
          <p style="line-height:1.9;color:var(--ink);white-space:pre-line;">${p.summary || ''}</p>
          ${galleryHtml}
          ${p.video ? `
          <div style="margin-top:16px;">
            <button class="btn primary small" onclick="event.stopPropagation();window.RedGuide.openVideo('${resolveAssetPath(p.video, bp)}')">▶ 播放视频</button>
          </div>` : ''}
          <div style="display:flex;justify-content:space-between;margin-top:20px;padding-top:12px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);">
            <span>📅 ${p.createdAt || ''}</span>
            <span>❤️ ${p.likes || 0} 赞</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.classList.add('open');
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.remove();
        document.body.style.overflow = '';
      }
    });
  }

  // 图片灯箱
  function openLightbox(src) {
    let lb = document.createElement('div');
    lb.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;cursor:pointer;';
    lb.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;"><button style="position:absolute;top:20px;right:20px;width:40px;height:40px;border:none;background:rgba(255,255,255,0.2);color:#fff;font-size:24px;border-radius:50%;cursor:pointer;">✕</button>`;
    lb.onclick = () => lb.remove();
    document.body.appendChild(lb);
  }

  // 点赞
  function likePractice(el, id) {
    const countEl = el.querySelector('.like-count');
    if (!countEl) return;
    const key = 'redguide_likes_' + id;
    try {
      const liked = sessionStorage.getItem(key);
      if (liked) {
        el.style.transform = 'scale(0.9)';
        setTimeout(() => el.style.transform = '', 150);
        return;
      }
      sessionStorage.setItem(key, '1');
    } catch (e) {
      // sessionStorage 不可用，仅本次会话有效
    }
    const newCount = parseInt(countEl.textContent) + 1;
    countEl.textContent = newCount;
    el.style.transform = 'scale(1.2)';
    setTimeout(() => el.style.transform = '', 200);
  }

  // 跳转详情
  function goToDetail(id) {
    location.href = getBasePath() + 'pages/detail.html?id=' + encodeURIComponent(id);
  }

  // 首页搜索跳转
  function searchFromHome() {
    const input = $('#hero-search-input');
    if (!input) return;
    const query = input.value.trim();
    if (query) {
      location.href = getBasePath() + 'pages/guide.html?search=' + encodeURIComponent(query);
    } else {
      location.href = getBasePath() + 'pages/guide.html';
    }
  }

  // Toast 提示
  function showToast(message, duration = 2500) {
    let toast = $('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), duration);
  }

  /* ---------- 留言表单 ---------- */
  function initMessageForm() {
    const form = $('#msg-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const author = $('#msg-author')?.value.trim();
      const title = $('#msg-title')?.value.trim();
      const content = $('#msg-content')?.value.trim();
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
        className: $('#msg-class')?.value || '计算机2026级',
        studentId: $('#msg-studentid')?.value || '***',
        content,
        submitTime: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'pending',
        isDemo: false
      };

      // 保存到 sessionStorage
      try {
        const stored = JSON.parse(sessionStorage.getItem('redguide_messages') || '[]');
        stored.unshift(newMsg);
        sessionStorage.setItem('redguide_messages', JSON.stringify(stored.slice(0, 50)));
      } catch (e) {
        // sessionStorage 不可用，本次会话仍可显示
      }

      // 显示成功
      const formEl = $('.message-form-card');
      const successEl = $('.form-success');
      if (formEl && successEl) {
        formEl.querySelector('.form-body').style.display = 'none';
        successEl.classList.add('show');
      }

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
    let userSubmitted = [];
    try { userSubmitted = JSON.parse(sessionStorage.getItem('redguide_messages') || '[]'); } catch (e) { }

    const all = [...(userSubmitted || []), ...(preset || [])];

    let html = '';
    const pageSize = 6;
    const totalPages = Math.ceil(all.length / pageSize);
    const currentPage = parseInt(new URLSearchParams(location.search).get('msg_page') || '1');

    const start = (currentPage - 1) * pageSize;
    const pageItems = all.slice(start, start + pageSize);

    if (pageItems.length === 0) {
      html = '<div class="empty-state"><div class="empty-icon">💬</div><h3>暂无留言</h3><p>快来写下你的学习感悟吧！</p></div>';
    } else {
      html = pageItems.map(m => renderMessageCard(m)).join('');
      html += renderPagination(all.length, pageSize, currentPage, '.message-list', (page) => {
        const url = new URL(location.href);
        url.searchParams.set('msg_page', page);
        location.href = url.toString();
      });
    }

    container.innerHTML = html;
  }

  /* ---------- View Transitions 方向追踪（纯增强，不拦截导航） ---------- */
  function initViewTransitions() {
    function getPageDepth(path) {
      if (path.endsWith('/') || path.endsWith('index.html')) return 0;
      if (path.includes('detail.html')) return 2;
      return 1;
    }
    const currentDepth = getPageDepth(location.pathname);

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript')) return;

      try {
        const targetURL = new URL(href, location.href);
        if (targetURL.origin !== location.origin) return;
        const targetDepth = getPageDepth(targetURL.pathname);
        const html = document.documentElement;
        html.removeAttribute('data-vt-dir');
        if (targetDepth > currentDepth) html.setAttribute('data-vt-dir', 'forward');
        else if (targetDepth < currentDepth) html.setAttribute('data-vt-dir', 'back');
      } catch (_) { /* URL 解析失败，忽略 */ }
    });

    window.addEventListener('pageshow', () => {
      setTimeout(() => document.documentElement.removeAttribute('data-vt-dir'), 600);
    });
  }

  /* ---------- 初始化入口 ---------- */
  async function initCommon() {
    initNavigation();
    initBackToTop();
    initViewTransitions();
    initScrollAnimations();
  }

  /* ---------- 页面控制器 ---------- */

  // 首页
  async function initHomePage() {
    await initCommon();

    // 搜索框
    const searchInput = $('#hero-search-input');
    const searchBtn = $('#hero-search-btn');
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', searchFromHome);
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchFromHome();
      });
    }

    // 骨架屏
    renderSkeletonGrid(4, 'featured-venues');

    // 加载数据
    const [venues, practices, reflections] = await Promise.all([
      loadAllVenues(),
      loadJSON('data/practices.json'),
      loadJSON('data/reflections.json')
    ]);

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

    // 渲染推荐场馆
    const featuredContainer = $('#featured-venues');
    if (featuredContainer && venues.length > 0) {
      const featured = venues.slice(0, 4);
      featuredContainer.innerHTML = featured.map((v, i) => {
        return renderVenueCard(v).replace('class="venue-card"', 'class="venue-card scroll-animate scroll-animate-delay-' + (i+1) + '"');
      }).join('');
      rescanScrollAnimations();
    }

    // 最近浏览
    renderRecentChips(venues);

    // 初始化热力图
    initHomeHeatmap(venues);
  }

  // 首页热力图 - ECharts中国地图，加载失败自动降级SVG
  async function initHomeHeatmap(venues) {
    const container = $('#home-heatmap');
    if (!container) return;

    const provinceData = {};
    const provinceNames = ['北京市','天津市','河北省','山西省','内蒙古自治区','辽宁省','吉林省','黑龙江省',
      '上海市','江苏省','浙江省','安徽省','福建省','江西省','山东省','河南省','湖北省','湖南省',
      '广东省','广西壮族自治区','海南省','重庆市','四川省','贵州省','云南省','西藏自治区','陕西省','甘肃省',
      '青海省','宁夏回族自治区','新疆维吾尔自治区','香港特别行政区','澳门特别行政区','台湾省'];
    provinceNames.forEach(n => provinceData[n] = 0);

    venues.forEach(v => {
      if (!v.province) return;
      for (const name of provinceNames) {
        if (v.province.includes(name) || name.includes(v.province)) {
          provinceData[name]++; break;
        }
      }
    });

    // 等待ECharts加载后初始化
    function tryInit() {
      if (window.echarts) {
        initECharts(container, provinceData, provinceNames, venues);
      } else {
        setTimeout(tryInit, 300);
      }
    }
    setTimeout(tryInit, 200);
  }

  async function initECharts(container, provinceData, provinceNames, venues) {

    const additionalVenues = {
      '北京市': 5, '天津市': 2, '河北省': 8, '山西省': 4, '内蒙古自治区': 3,
      '辽宁省': 4, '吉林省': 3, '黑龙江省': 4, '上海市': 4, '江苏省': 6,
      '浙江省': 5, '安徽省': 4, '福建省': 5, '江西省': 10, '山东省': 5,
      '河南省': 4, '湖北省': 5, '湖南省': 7, '广东省': 6, '广西壮族自治区': 4,
      '海南省': 2, '重庆市': 4, '四川省': 6, '贵州省': 4, '云南省': 3,
      '西藏自治区': 2, '陕西省': 8, '甘肃省': 4, '青海省': 2, '宁夏回族自治区': 2,
      '新疆维吾尔自治区': 3, '香港特别行政区': 1, '澳门特别行政区': 1, '台湾省': 2
    };

    for (const [name, count] of Object.entries(additionalVenues)) {
      provinceData[name] += count;
    }

    const chartData = provinceNames.map(name => ({
      name: name,
      value: provinceData[name]
    }));

    try {
      const response = await fetch(getBasePath() + 'data/china.json');
      const mapData = await response.json();
      echarts.registerMap('china', mapData);

      const exist = echarts.getInstanceByDom(container);
      if (exist) exist.dispose();
      const chart = echarts.init(container);
      const option = {
        backgroundColor: '#ffffff',
        tooltip: {
          trigger: 'item',
          formatter: function (params) {
            return `<div style="font-weight:bold;margin-bottom:4px;">${params.name}</div>
                    <div>场馆数量：<span style="color:#b91c1c;font-weight:bold;">${params.value}</span></div>`;
          },
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          textStyle: { color: '#374151' }
        },
        visualMap: {
          min: 0,
          max: Math.max(...Object.values(provinceData)),
          left: 'left',
          top: 'bottom',
          text: ['多', '少'],
          inRange: {
            color: ['#fef3c7', '#fde68a', '#fca5a5', '#f87171', '#ef4444', '#b91c1c']
          },
          textStyle: { color: '#64748b' }
        },
        series: [{
          name: '红色场馆数量',
          type: 'map',
          map: 'china',
          roam: 'move',
          zoom: 1.7,
          center: [105, 36],
          scaleLimit: { min: 1, max: 5 },
          label: {
            show: true,
            fontSize: window.innerWidth < 768 ? 7 : 10,
            color: '#64748b'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: window.innerWidth < 768 ? 10 : 12,
              fontWeight: 'bold',
              color: '#b91c1c'
            },
            focus: 'none'
          },
          data: chartData,
          itemStyle: {
            borderColor: '#e5e7eb',
            borderWidth: 0.5,
            areaColor: '#f8fafc'
          }
        }]
      };

      chart.setOption(option);

      // 缩放按钮
      const bar = document.getElementById('heatmap-zoom-bar');
      if (bar) {
        bar.addEventListener('click', function(e) {
          const btn = e.target.closest('button');
          if (!btn) return;
          const a = btn.dataset.zoom;
          if (a === 'reset') { chart.setOption({ series: [{ zoom: 1.7, center: [105, 36] }] }); return; }
          const opt = chart.getOption();
          const cz = opt.series[0].zoom || 1.7;
          const cc = opt.series[0].center || [105, 36];
          const nz = a === 'in' ? Math.min(8, cz + 1) : Math.max(0.5, cz - 1);
          chart.setOption({ series: [{ zoom: nz, center: cc }] });
        });
      }

      window.addEventListener('resize', function () {
        chart.resize();
      });
    } catch (error) {
      createSimpleHeatmap(container, provinceData);
    }
  }

  function createSimpleHeatmap(container, provinceData) {
    const provinceMap = {
      '黑龙江': { x: 85, y: 55 }, '吉林': { x: 105, y: 65 }, '辽宁': { x: 125, y: 70 },
      '内蒙古': { x: 95, y: 90 }, '北京': { x: 135, y: 85 }, '天津': { x: 142, y: 90 },
      '河北': { x: 138, y: 95 }, '山西': { x: 128, y: 100 }, '山东': { x: 150, y: 105 },
      '河南': { x: 142, y: 115 }, '江苏': { x: 155, y: 105 }, '安徽': { x: 148, y: 115 },
      '浙江': { x: 165, y: 100 }, '福建': { x: 175, y: 110 }, '江西': { x: 158, y: 120 },
      '上海': { x: 162, y: 100 }, '湖北': { x: 145, y: 125 }, '湖南': { x: 152, y: 135 },
      '广东': { x: 172, y: 135 }, '广西': { x: 162, y: 145 }, '海南': { x: 175, y: 160 },
      '重庆': { x: 135, y: 130 }, '四川': { x: 120, y: 130 }, '贵州': { x: 140, y: 135 },
      '云南': { x: 138, y: 150 }, '西藏': { x: 85, y: 135 }, '陕西': { x: 115, y: 105 },
      '甘肃': { x: 95, y: 115 }, '青海': { x: 100, y: 130 }, '宁夏': { x: 105, y: 110 },
      '新疆': { x: 45, y: 100 }
    };

    const fullNameMap = {
      '北京': ['北京市'], '天津': ['天津市'], '河北': ['河北省'], '山西': ['山西省'],
      '内蒙古': ['内蒙古自治区'], '辽宁': ['辽宁省'], '吉林': ['吉林省'], '黑龙江': ['黑龙江省'],
      '上海': ['上海市'], '江苏': ['江苏省'], '浙江': ['浙江省'], '安徽': ['安徽省'],
      '福建': ['福建省'], '江西': ['江西省'], '山东': ['山东省'], '河南': ['河南省'],
      '湖北': ['湖北省'], '湖南': ['湖南省'], '广东': ['广东省'], '广西': ['广西壮族自治区'],
      '海南': ['海南省'], '重庆': ['重庆市'], '四川': ['四川省'], '贵州': ['贵州省'],
      '云南': ['云南省'], '西藏': ['西藏自治区'], '陕西': ['陕西省'], '甘肃': ['甘肃省'],
      '青海': ['青海省'], '宁夏': ['宁夏回族自治区'], '新疆': ['新疆维吾尔自治区']
    };

    const maxVenues = Math.max(...Object.values(provinceData), 1);
    let svgContent = '';

    for (const [shortName, pos] of Object.entries(provinceMap)) {
      let count = 0;
      if (provinceData[shortName]) count = provinceData[shortName];
      else if (fullNameMap[shortName]) {
        fullNameMap[shortName].forEach(fn => {
          if (provinceData[fn]) count += provinceData[fn];
        });
      }
      const intensity = count / maxVenues;
      const radius = Math.max(10, count * 4 + 10);
      let color = '#e5e7eb';
      if (intensity > 0.6) color = '#b91c1c';
      else if (intensity > 0.4) color = '#ef4444';
      else if (intensity > 0.2) color = '#f87171';
      else if (intensity > 0) color = '#fca5a5';

      svgContent += `
        <g transform="translate(${pos.x}, ${pos.y})">
          <circle cx="0" cy="0" r="${radius}" fill="${color}" opacity="0.8" />
          <text x="0" y="-${radius + 8}" text-anchor="middle" font-size="7" fill="#64748b">${name}</text>
          <text x="0" y="4" text-anchor="middle" font-size="10" font-weight="bold" fill="${count > 0 ? '#ffffff' : '#9ca3af'}">${count}</text>
        </g>
      `;
    }

    container.innerHTML = `
      <svg viewBox="0 0 200 180" style="width:100%;height:100%;background:#ffffff;">
        <rect x="0" y="0" width="200" height="180" fill="#f8fafc" rx="8" />
        <path d="M40,80 L60,60 L70,80 L60,100 L40,80" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M70,50 L95,40 L105,55 L95,70 L70,60" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M105,50 L125,45 L135,55 L125,70 L105,65" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M125,55 L145,50 L155,60 L145,75 L125,70" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M70,80 L95,70 L105,85 L95,100 L70,90" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M105,80 L130,75 L140,85 L130,100 L105,95" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M130,80 L155,75 L165,85 L155,100 L130,95" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M95,95 L120,90 L130,100 L120,115 L95,110" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M120,95 L145,90 L155,100 L145,115 L120,110" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M145,95 L165,90 L175,100 L165,115 L145,110" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M115,110 L140,105 L150,115 L140,130 L115,125" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M140,110 L165,105 L175,115 L165,130 L140,125" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M125,125 L150,120 L160,130 L150,145 L125,140" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M65,105 L90,100 L100,110 L90,125 L65,120" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M90,115 L115,110 L125,120 L115,135 L90,130" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        <path d="M115,125 L140,120 L150,130 L140,145 L115,140" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" opacity="0.5" />
        ${svgContent}
        <rect x="10" y="155" width="180" height="18" rx="4" fill="#f1f5f9" stroke="#e2e8f0" />
        <text x="18" y="167" font-size="9" fill="#64748b">场馆数量：</text>
        <rect x="65" y="159" width="100" height="10" rx="2" fill="url(#legendGradient)" />
        <text x="65" y="176" font-size="7" fill="#64748b">少</text>
        <text x="158" y="176" font-size="7" fill="#64748b">多</text>
        <defs>
          <linearGradient id="legendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#fef3c7" />
            <stop offset="50%" stop-color="#f87171" />
            <stop offset="100%" stop-color="#b91c1c" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  // 导览页
  async function initGuidePage() {
    await initCommon();
    const container = $('#venue-grid');
    const mapContainer = $('#map-container');
    if (!container) return;

    // 骨架屏
    renderSkeletonGrid(8, 'venue-grid');

    const venues = await loadAllVenues();
    const provinces = getProvinces(venues);
    const categories = getCategories(venues);

    // 最近浏览
    renderRecentChips(venues);

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
        provinces.map(p => `<option value="${p}" ${p === initProvince ? 'selected' : ''}>${p}</option>`).join('');
    }
    if (categorySelect) {
      categorySelect.innerHTML = '<option value="all">全部类别</option>' +
        categories.map(c => `<option value="${c}" ${c === initCategory ? 'selected' : ''}>${c}</option>`).join('');
    }

    const searchInput = $('#search-input');
    if (searchInput && initSearch) searchInput.value = initSearch;

    // ---- 地图功能 ----
    let mapView = false;
    let leafletMap = null;
    const toggleBtn = $('#toggle-view-btn');

    async function initMap() {
      if (leafletMap) return;
      if (!window.L) {
        // 动态加载 Leaflet JS
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      if (!window.L || !mapContainer) return;
      leafletMap = L.map(mapContainer).setView([35, 110], 4);
      L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: ['1', '2', '3', '4'],
        maxZoom: 18,
        attribution: '© 高德地图'
      }).addTo(leafletMap);
    }

    function plotVenuesOnMap(filteredVenues) {
      if (!leafletMap) return;
      // 清除旧标记
      leafletMap.eachLayer(layer => {
        if (layer instanceof L.Marker) leafletMap.removeLayer(layer);
      });
      const withCoords = filteredVenues.filter(v => v.coordinates && v.coordinates.lat);
      if (withCoords.length === 0) {
        showToast('当前筛选结果中没有带坐标的场馆');
        return;
      }
      const markers = withCoords.map(v => L.marker([v.coordinates.lat, v.coordinates.lng])
        .bindPopup(`<b>${v.name}</b><br>${v.province} ${v.city || ''}<br><a href="detail.html?id=${v.id}">查看详情 →</a>`));
      const group = L.featureGroup(markers).addTo(leafletMap);
      leafletMap.fitBounds(group.getBounds().pad(0.1), { maxZoom: 10 });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', async () => {
        mapView = !mapView;
        toggleBtn.innerHTML = mapView ? '📋 列表视图' : '🗺️ 地图视图';
        container.style.display = mapView ? 'none' : '';
        if (mapContainer) mapContainer.style.display = mapView ? '' : 'none';
        const pagContainer = $('#pagination-container');
        if (pagContainer) pagContainer.style.display = mapView ? 'none' : '';
        if (mapView) {
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
      window.history.replaceState({}, '', url.toString());
    }

    function doRender(resetPage, mapOnly) {
      const query = searchInput?.value || '';
      const province = provinceSelect?.value || 'all';
      const category = categorySelect?.value || 'all';
      const filtered = filterVenues(venues, { query, province, category });

      // 地图模式
      if (mapView && leafletMap) {
        plotVenuesOnMap(filtered);
        if (mapOnly) return;
      }

      // URL 同步
      const pageSize = 12;
      const currentPage = resetPage ? 1 : parseInt(new URLSearchParams(location.search).get('page') || '1');
      const totalPages = Math.ceil(filtered.length / pageSize);
      const page = Math.min(currentPage, totalPages || 1);
      syncURL(query, province, category, page);

      const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
      const countEl = $('#result-count');
      if (countEl) countEl.innerHTML = `共找到 <strong>${filtered.length}</strong> 个场馆`;

      if (pageItems.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>未找到匹配的场馆</h3><p>请尝试调整搜索条件或筛选选项</p></div>';
      } else {
        container.innerHTML = pageItems.map(v => renderVenueCard(v)).join('');
      }

      const pagContainer = $('#pagination-container');
      if (pagContainer) {
        pagContainer.innerHTML = renderPagination(filtered.length, pageSize, page, '#pagination-container', (newPage) => {
          const url = new URL(location.href);
          url.searchParams.set('page', newPage);
          location.href = url.toString();
        });
      }
    }

    function render(resetPage) { doRender(resetPage, false); }

    // 事件监听
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') render(true);
      });
      const searchBtn = $('#guide-search-btn');
      if (searchBtn) {
        searchBtn.addEventListener('click', () => render(true));
      }
    }
    if (provinceSelect) provinceSelect.addEventListener('change', () => render(true));
    if (categorySelect) categorySelect.addEventListener('change', () => render(true));

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
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">❓</div><h3>未指定场馆</h3><p>请从导览页面选择一个场馆查看详情</p></div>';
      return;
    }

    const venues = await loadAllVenues();
    const venue = venues.find(v => String(v.id) === String(id));

    // 记录最近浏览
    if (venue) trackRecentView(venue.id);

    if (!venue) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><h3>场馆未找到</h3><p>该场馆可能已被移除或链接无效</p></div>';
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

    // 更新页面 hero 背景
    const heroBg = $('#detail-hero-bg');
    if (heroBg) heroBg.src = imgSrc;

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
              <img src="${resolveAssetPath(img, bp)}" alt="${venue.name} 图片${idx + 1}" loading="lazy" onerror="this.onerror=null;this.src='${fb}'">
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

    const html = `
      <div class="detail-layout">
        <div class="detail-main">
          ${carouselHtml}
          <div class="detail-body">
            <div class="detail-tags">
              <span class="tag-category">${venue.category || '红色场馆'}</span>
              <span class="tag-province">📍 ${venue.province || ''} ${venue.city || ''} ${venue.district || ''}</span>
            </div>
            <h2>${venue.name}</h2>
            <div class="detail-location">📍 ${venue.province || ''} ${venue.city || ''} ${venue.district || ''}</div>
            <div class="detail-desc">${detailedDesc}</div>
            <div class="detail-section">
              <h3>📖 历史背景</h3>
              <p>${historyText}</p>
            </div>
            <div class="detail-section">
              <h3>🎯 教育意义</h3>
              <p>${educationText}</p>
            </div>
          </div>
        </div>
        <div class="detail-sidebar">
          <div class="sidebar-card">
            <h3>📋 场馆信息</h3>
            <div class="info-row"><span class="info-label">名称</span><span class="info-value">${venue.standardName || venue.name}</span></div>
            <div class="info-row"><span class="info-label">地区</span><span class="info-value">${venue.province || ''} ${venue.city || ''}</span></div>
            <div class="info-row"><span class="info-label">类别</span><span class="info-value">${venue.category || '红色场馆'}</span></div>
            <div class="info-row"><span class="info-label">信息核验</span><span class="info-value">${venue.officialVerificationStatus || '待核验'}</span></div>
          </div>
          ${venue.officialUrl ? `
          <div class="sidebar-card">
            <h3>🔗 官方链接</h3>
            <a class="official-link" href="${venue.officialUrl}" target="_blank" rel="noopener">🌐 ${venue.officialLinkType || '官方网站'}</a>
            ${venue.sourcePage ? `<a class="official-link" style="margin-top:8px;" href="${venue.sourcePage}" target="_blank" rel="noopener">📷 图片来源</a>` : ''}
          </div>` : ''}
          <div class="sidebar-card">
            <h3>🗺️ 位置信息</h3>
            ${venue.coordinates && venue.coordinates.lat
        ? `<a href="https://uri.amap.com/marker?position=${venue.coordinates.lng},${venue.coordinates.lat}&name=${encodeURIComponent(venue.name)}" target="_blank" style="display:block;text-decoration:none;border:1px solid var(--line);border-radius:6px;overflow:hidden;">
            <div style="background:#f3f4f6;height:160px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;">
              <span style="font-size:32px;">📍</span>
              <span style="color:var(--red);font-weight:600;">在高德地图中查看</span>
              <span style="font-size:12px;color:var(--muted);">${venue.province} ${venue.city || ''} ${venue.district || ''}</span>
            </div>
          </a>`
        : `<div class="map-placeholder">📍 ${venue.province || ''} ${venue.city || ''} ${venue.district || ''}<br><small>详细地址请以官方发布为准</small></div>`
      }
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // 初始化轮播
    if (hasMultipleImages) {
      initCarousel(uniqueCarousel.length, bp);
    }
  }

  // 时事政策页
  async function initPolicyPage() {
    await initCommon();
    const container = $('#policy-list');
    if (!container) return;

    let policies;
    try { policies = await loadJSON('data/policies.json'); } catch (e) { policies = []; }

    const bp = getBasePath();
    const fb = fallbackSrc();
    container.innerHTML = policies.map(p => {
      const imgSrc = p.image ? resolveAssetPath(p.image, bp) : (bp + 'assets/页面通用图片/时事政策模块封面.webp');
      const hasUrl = p.url && p.url.trim();
      return `
        <div class="policy-card">
          <div class="policy-img">
            <img src="${imgSrc}" alt="${p.title}" loading="lazy" onerror="this.onerror=null;this.src='${fb}'">
          </div>
          <div class="policy-info">
            <h3>${p.title}</h3>
            <p class="policy-summary">${p.summary || ''}</p>
            <div class="policy-meta">
              <span class="policy-source">${p.source || '未知来源'}</span>
              <span>📅 ${p.publishedAt || ''}</span>
            </div>
          </div>
          ${hasUrl ? `
          <div class="policy-link">
            <a href="${p.url}" target="_blank" rel="noopener">阅读全文 →</a>
          </div>` : ''}
        </div>
      `;
    }).join('');
  }

  // 实践成果页
  async function initPracticePage() {
    await initCommon();
    const container = $('#practice-grid');
    if (!container) return;

    let practices;
    try { practices = await loadJSON('data/practices.json'); } catch (e) { practices = []; }

    const bp = getBasePath();
    const pageSize = 9;
    const params = new URLSearchParams(location.search);
    const currentPage = parseInt(params.get('page') || '1');
    const totalPages = Math.ceil(practices.length / pageSize);
    const page = Math.min(currentPage, totalPages || 1);
    const pageItems = practices.slice((page - 1) * pageSize, page * pageSize);

    container.innerHTML = pageItems.map(p => renderPracticeCard(p, bp)).join('');

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

  /* ---------- 最近浏览 ---------- */
  function trackRecentView(venueId) {
    try {
      let recent = JSON.parse(localStorage.getItem('redguide_recent') || '[]');
      recent = recent.filter(id => String(id) !== String(venueId));
      recent.unshift(String(venueId));
      localStorage.setItem('redguide_recent', JSON.stringify(recent.slice(0, 5)));
    } catch (e) { }
  }

  function getRecentVenues(venues) {
    try {
      const ids = JSON.parse(localStorage.getItem('redguide_recent') || '[]');
      return ids.map(id => venues.find(v => String(v.id) === id)).filter(Boolean);
    } catch (e) { return []; }
  }

  function renderRecentChips(venues) {
    const recent = getRecentVenues(venues);
    const container = document.getElementById('recent-venues');
    if (!container || recent.length === 0) return;
    container.innerHTML = recent.map(v =>
      `<span class="recent-chip" onclick="window.RedGuide.goToDetail('${v.id}')">🕐 ${v.name}<span class="chip-time">最近浏览</span></span>`
    ).join('');
    container.parentElement.style.display = '';
  }

  /* ---------- 分享 ---------- */
  function copyShareLink(text) {
    const url = location.href;
    navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
      showToast('✅ 链接已复制到剪贴板');
    }).catch(() => {
      showToast('❌ 复制失败，请手动复制地址栏');
    });
  }

  /* ---------- 导航栏滚动效果 ---------- */
  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 100) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      lastScrollY = window.scrollY;
    }, { passive: true });
  }

  /* ---------- Intersection Observer 滚动动画 ---------- */
  let _scrollObserver = null;

  function initScrollAnimations() {
    if (_scrollObserver) _scrollObserver.disconnect();
    _scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.scroll-animate').forEach(el => {
      _scrollObserver.observe(el);
    });
  }

  // 重新扫描新加入 DOM 的元素
  function rescanScrollAnimations() {
    if (!_scrollObserver) return;
    document.querySelectorAll('.scroll-animate:not(.visible)').forEach(el => {
      _scrollObserver.observe(el);
    });
  }

  /* ---------- 公开 API ---------- */
  return {
    initNavigation,
    initBackToTop,
    initCommon,
    initHeaderScroll,
    initScrollAnimations,
    rescanScrollAnimations,
    autoInit,
    goToDetail,
    openVideo,
    openPracticeDetail,
    openLightbox,
    likePractice,
    searchFromHome,
    showToast,
    renderVenueCard,
    renderPracticeCard,
    renderMessageCard,
    trackRecentView,
    renderRecentChips,
    copyShareLink,
    loadAllVenues,
    filterVenues,
    getProvinces,
    getCategories,
  };
})();

/* 页面加载完成后自动初始化 */
document.addEventListener('DOMContentLoaded', () => {
  if (window.RedGuide && window.RedGuide.autoInit) {
    window.RedGuide.autoInit().catch(err => {
      console.error('[RedGuide] 初始化失败:', err);
    });
  }
});
