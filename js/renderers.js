/* ============================================================
   赓续血脉・数绘红旅 — 渲染器模块 (Renderers)
   职责：所有页面组件的HTML渲染函数
   依赖：RedData 数据层
   ============================================================ */

window.RedRenderers = (() => {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);

  function getBasePath() {
    return RedData.getBasePath();
  }

  function resolveAssetPath(imagePath, basePath) {
    return RedData.resolveAssetPath(imagePath, basePath);
  }

  function fallbackSrc() {
    return RedData.fallbackSrc();
  }

  /**
   * 渲染场馆卡片
   * @param {Object} venue - 场馆数据对象
   * @param {string} [basePath] - 基础路径
   * @returns {string} HTML字符串
   */
  function renderVenueCard(venue, basePath) {
    const bp = basePath || getBasePath();
    const imgSrc = resolveAssetPath(venue.image, bp);
    const fb = fallbackSrc();
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
          <span class="card-link">查看详情 →</span>
        </div>
      </div>
    `;
  }

  /**
   * 渲染政策卡片
   * @param {Object} policy - 政策数据对象
   * @param {string} [basePath] - 基础路径
   * @returns {string} HTML字符串
   */
  function renderPolicyCard(policy, basePath) {
    const bp = basePath || getBasePath();
    const imgSrc = resolveAssetPath(policy.image, bp) || (bp + 'assets/页面通用图片/时事政策模块封面.jpg');
    const fb = fallbackSrc();
    const hasUrl = policy.url && policy.url.trim();
    return `
      <div class="policy-card">
        <div class="policy-img">
          <img src="${imgSrc}" alt="${policy.title}" loading="lazy" onerror="this.onerror=null;this.src='${fb}'">
        </div>
        <div class="policy-info">
          <h3>${policy.title}</h3>
          <p class="policy-summary">${policy.summary || ''}</p>
          <div class="policy-meta">
            <span class="policy-source">${policy.source || '未知来源'}</span>
            <span>📅 ${policy.publishedAt || ''}</span>
          </div>
        </div>
        ${hasUrl ? `
        <div class="policy-link">
          <a href="${policy.url}" target="_blank" rel="noopener">阅读全文 →</a>
        </div>` : `
        <div class="policy-link">
          <span style="padding:8px 14px;background:#f3f4f6;border-radius:6px;font-size:13px;color:#9ca3af;">待补充链接</span>
        </div>`}
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
          <span class="practice-date">📅 ${practice.createdAt || ''}</span>
          <span class="practice-likes" onclick="event.stopPropagation();window.RedGuide.likePractice(this, '${practice.id}')">❤️ <span class="like-count">${practice.likes || 0}</span></span>
        </div>
      </div>
    `;
  }

  /**
   * 渲染留言卡片
   * @param {Object} msg - 留言数据对象
   * @returns {string} HTML字符串
   */
  function renderMessageCard(msg) {
    const statusMap = { approved: '已发布', pending: '审核中', rejected: '未通过' };
    const initials = (msg.author || '匿').charAt(0);
    return `
      <div class="message-card">
        <div class="msg-header">
          <div class="msg-avatar">${initials}</div>
          <div class="msg-author-info">
            <h4>${msg.author || '匿名用户'}</h4>
            <span>${msg.className || ''} · ${msg.submitTime || ''}</span>
          </div>
        </div>
        <div class="msg-title">${msg.title || ''}</div>
        <div class="msg-content">${msg.content || ''}</div>
        <div class="msg-footer">
          <span>学号: ${msg.studentId || '***'}</span>
          <span class="msg-status ${msg.status || 'pending'}">${statusMap[msg.status] || msg.status}</span>
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
  function renderPagination(totalItems, pageSize, currentPage, containerSelector, renderFn) {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return '';

    let html = '<div class="pagination">';
    html += `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;
    html += '</div>';

    setTimeout(() => {
      const paginationDiv = document.querySelector(containerSelector + ' .pagination');
      if (paginationDiv) {
        paginationDiv.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', function () {
            const page = parseInt(this.dataset.page);
            if (!page || typeof renderFn !== 'function') return;
            renderFn(page);
            const section = paginationDiv.closest('.section');
            if (section) window.scrollTo({ top: section.offsetTop - 100, behavior: 'smooth' });
          });
        });
      }
    }, 0);

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
    renderPolicyCard,
    renderPracticeCard,
    renderMessageCard,
    renderPagination,
    renderSkeletonGrid
  };
})();