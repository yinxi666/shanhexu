/* ============================================================
   红色纪念卡 — Canvas 合成红色文创纪念卡，可下载 / 分享
   纯前端实现：本地同源图片 + 系统字体，无后端、无依赖
   ============================================================ */
import { resolveAssetPath, escapeHtml, escapeAttr, isTouchDevice } from './utils.js?v=2026081320';
import { $, showToast, onOverlayClick } from './ui.js?v=2026081320';
import { icon } from './icons.js?v=2026081320';
import { trapFocus, releaseFocus, lockBodyScroll, unlockBodyScroll } from './focus-trap.js?v=2026081320';

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
  { label: '天安门', src: 'assets/通用/天安门.webp' },
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
const CARD_W = 640, CARD_H = 900;

function drawCover(ctx, img, cw, ch) {
  const scale = Math.max(cw / img.width, ch / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}
/* 圆角矩形路径：begin=true 时自建路径（独立形状）；begin=false 追加进复合 evenodd 孔（与 traceRoundRect 合并） */
function roundRectPath(ctx, x, y, w, h, r, begin = true) {
  if (begin) ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
/* 卡片画布样板（两张卡面共用的创建/初始化序列） */
function initCardCanvas() {
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.width = CARD_W; cv.height = CARD_H;
  const ctx = cv.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  return cv;
}
/* 入参防御与兜底（两张卡面共用） */
function normalizeCardInputs(bgImg, name, spirit) {
  if (!bgImg || !bgImg.naturalWidth) throw new Error('背景图未加载');
  return {
    name: (name && String(name).trim()) || '同学',
    spirit: String(spirit || '').trim() || '红色精神'
  };
}
/* 中文日期串（两张卡面共用） */
function formatZhDate(now) {
  return now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日';
}
/* 做旧 + 暗角收尾（两张卡面共用，仅 alpha 参数不同） */
function drawAgedVignette(ctx, W, H, ageAlpha, vignetteAlpha) {
  ctx.fillStyle = 'rgba(139, 100, 60, ' + ageAlpha + ')';
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.9);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,' + vignetteAlpha + ')');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
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
// 五角星路径：begin=true 时自建路径（独立形状）；begin=false 追加进复合 evenodd 孔（与 traceStar 合并）
function drawStarPath(ctx, cx, cy, R, r, begin = true) {
  if (begin) ctx.beginPath();
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
  const W = CARD_W, H = CARD_H;
  const cv = initCardCanvas();
  const ctx = cv.getContext('2d');
  const inputs = normalizeCardInputs(bgImg, name, spirit);
  name = inputs.name;
  spirit = inputs.spirit;

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
  ctx.fillText(formatZhDate(now), W / 2, H - 112);

  // 12) 水印
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '14px "STZhongsong","SimSun",serif';
  ctx.fillText('红色文旅数字导览 · 纪念卡', W / 2, H - 78);

  // 13) 做旧 + 暗角
  drawAgedVignette(ctx, W, H, 0.12, 0.32);

  return cv.toDataURL('image/png');
}

/* ============================================================
   首页专属：剪纸「月洞门」纪念卡（仅首页入口使用）
   红纸实面 + 奶白剪边 + evenodd 镂空孔（背景照片透过窗/孔透出），
   呼应首页入场动画的"山脉剪影 + 赓续血脉"叙事。
   ============================================================ */
const PAPER_CREAM = '#f3e2c0';
// 剪纸实面：外层形状 + evenodd 孔（照片透过孔透出）+ 奶白剪边
function fillHomePaper(ctx, build, holes, color) {
  ctx.save();
  ctx.beginPath();
  build(ctx);
  (holes || []).forEach(function (h) { h(ctx); });
  ctx.fillStyle = color;
  ctx.fill('evenodd');
  ctx.strokeStyle = PAPER_CREAM;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

// 细纸纹：确定性伪随机微点（同一张卡每次生成一致）
function drawPaperGrain(ctx, W, H, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha || 0.05;
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W, y = rnd() * H, s = rnd() * 2 + 0.5;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,244,210,0.5)' : 'rgba(120,70,30,0.5)';
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

function renderHomeCard(bgImg, spirit, name) {
  const W = CARD_W, H = CARD_H;
  const cv = initCardCanvas();
  const ctx = cv.getContext('2d');
  const inputs = normalizeCardInputs(bgImg, name, spirit);
  name = inputs.name;
  spirit = inputs.spirit;

  const CREAM = '#f2e3c2';

  // 0) 照片全幅做底（明亮的"山河"，不被圆窗框住）
  drawCover(ctx, bgImg, W, H);
  const glow = ctx.createLinearGradient(0, 0, 0, H);
  glow.addColorStop(0, 'rgba(60, 8, 8, 0.48)');
  glow.addColorStop(0.4, 'rgba(46, 8, 8, 0.22)');
  glow.addColorStop(1, 'rgba(22, 4, 4, 0.72)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  // 隐水印大字「山河序」
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.font = 'bold 150px "HongLeiZhuoShu","STZhongsong","SimSun",serif';
  ctx.fillStyle = CREAM; ctx.fillText('山河序', W / 2, 470);
  ctx.restore();

  // 1) 顶部横批「赓续血脉」：深红渐变 + 回纹 + 分层金字
  const bG = ctx.createLinearGradient(0, 0, 0, 96);
  bG.addColorStop(0, '#8a1414'); bG.addColorStop(1, '#4a0a0a');
  ctx.fillStyle = bG; ctx.fillRect(0, 0, W, 96);
  ctx.strokeStyle = 'rgba(242, 227, 194, 0.28)'; ctx.lineWidth = 1;
  for (let x = 24; x < W - 24; x += 56) { ctx.strokeRect(x, 70, 14, 14); ctx.strokeRect(x + 4, 74, 6, 6); }
  ctx.fillStyle = 'rgba(232, 179, 58, 0.9)'; ctx.fillRect(0, 92, W, 2);
  ctx.font = 'bold 54px "HongLeiZhuoShu","STZhongsong","SimSun",serif';
  ctx.lineWidth = 7; ctx.strokeStyle = '#380505'; ctx.lineJoin = 'round';
  ctx.strokeText('赓续血脉', W / 2, 50);
  const tG = ctx.createLinearGradient(0, 32, 0, 64);
  tG.addColorStop(0, '#fff3c0'); tG.addColorStop(0.5, '#e8b33a'); tG.addColorStop(1, '#9e6a12');
  ctx.fillStyle = tG; ctx.fillText('赓续血脉', W / 2, 50);
  ctx.fillStyle = 'rgba(255, 244, 214, 0.55)';
  ctx.font = '14px "STZhongsong","SimSun",serif';
  ctx.fillText('红 色 文 旅 · 数 绘 山 河', W / 2, 78);

  // 2) 精神词牌（上中，照片环绕展示）
  const pX = 100, pY = 140, pW = 440, pH = 150;
  const spG = ctx.createLinearGradient(0, pY, 0, pY + pH);
  spG.addColorStop(0, 'rgba(122, 18, 18, 0.92)'); spG.addColorStop(1, 'rgba(70, 10, 10, 0.95)');
  ctx.fillStyle = spG;
  roundRectPath(ctx, pX, pY, pW, pH, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(232, 179, 58, 0.85)'; ctx.lineWidth = 2.5;
  roundRectPath(ctx, pX + 5, pY + 5, pW - 10, pH - 10, 11); ctx.stroke();
  ctx.strokeStyle = 'rgba(242, 227, 194, 0.4)'; ctx.lineWidth = 1;
  roundRectPath(ctx, pX + 12, pY + 12, pW - 24, pH - 24, 7); ctx.stroke();
  const spC = pY + pH / 2;
  ctx.font = 'bold ' + (spirit.length <= 2 ? 58 : spirit.length <= 4 ? 46 : 36) + 'px "STZhongsong","SimSun",serif';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(30, 3, 3, 0.85)'; ctx.lineJoin = 'round';
  ctx.strokeText(spirit, W / 2, spC - 16);
  const wG = ctx.createLinearGradient(0, spC - 38, 0, spC + 12);
  wG.addColorStop(0, '#fff2c0'); wG.addColorStop(0.5, '#e8b33a'); wG.addColorStop(1, '#9e6a12');
  ctx.fillStyle = wG; ctx.fillText(spirit, W / 2, spC - 16);
  const tag = SPIRIT_TAGS[spirit] || '薪火相传';
  ctx.fillStyle = 'rgba(242, 227, 194, 0.95)';
  ctx.font = '22px "STKaiti","STZhongsong","SimSun",serif';
  ctx.fillText(tag, W / 2, spC + 40);

  // 3) 散落星火（照片上的五枚小剪纸星，错落）
  const stars = [[100, 400, 9], [240, 370, 12], [400, 410, 10], [520, 365, 8], [330, 440, 7]];
  stars.forEach(function (s) {
    drawStarPath(ctx, s[0], s[1], s[2], s[2] * 0.45);
    ctx.fillStyle = 'rgba(232, 179, 58, 0.9)'; ctx.fill();
    ctx.strokeStyle = 'rgba(140, 20, 20, 0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
  });

  // 4) 金色长征路线（横穿，承接星火）
  drawRoute(ctx, W, 560);

  // 5) 三层剪纸山（渐变 + 镂空孔透出照片）
  const mountains = [
    { base: 676, color: '#7a1414', holes: [function (c) { drawStarPath(c, 130, 640, 14, 6, false); }, function (c) { roundRectPath(c, 470, 630, 36, 42, 5, false); }] },
    { base: 712, color: '#8a1414', holes: [function (c) { drawStarPath(c, 340, 682, 12, 5, false); }, function (c) { roundRectPath(c, 140, 678, 26, 30, 4, false); }] },
    { base: 748, color: '#a02020', holes: [function (c) { drawStarPath(c, 250, 726, 10, 4.5, false); }] },
  ];
  mountains.forEach(function (m, li) {
    fillHomePaper(ctx,
      function () {
        ctx.moveTo(0, H); ctx.lineTo(0, m.base);
        for (let x = 0; x <= W; x += 80) {
          ctx.quadraticCurveTo(x + 40, m.base - (li === 0 ? 52 : 34), x + 80, m.base);
        }
        ctx.lineTo(W, H); ctx.closePath();
      },
      m.holes, m.color);
  });

  // 6) 印章盖在山体上（须位于底部红纸带 y836 之上，避免被盖住）
  drawSeal(ctx, 505, 780);

  // 7) 底部红纸带（姓名 + 日期）
  const botG = ctx.createLinearGradient(0, 836, 0, 880);
  botG.addColorStop(0, '#8a1414'); botG.addColorStop(1, '#4a0a0a');
  ctx.fillStyle = botG; ctx.fillRect(0, 836, W, 44);
  ctx.strokeStyle = 'rgba(242, 227, 194, 0.6)'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 837, W - 2, 42);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 26px "STKaiti","STZhongsong","SimSun",serif';
  ctx.fillText('姓名：' + name, W / 2 - 96, 858);
  ctx.font = '18px "STZhongsong","SimSun",serif';
  const now = new Date();
  ctx.fillText(formatZhDate(now), W / 2 + 88, 858);

  // 8) 纸纹 + 做旧 + 暗角
  drawPaperGrain(ctx, W, H, 0.05);
  drawAgedVignette(ctx, W, H, 0.10, 0.30);

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
  const custom = sloganInput && !sloganInput.classList.contains('is-hidden') ? sloganInput.value.trim() : '';
  const spirit = custom || SPIRITS[selectedSpirit] || '红色精神';
  const bgList = getBgList();
  const bg = bgList[selectedBg] || bgList[0];

  const resetBtn = function () {
    if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = icon('sparkle') + ' 生成纪念卡'; }
  };

  const img = new Image();
  img.onload = function () {
    // 确保首页已引的弘雷卓书字体就绪（剪纸横批标题用；未就绪自动回退系统宋体）
    try { if (document.fonts) document.fonts.load('50px "HongLeiZhuoShu"'); } catch (e) { }
    try {
      // 首页入口（无场馆预设）走剪纸「月洞门」专属卡面；详情页/长征入口保持原证书风
      lastCardDataUrl = currentVenueName ? renderCard(img, spirit, name, currentVenueName) : renderHomeCard(img, spirit, name);
    } catch (e) {
      resetBtn();
      showToast('生成失败，请重试');
      return;
    }
    const pv = $('#cardgen-preview');
    const pimg = $('#cardgen-preview-img');
    if (pv && pimg) {
      pimg.src = lastCardDataUrl;
      pv.classList.remove('is-hidden');
      // 盖章落印动效（每次生成重新触发）
      pimg.classList.remove('cardgen-stamping');
      void pimg.offsetWidth;
      pimg.classList.add('cardgen-stamping');
    }
    // 移动端：长按保存提示
    const hint = $('#cardgen-savehint');
    if (hint) {
      if (isTouchDevice() && window.innerWidth < 900) {
        hint.classList.remove('is-hidden');
      } else {
        hint.classList.add('is-hidden');
      }
    }
    const d = $('#cardgen-download'), s = $('#cardgen-share');
    if (d) d.classList.remove('is-hidden');
    if (s) {
      if (navigator.share) {
        s.classList.remove('is-hidden');
      } else {
        s.classList.add('is-hidden');
      }
    }
    resetBtn();
    showToast(icon('check') + ' 纪念卡已生成');
  };
  img.onerror = function () { resetBtn(); showToast('背景图加载失败，请重试'); };
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

/* 下载/分享公共能力：供 cardgen 与 longmarch 纪念卡复用，消除两份同构实现 */
function downloadDataUrl(dataUrl, filename) {
  if (!dataUrl) return;
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  document.body.appendChild(a);
  // 阻止点击冒泡到 document，避免被帷幕导航拦截器当成页面跳转而取消下载
  a.addEventListener('click', function (ev) { ev.stopPropagation(); });
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
}

function shareDataUrl(dataUrl, filename, shareTitle, shareText) {
  if (!dataUrl) return;
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return;
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: shareTitle, text: shareText }).catch(function () { });
      return;
    }
  }
  downloadDataUrl(dataUrl, filename);
}

