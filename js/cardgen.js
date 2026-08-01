/* ============================================================
   红色纪念卡 — Canvas 合成红色文创纪念卡，可下载 / 分享
   纯前端实现：本地同源图片 + 系统字体，无后端、无依赖
   ============================================================ */
window.RedCardGen = (() => {
  const $ = (s, c) => (c || document).querySelector(s);

  /* ---- 路径工具：委托 RedData，缺失时本地降级 ---- */
  function getBasePath() {
    if (window.RedData && typeof window.RedData.getBasePath === 'function') {
      return window.RedData.getBasePath();
    }
    return (location.pathname.includes('/pages/')) ? '../' : '';
  }
  function resolveAssetPath(p) {
    if (window.RedData && typeof window.RedData.resolveAssetPath === 'function') {
      return window.RedData.resolveAssetPath(p, getBasePath());
    }
    const bp = getBasePath();
    if (!p) return bp + 'assets/页面通用图片/暂无图片.png';
    if (/^https?:\/\//.test(p) || p.startsWith('/')) return p;
    return bp + p;
  }
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
  function renderCard(bgImg, spirit, name) {
    const W = 640, H = 900;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 背景（cover 裁剪）
    drawCover(ctx, bgImg, W, H);

    // 顶部/底部压暗，保证文字可读
    const topGrad = ctx.createLinearGradient(0, 0, 0, 330);
    topGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, 330);
    const botGrad = ctx.createLinearGradient(0, H - 380, 0, H);
    botGrad.addColorStop(0, 'rgba(0,0,0,0)');
    botGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = botGrad; ctx.fillRect(0, H - 380, W, 380);

    // 顶部标题（烫金渐变）
    const gold = ctx.createLinearGradient(0, 80, 0, 170);
    gold.addColorStop(0, '#fde68a');
    gold.addColorStop(0.5, '#f3c64c');
    gold.addColorStop(1, '#c98a1b');
    ctx.fillStyle = gold;
    ctx.font = 'bold 52px "STZhongsong","SimSun",serif';
    ctx.fillText('红色印记', W / 2, 108);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '22px "STZhongsong","SimSun",serif';
    ctx.fillText('青践红途 · 码绘山河', W / 2, 168);

    // 中部精神词卡
    const cx = 90, cy = 320, cw = W - 180, chh = 240;
    ctx.fillStyle = 'rgba(124, 20, 20, 0.82)';
    roundRectPath(ctx, cx, cy, cw, chh, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,130,0.9)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, cx + 7, cy + 7, cw - 14, chh - 14, 11); ctx.stroke();

    const sp = String(spirit);
    const tag = SPIRIT_TAGS[sp] || '薪火相传';
    ctx.fillStyle = '#ffd76e';
    ctx.font = 'bold ' + (sp.length <= 2 ? 68 : sp.length <= 4 ? 56 : 38) + 'px "STZhongsong","SimSun",serif';
    ctx.fillText(sp, W / 2, cy + chh / 2 - 22);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '22px "STKaiti","STZhongsong","SimSun",serif';
    ctx.fillText(tag, W / 2, cy + chh / 2 + 42);

    // 底部：姓名 + 印章 + 日期
    const now = new Date();
    const nameY = H - 175;
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 38px "STKaiti","STZhongsong","SimSun",serif';
    ctx.fillText('姓名：' + name, W / 2 - 78, nameY);
    drawSeal(ctx, W - 140, nameY - 12);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '20px "STZhongsong","SimSun",serif';
    ctx.fillText(now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日', W / 2, H - 132);
    // 收尾诗句（增加文字丰富度）
    ctx.fillStyle = 'rgba(255,235,200,0.88)';
    ctx.font = '18px "STKaiti","STZhongsong","SimSun",serif';
    ctx.fillText('—— 星星之火 · 可以燎原 ——', W / 2, H - 88);
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = '15px "STZhongsong","SimSun",serif';
    ctx.fillText('红色文旅数字导览 · 纪念卡', W / 2, H - 48);

    // 做旧：暖色叠层 + 四角暗角
    ctx.fillStyle = 'rgba(139,100,60,0.14)';
    ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.34)');
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
    const bg = BG_IMAGES[selectedBg] || BG_IMAGES[0];

    const resetBtn = function () {
      if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = '✨ 生成纪念卡'; }
    };

    const img = new Image();
    img.onload = function () {
      try {
        lastCardDataUrl = renderCard(img, spirit, name);
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
    a.download = '红色纪念卡_' + Date.now() + '.png';
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
        <button class="quiz-close" aria-label="关闭">✕</button>
        <h3 style="margin:0 0 4px;">🎴 红色纪念卡</h3>
        <p style="margin:0 0 16px;font-size:13px;color:var(--muted);">输入姓名、选择精神，生成一张可带走、可分享的红色文创纪念卡</p>

        <div class="cardgen-field">
          <label>① 选择背景</label>
          <div class="cardgen-bgs">
            ${BG_IMAGES.map((b, i) =>
              `<div class="cardgen-bg${i === 0 ? ' selected' : ''}" data-i="${i}" style="background-image:url('${resolveAssetPath(b.src)}')"><span>${b.label}</span></div>`
            ).join('')}
          </div>
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

    overlay.querySelector('.quiz-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

    overlay.querySelectorAll('.cardgen-bg').forEach(function (b) {
      b.addEventListener('click', function () {
        selectedBg = parseInt(b.dataset.i, 10);
        overlay.querySelectorAll('.cardgen-bg').forEach(function (x) { x.classList.toggle('selected', x === b); });
      });
    });

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
  }

  function open() {
    if (!overlay) buildModal();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // 页面加载即注入弹窗（隐藏），点击入口时打开
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildModal);
  } else {
    buildModal();
  }

  return { open: open, close: close };
})();
