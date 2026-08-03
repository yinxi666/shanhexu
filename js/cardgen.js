/* ============================================================
   红色纪念卡 — Canvas 合成红色文创纪念卡，可下载 / 分享
   纯前端实现：本地同源图片 + 系统字体，无后端、无依赖
   ============================================================ */
window.RedCardGen = (() => {
  const $ = (s, c) => (c || document).querySelector(s);

  /* ---- 路径工具：统一委托 RedData（data.js 最先加载，始终可用） ---- */
  const getBasePath = (...a) => window.RedData.getBasePath(...a);
  const resolveAssetPath = (...a) => window.RedData.resolveAssetPath(...a);
  function toast(msg) {
    if (window.RedGuide && typeof window.RedGuide.showToast === 'function') window.RedGuide.showToast(msg);
  }

  /* ---- 可选数据 ---- */
  const SPIRITS = ['建党', '红船', '井冈山', '长征', '延安', '西柏坡', '抗战', '红岩', '红旗渠', '两弹一星', '苏区', '雷锋精神'];
  // 精神词 → 八字精神短语（卡上展示，避免全部都用同一句）
  const SPIRIT_TAGS = {
    '建党': '开天辟地', '红船': '敢为人先', '井冈山': '星火燎原', '长征': '万水千山',
    '延安': '实事求是', '西柏坡': '进京赶考', '抗战': '众志成城', '红岩': '浩然正气',
    '红旗渠': '艰苦创业', '两弹一星': '无私奉献', '苏区': '一心为民', '雷锋精神': '为人民服务',
  };
  const BG_IMAGES = [
    { label: '南湖红船', src: 'assets/全国红色场馆图片/场馆03_浙江_嘉兴南湖红船.webp' },
    { label: '井冈山', src: 'assets/全国红色场馆图片/场馆04_江西_井冈山革命博物馆.webp' },
    { label: '延安', src: 'assets/全国红色场馆图片/场馆06_陕西_延安革命纪念馆.webp' },
    { label: '天安门', src: '天安门.webp' },
    { label: '一大会址', src: 'assets/全国红色场馆图片/场馆01_上海_中共一大会址.webp' },
    { label: '西柏坡', src: 'assets/全国红色场馆图片/场馆05_河北_西柏坡纪念馆.webp' },
    { label: '遵义', src: 'assets/全国红色场馆图片/场馆07_贵州_遵义会议会址.webp' },
    { label: '南昌', src: 'assets/全国红色场馆图片/场馆13_江西_南昌八一起义纪念馆.webp' },
  ];

  let overlay = null;
  let selectedBg = 0;
  let selectedSpirit = 0;
  let lastCardDataUrl = null;
  // 从场馆详情页打开时带入的场馆名与场馆图（首页打开则留空 → 保持通用卡面/背景）
  let currentVenueName = '';
  let currentVenueImage = '';

  /* ============================================================
     Canvas 合成
     ============================================================ */
  function drawCover(ctx, img, cw, ch) {
    const scale = Math.max(cw / img.width, ch / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }
  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // 印章：经典篆刻式圆章，中央 2×2「数绘红旅」章文，双层描边 + 底纹渐变（姓名已单独展示）
  function drawSeal(ctx, x, y) {
    const r = 50;
    ctx.save();
    ctx.translate(x, y);
    // 红底（径向渐变，边缘略深增加质感）
    const grad = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
    grad.addColorStop(0, '#d2343c');
    grad.addColorStop(0.7, '#c3272b');
    grad.addColorStop(1, '#961318');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // 外金圈 + 内白细圈
    ctx.strokeStyle = '#f3d9a4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r - 8, 0, Math.PI * 2); ctx.stroke();
    // 中央 2×2「数绘红旅」
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px "STKaiti","KaiTi","STZhongsong",serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('数', -r * 0.37, -r * 0.37);
    ctx.fillText('绘', r * 0.37, -r * 0.37);
    ctx.fillText('红', -r * 0.37, r * 0.37);
    ctx.fillText('旅', r * 0.37, r * 0.37);
    ctx.restore();
  }
  // 五角星路径
  function drawStarPath(ctx, cx, cy, R, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = (i % 2 === 0) ? R : r;
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const x = cx + rad * Math.cos(ang);
      const y = cy + rad * Math.sin(ang);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  // 证书式金框（双线 + 四角 L 形装饰）
  function drawCardFrame(ctx, W, H) {
    ctx.strokeStyle = 'rgba(222, 180, 90, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.strokeStyle = 'rgba(222, 180, 90, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.strokeStyle = 'rgba(234, 197, 112, 0.95)';
    ctx.lineWidth = 3;
    const c = 20, iX = 22, iY = 22;
    ctx.beginPath(); ctx.moveTo(iX, iY + c); ctx.lineTo(iX, iY); ctx.lineTo(iX + c, iY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - iX - c, iY); ctx.lineTo(W - iX, iY); ctx.lineTo(W - iX, iY + c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(iX, H - iY - c); ctx.lineTo(iX, H - iY); ctx.lineTo(iX + c, H - iY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - iX - c, H - iY); ctx.lineTo(W - iX, H - iY); ctx.lineTo(W - iX, H - iY - c); ctx.stroke();
  }
  // 顶部回纹红带
  function drawPatternBand(ctx, W) {
    const y = 0, h = 52;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(140, 22, 22, 0.95)');
    g.addColorStop(1, 'rgba(108, 16, 16, 0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, h);
    ctx.fillStyle = 'rgba(230, 190, 100, 0.9)';
    ctx.fillRect(0, y + h - 2, W, 2);
    ctx.strokeStyle = 'rgba(244, 214, 148, 0.85)';
    ctx.lineWidth = 1.3;
    for (let x = 28; x < W - 24; x += 48) {
      ctx.strokeRect(x, y + 14, 24, 24);
      ctx.strokeRect(x + 5, y + 19, 14, 14);
    }
  }
  // 长征路线（金路 + 途经点 + 终点红星）
  function drawRoute(ctx, W, baseY) {
    ctx.save();
    ctx.strokeStyle = 'rgba(240, 205, 130, 0.85)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(W * 0.14, baseY + 16);
    ctx.bezierCurveTo(W * 0.3, baseY - 12, W * 0.42, baseY + 20, W * 0.56, baseY - 6);
    ctx.bezierCurveTo(W * 0.68, baseY - 24, W * 0.78, baseY + 12, W * 0.84, baseY - 16);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 210, 130, 0.95)';
    [[0.14, 16], [0.33, -4], [0.5, 8], [0.68, -8], [0.84, -16]].forEach(p => {
      ctx.beginPath(); ctx.arc(W * p[0], baseY + p[1], 3.2, 0, Math.PI * 2); ctx.fill();
    });
    drawStarPath(ctx, W * 0.88, baseY - 22, 11, 5);
    ctx.fillStyle = '#e23b2e';
    ctx.fill();
    ctx.strokeStyle = '#ffd76e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function renderCard(bgImg, spirit, name, venueName) {
    const W = 640, H = 900;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 入参防御：背景未加载/无宽高时抛错；name/spirit 兜底
    if (!bgImg || !bgImg.naturalWidth) throw new Error('背景图未加载');
    name = (name && String(name).trim()) || '同学';
    spirit = String(spirit || '').trim() || '红色精神';

    // 1) 背景照片（cover 裁剪）
    drawCover(ctx, bgImg, W, H);

    // 2) 整体红调压暗，让文字与边框清晰
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, 'rgba(70, 12, 12, 0.60)');
    overlay.addColorStop(0.45, 'rgba(50, 10, 10, 0.42)');
    overlay.addColorStop(1, 'rgba(30, 6, 6, 0.72)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);

    // 3) 顶部回纹红带 + 证书式金框
    drawPatternBand(ctx, W);
    drawCardFrame(ctx, W, H);

    // 4) 红星徽章
    drawStarPath(ctx, W / 2, 120, 30, 13);
    ctx.fillStyle = 'rgba(205, 30, 30, 0.94)';
    ctx.fill();
    ctx.strokeStyle = '#f3c64c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5) 烫金标题（带辉光）
    const gold = ctx.createLinearGradient(0, 160, 0, 220);
    gold.addColorStop(0, '#fde68a');
    gold.addColorStop(0.5, '#f3c64c');
    gold.addColorStop(1, '#c98a1b');
    ctx.fillStyle = gold;
    ctx.font = 'bold 56px "STZhongsong","SimSun",serif';
    ctx.shadowColor = 'rgba(255, 200, 90, 0.55)';
    ctx.shadowBlur = 22;
    ctx.fillText('红色印记', W / 2, 196);
    ctx.shadowBlur = 0;

    // 6) 副标题（场馆名 / 完成语）
    const venueLine = venueName || '青践红途 · 码绘山河';
    const venueSize = venueLine.length > 14 ? 15 : venueLine.length > 10 ? 18 : 22;
    ctx.fillStyle = 'rgba(255, 244, 210, 0.95)';
    ctx.font = venueSize + 'px "STZhongsong","SimSun",serif';
    ctx.fillText(venueLine, W / 2, 242);

    // 7) 金色分隔线
    ctx.strokeStyle = 'rgba(232, 195, 110, 0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(W * 0.28, 270); ctx.lineTo(W * 0.72, 270);
    ctx.stroke();

    // 8) 中部精神词卡（中式双框）
    const cx = 84, cy = 296, cw = W - 168, chh = 226;
    ctx.fillStyle = 'rgba(108, 16, 16, 0.85)';
    roundRectPath(ctx, cx, cy, cw, chh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(235, 200, 120, 0.95)';
    ctx.lineWidth = 2.4;
    roundRectPath(ctx, cx + 6, cy + 6, cw - 12, chh - 12, 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(235, 200, 120, 0.5)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, cx + 13, cy + 13, cw - 26, chh - 26, 7); ctx.stroke();
    const sp = String(spirit);
    const tag = SPIRIT_TAGS[sp] || '薪火相传';
    ctx.fillStyle = '#ffd76e';
    ctx.font = 'bold ' + (sp.length <= 2 ? 66 : sp.length <= 4 ? 54 : 38) + 'px "STZhongsong","SimSun",serif';
    ctx.fillText(sp, W / 2, cy + chh / 2 - 24);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = '22px "STKaiti","STZhongsong","SimSun",serif';
    ctx.fillText(tag, W / 2, cy + chh / 2 + 42);

    // 9) 长征路线（主题元素）
    drawRoute(ctx, W, 600);

    // 10) 底部红金带（完成语 / 诗句）
    const now = new Date();
    const isComplete = venueName && venueName.indexOf('走完全程') >= 0;
    const by = 682, bh = 72;
    const bg2 = ctx.createLinearGradient(0, by, 0, by + bh);
    bg2.addColorStop(0, 'rgba(158, 26, 26, 0.92)');
    bg2.addColorStop(1, 'rgba(118, 18, 18, 0.94)');
    ctx.fillStyle = bg2;
    ctx.fillRect(W * 0.16, by, W * 0.68, bh);
    ctx.strokeStyle = 'rgba(240, 210, 140, 0.9)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(W * 0.16, by, W * 0.68, bh);
    const bandText = isComplete ? '二万五千里 · 走完全程' : '—— 星星之火 · 可以燎原 ——';
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 24px "STKaiti","STZhongsong","SimSun",serif';
    ctx.fillText(bandText, W / 2, by + bh / 2);

    // 11) 姓名 + 印章 + 日期
    const nameY = H - 150;
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 36px "STKaiti","STZhongsong","SimSun",serif';
    ctx.fillText('姓名：' + name, W / 2 - 70, nameY);
    drawSeal(ctx, W - 150, nameY - 10);
    ctx.fillStyle = 'rgba(255, 245, 215, 0.9)';
    ctx.font = '18px "STZhongsong","SimSun",serif';
    ctx.fillText(now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日', W / 2, H - 112);

    // 12) 水印
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px "STZhongsong","SimSun",serif';
    ctx.fillText('红色文旅数字导览 · 纪念卡', W / 2, H - 78);

    // 13) 做旧 + 暗角
    ctx.fillStyle = 'rgba(139, 100, 60, 0.12)';
    ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    return cv.toDataURL('image/png');
  }

  /* ============================================================
     生成 / 下载 / 分享 / 纪念墙
     ============================================================ */
  function generateCard() {
    const genBtn = $('#cardgen-generate');
    if (genBtn && genBtn.disabled) return; // 防连点
    if (genBtn) { genBtn.disabled = true; genBtn.innerHTML = '⏳ 正在盖章…'; }

    const nameInput = $('#cardgen-name');
    const name = (nameInput && nameInput.value.trim()) || '同学';
    const sloganInput = $('#cardgen-slogan');
    const custom = sloganInput && sloganInput.style.display !== 'none' ? sloganInput.value.trim() : '';
    const spirit = custom || SPIRITS[selectedSpirit] || '红色精神';
    const bgList = getBgList();
    const bg = bgList[selectedBg] || bgList[0];

    const resetBtn = function () {
      if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = '✨ 生成纪念卡'; }
    };

    const img = new Image();
    img.onload = function () {
      try {
        lastCardDataUrl = renderCard(img, spirit, name, currentVenueName);
      } catch (e) {
        resetBtn();
        toast('生成失败，请重试');
        return;
      }
      const pv = $('#cardgen-preview');
      const pimg = $('#cardgen-preview-img');
      if (pv && pimg) {
        pimg.src = lastCardDataUrl;
        pv.style.display = 'block';
        // 盖章落印动效（每次生成重新触发）
        pimg.classList.remove('cardgen-stamping');
        void pimg.offsetWidth;
        pimg.classList.add('cardgen-stamping');
      }
      // 移动端：长按保存提示
      const hint = $('#cardgen-savehint');
      if (hint) {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        hint.style.display = (isTouch && window.innerWidth < 900) ? 'block' : 'none';
      }
      const d = $('#cardgen-download'), s = $('#cardgen-share');
      if (d) d.style.display = 'inline-flex';
      if (s) s.style.display = (navigator.share) ? 'inline-flex' : 'none';
      resetBtn();
      toast('✅ 纪念卡已生成');
    };
    img.onerror = function () { resetBtn(); toast('背景图加载失败，请重试'); };
    img.src = resolveAssetPath(bg.src);
  }

  // data URL → Blob（下载用 objectURL 触发，比裸 data URL 更可靠，避免大文件下载挂起）
  function dataUrlToBlob(dataUrl) {
    if (typeof dataUrl !== 'string' || dataUrl.indexOf(',') < 0) return null;
    const parts = dataUrl.split(',');
    const mime = (parts[0].match(/data:([^;]+)/) || [])[1] || 'image/png';
    const bin = atob(parts[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function download() {
    if (!lastCardDataUrl) return;
    const blob = dataUrlToBlob(lastCardDataUrl);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = '红色纪念卡' + (currentVenueName ? '_' + currentVenueName : '') + '_' + Date.now() + '.png';
    a.href = url;
    document.body.appendChild(a);
    // 阻止点击冒泡到 document，避免被帷幕导航拦截器当成页面跳转而取消下载
    a.addEventListener('click', function (ev) { ev.stopPropagation(); });
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  function share() {
    if (!lastCardDataUrl) return;
    const blob = dataUrlToBlob(lastCardDataUrl);
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], '红色纪念卡.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: '红色纪念卡', text: '我在「数绘红旅」生成了我的红色纪念卡' }).catch(function () {});
        return;
      }
    }
    download();
  }


  /* ============================================================
     弹窗 UI
     ============================================================ */
  function buildModal() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'quiz-modal-overlay';
    overlay.id = 'cardgen-overlay';
    overlay.innerHTML = `
      <div class="quiz-modal cardgen-modal">
        <button class="cardgen-close" aria-label="关闭">✕</button>
        <h3 style="margin:0 0 4px;">🎴 红色纪念卡</h3>
        <p style="margin:0 0 6px;font-size:13px;color:var(--muted);">输入姓名、选择精神，生成一张可带走、可分享的红色文创纪念卡</p>
        <div class="cardgen-venue" id="cardgen-venue" style="display:none;margin:0 0 12px;font-size:12px;color:var(--red);font-weight:600;"></div>

        <div class="cardgen-field">
          <label>① 选择背景</label>
          <div class="cardgen-bgs" id="cardgen-bgs"></div>
        </div>

        <div class="cardgen-field">
          <label>② 你的姓名</label>
          <input type="text" id="cardgen-name" placeholder="输入姓名（最多6字）" maxlength="6">
        </div>

        <div class="cardgen-field">
          <label>③ 精神关键词（或自定义寄语）</label>
          <div class="cardgen-spirits">
            ${SPIRITS.map((s, i) => `<button type="button" class="cardgen-chip${i === 0 ? ' selected' : ''}" data-i="${i}">${s}</button>`).join('')}
            <button type="button" class="cardgen-chip" data-custom="1">✍️ 自定义</button>
          </div>
          <input type="text" id="cardgen-slogan" placeholder="自定义寄语（最多10字）" maxlength="10" style="display:none;margin-top:8px;">
        </div>

        <div class="cardgen-actions">
          <button type="button" class="btn primary" id="cardgen-generate">✨ 生成纪念卡</button>
          <button type="button" class="btn secondary" id="cardgen-download" style="display:none;">⬇️ 下载 PNG</button>
          <button type="button" class="btn secondary" id="cardgen-share" style="display:none;">📤 分享</button>
        </div>

        <div class="cardgen-preview" id="cardgen-preview" style="display:none;">
          <img id="cardgen-preview-img" alt="纪念卡预览">
        </div>
        <div class="cardgen-savehint" id="cardgen-savehint" style="display:none;">💡 长按图片可保存到相册</div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.cardgen-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

    overlay.querySelectorAll('.cardgen-chip').forEach(function (ch) {
      ch.addEventListener('click', function () {
        overlay.querySelectorAll('.cardgen-chip').forEach(function (x) { x.classList.toggle('selected', x === ch); });
        const slogan = $('#cardgen-slogan');
        if (ch.dataset.custom) {
          slogan.style.display = 'block';
          slogan.focus();
        } else {
          selectedSpirit = parseInt(ch.dataset.i, 10);
          slogan.style.display = 'none';
          slogan.value = '';
        }
      });
    });

    $('#cardgen-generate').addEventListener('click', generateCard);
    $('#cardgen-download').addEventListener('click', download);
    $('#cardgen-share').addEventListener('click', share);
    renderBgSelector();
  }

  /* 背景列表：从场馆详情页打开时，把当前场馆图作为第一个可选背景 */
  function getBgList() {
    // 场馆无图时 currentVenueImage 可能是占位图路径，跳过避免「暂无图片」上卡
    if (currentVenueImage && !/暂无图片/.test(currentVenueImage)) return [{ label: '本场馆', src: currentVenueImage }].concat(BG_IMAGES);
    return BG_IMAGES;
  }
  function renderBgSelector() {
    const grid = $('#cardgen-bgs');
    if (!grid) return;
    selectedBg = 0; // 有场馆图时默认选中「本场馆」，否则默认第一张
    const list = getBgList();
    grid.innerHTML = list.map((b, i) =>
      `<div class="cardgen-bg${i === 0 ? ' selected' : ''}" data-i="${i}" style="background-image:url('${resolveAssetPath(b.src)}')"><span>${b.label}</span></div>`
    ).join('');
    grid.querySelectorAll('.cardgen-bg').forEach(function (b) {
      b.addEventListener('click', function () {
        selectedBg = parseInt(b.dataset.i, 10);
        grid.querySelectorAll('.cardgen-bg').forEach(function (x) { x.classList.toggle('selected', x === b); });
      });
    });
  }

  function open(venueName, venueImage) {
    if (!overlay) buildModal();
    currentVenueName = (venueName || '').trim();
    currentVenueImage = (venueImage || '').trim();
    const venueEl = $('#cardgen-venue');
    if (venueEl) {
      if (currentVenueName) {
        venueEl.style.display = 'block';
        venueEl.textContent = '📍 纪念主题：' + currentVenueName;
      } else {
        venueEl.style.display = 'none';
        venueEl.textContent = '';
      }
    }
    renderBgSelector();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    // 仅当本弹窗确实打开时才释放滚动锁，避免覆盖其他弹窗（如长征页）持有的锁
    if (!overlay || !overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // 页面加载即注入弹窗（隐藏），点击入口时打开
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildModal);
  } else {
    buildModal();
  }

  // 暴露 renderCard/dataUrlToBlob/SPIRITS：供长征纪念卡专用弹窗等复用
  return { open: open, close: close, renderCard: renderCard, dataUrlToBlob: dataUrlToBlob, SPIRITS: SPIRITS };
})();