function download() {
  const prefix = currentVenueName ? '红色纪念卡' : '剪纸纪念卡';
  downloadDataUrl(lastCardDataUrl, prefix + (currentVenueName ? '_' + currentVenueName : '') + '_' + Date.now() + '.png');
}

function share() {
  shareDataUrl(lastCardDataUrl, '红色纪念卡.png', '红色纪念卡',
    currentVenueName ? '我在「数绘红旅」生成了我的红色纪念卡' : '我在「数绘红旅」剪了一张剪纸窗花纪念卡');
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
      <div class="quiz-modal cardgen-modal" role="dialog" aria-modal="true" aria-label="红色纪念卡生成">
        <button class="cardgen-close" aria-label="关闭">✕</button>
        <h3>${icon('card')} 红色纪念卡</h3>
        <p>输入姓名、选择精神，生成一张可带走、可分享的红色文创纪念卡</p>
        <div class="cardgen-venue is-hidden" id="cardgen-venue"></div>

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
            ${SPIRITS.map((s, i) => `<button type="button" class="cardgen-chip${i === 0 ? ' selected' : ''}" data-i="${i}" aria-pressed="${i === 0}">${s}</button>`).join('')}
            <button type="button" class="cardgen-chip" data-custom="1" aria-pressed="false">${icon('pen')} 自定义</button>
          </div>
          <input type="text" id="cardgen-slogan" class="is-hidden" placeholder="自定义寄语（最多10字）" maxlength="10">
        </div>

        <div class="cardgen-actions">
          <button type="button" class="btn primary" id="cardgen-generate">${icon('sparkle')} 生成纪念卡</button>
          <button type="button" class="btn secondary is-hidden" id="cardgen-download">${icon('download')} 下载 PNG</button>
          <button type="button" class="btn secondary is-hidden" id="cardgen-share">${icon('share')} 分享</button>
        </div>

        <div class="cardgen-preview is-hidden" id="cardgen-preview">
          <img id="cardgen-preview-img" alt="纪念卡预览">
        </div>
        <div class="cardgen-savehint is-hidden" id="cardgen-savehint">${icon('bulb')} 长按图片可保存到相册</div>
      </div>
    `;
  document.body.appendChild(overlay);

  overlay.querySelector('.cardgen-close').addEventListener('click', close);
  onOverlayClick(overlay, close);

  overlay.querySelectorAll('.cardgen-chip').forEach(function (ch) {
    ch.addEventListener('click', function () {
      overlay.querySelectorAll('.cardgen-chip').forEach(function (x) {
        const sel = x === ch;
        x.classList.toggle('selected', sel);
        x.setAttribute('aria-pressed', String(sel));
      });
      const slogan = $('#cardgen-slogan');
      if (ch.dataset.custom) {
        slogan.classList.remove('is-hidden');
        slogan.focus();
      } else {
        selectedSpirit = parseInt(ch.dataset.i, 10);
        slogan.classList.add('is-hidden');
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
/* 背景选择网格构建（cardgen 与 cz-card-modal 共用，消除两份近同实现）：
   grid: 容器；items: [{label, src}]；selected: 当前选中索引；onPick(i)；cls: 元素类名。
   每次调用重建网格并恢复选中高亮，元素带 role/tabindex + Enter/Space 键盘可达 */
function buildBgGrid(grid, items, selected, onPick, cls = 'cardgen-bg') {
  if (!grid) return;
  grid.innerHTML = items.map((b, i) =>
    `<div class="${cls}${i === selected ? ' selected' : ''}" role="button" tabindex="0" aria-pressed="${i === selected}" data-i="${i}" data-src="${escapeAttr(resolveAssetPath(b.src))}"><span>${b.label}</span></div>`
  ).join('');
  grid.querySelectorAll('.' + cls).forEach(function (el) {
    const src = el.dataset.src;
    if (src) el.style.backgroundImage = 'url(' + src + ')';
    const pick = function () { onPick(parseInt(el.dataset.i, 10)); };
    el.addEventListener('click', pick);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
    });
  });
}

function renderBgSelector() {
  const grid = $('#cardgen-bgs');
  if (!grid) return;
  const list = getBgList();
  // 保留用户已选背景；仅当选择越界（如换场馆后列表变化）才落回默认（0 = 有场馆图时「本场馆」，否则第一张）
  if (!Number.isInteger(selectedBg) || selectedBg < 0 || selectedBg >= list.length) selectedBg = 0;
  // 每次重建背景网格并恢复选中高亮（修复"重开后高亮恒在第 0 格、生成却用 selectedBg"的脱节）
  buildBgGrid(grid, list, selectedBg, function (i) {
    selectedBg = i;
    renderBgSelector();
    // rebuild 后把焦点还给刚选的背景块（否则键盘用户每次选择焦点掉回 body）
    const sel = grid.querySelector('.cardgen-bg[data-i="' + i + '"]');
    if (sel) sel.focus({ preventScroll: true });
  }, 'cardgen-bg');
}

function open(venueName, venueImage) {
  if (!overlay) buildModal();
  currentVenueName = (venueName || '').trim();
  currentVenueImage = (venueImage || '').trim();
  const venueEl = $('#cardgen-venue');
  if (venueEl) {
    if (currentVenueName) {
      venueEl.classList.remove('is-hidden');
      venueEl.innerHTML = icon('pin') + ' 纪念主题：' + escapeHtml(currentVenueName);
    } else {
      venueEl.classList.add('is-hidden');
      venueEl.textContent = '';
    }
  }
  renderBgSelector();
  overlay.classList.add('open');
  lockBodyScroll();
  const nameInput = $('#cardgen-name');
  trapFocus(overlay.querySelector('.cardgen-modal'), {
    initialFocus: nameInput,
    onClose: close
  });
}
function close() {
  // 仅当本弹窗确实打开时才释放滚动锁；计数式锁避免清掉其他弹窗持有的锁
  if (!overlay || !overlay.classList.contains('open')) return;
  releaseFocus();
  overlay.classList.remove('open');
  unlockBodyScroll();
}

function init() {
  if (!overlay) buildModal();
}

// 暴露 renderCard/downloadDataUrl/shareDataUrl/SPIRITS/buildBgGrid：供长征纪念卡专用弹窗等复用
export { init, open, renderCard, downloadDataUrl, shareDataUrl, SPIRITS, buildBgGrid };
