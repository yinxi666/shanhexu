/* ============================================================
   赓续血脉・数绘红旅 — 渲染器模块 (Renderers)
   职责：所有页面组件的HTML渲染函数
   依赖：RedData 数据层
   ============================================================ */

window.RedRenderers = (() => {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);

  /* 路径工具：统一委托 RedData（data.js 最先加载，始终可用） */
  const getBasePath = (...a) => window.RedData.getBasePath(...a);
  const resolveAssetPath = (...a) => window.RedData.resolveAssetPath(...a);
  const fallbackSrc = (...a) => window.RedData.fallbackSrc(...a);

  /** HTML 转义 — 留言等用户输入必须转义后再拼入 innerHTML */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 渲染场馆卡片
   * @param {Object} venue - 场馆数据对象
   * @param {string} [basePath] - 基础路径
   * @returns {string} HTML字符串
   */
  function isFavorite(id) {
    if (window.RedFeatures && typeof RedFeatures.isFavorite === 'function') return RedFeatures.isFavorite(id);
    try {
      const favs = JSON.parse(localStorage.getItem('redguide_favs') || '[]');
      return favs.includes(String(id));
    } catch (e) { return false; }
  }

  function renderVenueCard(venue, basePath) {
    const bp = basePath || getBasePath();
    const imgSrc = resolveAssetPath(venue.image, bp);
    const fb = fallbackSrc();
    const favActive = isFavorite(venue.id);
    const favClass = favActive ? 'active' : '';
    const favIcon = favActive ? '❤️' : '🤍';
    return `
      <div class="venue-card" data-id="${venue.id}" onclick="window.RedGuide.goToDetail('${venue.id}')">
        <div class="card-img">
          <img src="${imgSrc}" alt="${venue.name}" title="${venue.name}" loading="lazy" onerror="this.onerror=null;this.src='${fb}'">
          <span class="card-category">${venue.category || '红色场馆'}</span>
          <span class="card-province">${venue.province || ''}</span>
        </div>
        <div class="card-body">
          <h3>${venue.name}</h3>
          <div class="card-meta">
            <span>📍 ${venue.city || venue.province || ''}</span>
          </div>
          <p class="card-desc">${venue.summary || '暂无简介'}</p>
        </div>
        <div class="card-footer">
          <span>${venue.officialVerificationStatus || ''}</span>
          <span>
            <button class="fav-btn ${favClass}" title="收藏场馆" aria-pressed="${favActive}" onclick="event.stopPropagation(); const nx = window.RedFeatures.toggleFavorite('${venue.id}'); this.innerHTML = nx ? '❤️' : '🤍'; this.classList.toggle('active', nx); this.setAttribute('aria-pressed', String(nx));">${favIcon}</button>
            <span class="card-link">查看详情 →</span>
          </span>
        </div>
      </div>
    `;
  }

  /**
   * 渲染实践成果卡片
   * @param {Object} practice - 实践数据对象
   * @param {string} [basePath] - 基础路径
   * @returns {string} HTML字符串
   */
  function renderPracticeCard(practice, basePath) {
    const bp = basePath || getBasePath();
    const imgSrc = resolveAssetPath(practice.image, bp);
    const fb = fallbackSrc();
    const hasVideo = practice.video && practice.video.trim();
    const videoSrc = hasVideo ? resolveAssetPath(practice.video, bp) : '';
    return `
      <div class="practice-card" onclick="window.RedGuide.openPracticeDetail('${practice.id}')">
        <div class="practice-img">
          <img src="${imgSrc}" alt="${practice.title}" loading="lazy" onerror="this.onerror=null;this.src='${fb}'">
          ${hasVideo ? `
          <div class="has-video-badge">▶ 视频</div>
          <div class="play-btn" onclick="event.stopPropagation();window.RedGuide.openVideo('${videoSrc}')">▶</div>` : ''}
        </div>
        <div class="practice-body">
          <h3>${practice.title}</h3>
          <p class="team-name">👥 ${practice.team || '实践团队'}</p>
          <p>${practice.summary || ''}</p>
        </div>
        <div class="practice-footer">
          <span class="practice-date"><span class="pd-year">${(practice.createdAt || '----').slice(0,4)}</span><span class="pd-month">${parseInt((practice.createdAt || '--').slice(5,7),10) || '--'}</span><span class="pd-day">${parseInt((practice.createdAt || '--').slice(8,10),10) || '--'}</span></span>
          <span class="practice-likes" onclick="event.stopPropagation();window.RedGuide.likePractice(this, '${practice.id}')">❤️ <span class="like-count">${(window.RedGuide && window.RedGuide.getLikeCount) ? window.RedGuide.getLikeCount(practice.id, practice.likes||0) : (practice.likes||0)}</span></span>
        </div>
      </div>
    `;
  }

  /**
   * 根据名字 hash 生成稳定的头像颜色
   */
  function avatarColor(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    // 限定暖色段：红 0-20° + 橙金 25-45° + 紫红 330-360°
    var zones = [[0, 20], [25, 45], [330, 360]];
    var zone = zones[Math.abs(hash) % zones.length];
    var hue = zone[0] + (Math.abs(hash * 7) % (zone[1] - zone[0]));
    var sat = 50 + (Math.abs(hash * 3) % 20);  // 50-70%
    var lit = 38 + (Math.abs(hash * 5) % 14);  // 38-52%
    return 'hsl(' + hue + ',' + sat + '%,' + lit + '%)';
  }

  /**
   * 渲染留言卡片
   * @param {Object} msg - 留言数据对象
   * @returns {string} HTML字符串
   */
  function renderMessageCard(msg) {
    const statusMap = { approved: '已发布', pending: '审核中', rejected: '未通过' };
    const initials = (msg.author || '匿').charAt(0);
    const bg = avatarColor(msg.author || '匿名');
    const pinColor = avatarColor((msg.author || '匿') + 'pin');
    // 基于 id + 标题 hash 保证每条留言旋转角度不同且稳定
    var rotSeed = String(msg.id || '') + (msg.title || '');
    var rotHash = 0;
    for (var ri = 0; ri < rotSeed.length; ri++) {
      rotHash = rotSeed.charCodeAt(ri) + ((rotHash << 5) - rotHash);
    }
    var rotation = ((Math.abs(rotHash) % 51) - 25) / 10; // -2.5° ~ 2.5°
    // 留言作者/标题/内容来自用户提交（sessionStorage），必须转义防存储型 XSS
    const esc = escapeHtml;
    return `
      <div class="message-card" style="transform:rotate(${rotation}deg)">
        <div class="msg-pin" style="background:${pinColor}"></div>
        <div class="msg-header">
          <div class="msg-avatar" style="background:${bg}">${esc(initials)}</div>
          <div class="msg-author-info">
            <h4>${esc(msg.author || '匿名用户')}</h4>
            <span>${esc(msg.className || '')} · ${esc(msg.submitTime || '')}</span>
          </div>
        </div>
        <div class="msg-title">${esc(msg.title || '')}</div>
        <div class="msg-content">${esc(msg.content || '')}</div>
        <div class="msg-footer">
          <span>学号: ${esc(msg.studentId || '***')}</span>
          <span class="msg-status ${esc(msg.status) || 'pending'}">${esc(statusMap[msg.status]) || esc(msg.status) || ''}</span>
        </div>
      </div>
    `;
  }

  /**
   * 渲染分页组件
   * @param {number} totalItems - 总项数
   * @param {number} pageSize - 每页大小
   * @param {number} currentPage - 当前页码
   * @param {string} containerSelector - 容器选择器
   * @param {Function} renderFn - 翻页回调函数
   * @returns {string} HTML字符串
   */
  // 分页回调注册表：selector → 回调，配合下方 document 级事件委托
  const paginationHandlers = new Map();

  function renderPagination(totalItems, pageSize, currentPage, containerSelector, renderFn) {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return '';

    // 首次调用时注册一次性事件委托，避免 setTimeout(0) 挂监听导致的竞态
    //（容器在 timeout 前被重渲染时监听器会挂到被替换的旧节点上）
    if (!paginationHandlers.has(containerSelector)) {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-page]');
        if (!btn || !e.target.closest('.pagination')) return;
        const container = btn.closest(containerSelector);
        if (!container) return;
        const handler = paginationHandlers.get(containerSelector);
        if (!handler) return;
        const page = parseInt(btn.dataset.page, 10);
        if (!page) return;
        handler(page);
        const section = container.closest('.section');
        if (section) window.scrollTo({ top: section.offsetTop - 100, behavior: 'smooth' });
      });
    }
    paginationHandlers.set(containerSelector, renderFn);

    let html = '<div class="pagination">';
    html += `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;
    html += '</div>';

    return html;
  }

  /**
   * 渲染骨架屏网格
   * @param {number} count - 骨架卡片数量
   * @param {string} containerId - 容器ID
   */
  function renderSkeletonGrid(count, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton-card"><div class="skel-img"></div><div class="skel-body"><div class="skel-line medium"></div><div class="skel-line short"></div></div></div>`;
    }
    container.innerHTML = html;
  }

  return {
    renderVenueCard,
    renderPracticeCard,
    renderMessageCard,
    renderPagination,
    renderSkeletonGrid
  };
})();