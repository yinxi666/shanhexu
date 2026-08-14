/* ============================================================
   赓续血脉・数绘红旅 — 红色江山电影级开场动画
   原 index.html 内联脚本提取，职责：首页 entrance-canvas 全屏叙事动画
   ============================================================ */

import { resolveAssetPath } from './utils.js?v=2026081428';

export function initEntranceAnimation() {
  // sessionStorage 访问防护（Safari 隐私模式等会抛异常，避免开场黑屏卡死）
  function isEntranceDone() {
    try { return !!sessionStorage.getItem('entrance_done_v2'); } catch (e) { return false; }
  }
  function markEntranceDone() {
    try { sessionStorage.setItem('entrance_done_v2', '1'); } catch (e) { }
  }
  function finishEntrance() {
    try { window.dispatchEvent(new CustomEvent('entranceFinished')); } catch (e) { }
  }
  // 只在首页存在 entrance-overlay 时初始化，避免非首页直接调用报错
  if (!document.getElementById('entrance-overlay')) return;
  // 背景页面对键盘焦点不设防：开场期间把主体内容标为 inert（真正挡 Tab 焦点）+
  // aria-hidden 作旧引擎回退，焦点只落在遮罩内（skip 已 autofocus）
  const _entranceMain = document.querySelector('main');
  const _entranceHeader = document.getElementById('site-header');
  const _entranceFooter = document.getElementById('site-footer');
  if (_entranceMain) { _entranceMain.setAttribute('inert', ''); _entranceMain.setAttribute('aria-hidden', 'true'); }
  if (_entranceHeader) { _entranceHeader.setAttribute('inert', ''); _entranceHeader.setAttribute('aria-hidden', 'true'); }
  if (_entranceFooter) { _entranceFooter.setAttribute('inert', ''); _entranceFooter.setAttribute('aria-hidden', 'true'); }
  const _restoreEntranceInert = function () {
    if (_entranceMain) { _entranceMain.removeAttribute('inert'); _entranceMain.removeAttribute('aria-hidden'); }
    if (_entranceHeader) { _entranceHeader.removeAttribute('inert'); _entranceHeader.removeAttribute('aria-hidden'); }
    if (_entranceFooter) { _entranceFooter.removeAttribute('inert'); _entranceFooter.removeAttribute('aria-hidden'); }
  };
  window.addEventListener('entranceFinished', _restoreEntranceInert);
  // 已播放过则跳过（也要复位 inert/aria-hidden）
  if (isEntranceDone()) {
    _restoreEntranceInert();
    let el = document.getElementById('entrance-overlay');
    if (el) el.remove();
    finishEntrance();
    return;
  }
  // 尊重系统"减弱动态效果"设置：直接跳过全屏叙事（与 longmarch 的 reduced-motion 处理保持一致）
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let el = document.getElementById('entrance-overlay');
    if (el) el.remove();
    document.documentElement.classList.remove('entrance-active');
    markEntranceDone();
    finishEntrance();
    return;
  }
  // bfcache 恢复时清理残留
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && isEntranceDone()) {
      let el = document.getElementById('entrance-overlay');
      if (el) { el.classList.add('fade-out'); setTimeout(function () { el.remove(); }, 800); }
      document.documentElement.classList.remove('entrance-active');
    }
  });
  document.documentElement.classList.add('entrance-active');

  let canvas = document.getElementById('entrance-canvas');
  if (!canvas) {
    // 缺 canvas：与 reduced-motion 分支一致的完整清理，避免 entrance-active + 遮罩 + inert 卡死页面
    let el = document.getElementById('entrance-overlay');
    if (el) el.remove();
    document.documentElement.classList.remove('entrance-active');
    _restoreEntranceInert();
    markEntranceDone();
    finishEntrance();
    return;
  }
  let ctx = canvas.getContext('2d', { willReadFrequently: false });
  let isMobile = window.innerWidth < 768;
  let DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2);
  let W = 0, H = 0;
  let rafId = null; // 动画循环句柄，供跳过/结束分支取消
  let entranceFinished = false; // 入场动画结束后，resize 不再重建粒子层（场景已移除，纯浪费）

  // ===== 叙事时间线 =====
  let TL = {
    spark: 0.3,
    spread: 1.2,
    dawn: 2.0,
    mountains: 2.2,
    mountainsEnd: 3.4,
    tiananmen: 3.4,
    titleCrack: 4.2,
    subtitle: 5.2,
    end: 6.4
  };
  let totalDuration = TL.end;
  let t = 0;
  let lastTime = performance.now();

  // ===== 缓动函数 =====
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function easeOutExpo(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // 星火状态单源计算：全屏光晕与星火弧/余烬两处共用 sparkT/breathe/sparkR/sparkAlpha，避免两套数学漂移
  function sparkState(t) {
    let sparkT = t - TL.spark;
    let breathe = 0.6 + 0.4 * Math.sin(t * 5);
    let sparkR = Math.max(1, (1.5 + breathe * 1.8) * clamp(sparkT * 2, 0, 1));
    let sparkAlpha = clamp(sparkT * 2, 0, 1) * clamp((TL.dawn + 0.3 - t), 0, 1);
    return { sparkT, sparkR, sparkAlpha };
  }

  // ===== DPR 适配 =====
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();

  // ===== 粒子贴图预渲染（性能优化） =====
  function makeSprite(inner, mid) {
    let c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.width = 64; c.height = 64;
    let cx = c.getContext('2d');
    let g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, inner);
    g.addColorStop(0.3, mid);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, 64, 64);
    return c;
  }
  let sparkSprite = makeSprite('rgba(255,220,120,1)', 'rgba(255,160,50,0.5)');
  let emberSprite = makeSprite('rgba(255,140,40,1)', 'rgba(220,60,20,0.4)');
  let starSprite = makeSprite('rgba(255,240,200,0.8)', 'rgba(200,180,150,0.2)');

  // ===== 山脉生成 =====
  let mountains = [];
  function generateMountains() {
    mountains = [];
    let count = 12;
    for (let i = 0; i < count; i++) {
      let points = [];
      let segs = 40;
      let baseY = H * 0.58;
      let amp = H * 0.32 * (1 - i * 0.06);
      for (let j = 0; j <= segs; j++) {
        let x = (j / segs) * W;
        let noise = Math.sin(j * 0.25 + i * 2.3) * amp * 0.45
          + Math.sin(j * 0.6 + i * 1.5) * amp * 0.3
          + Math.sin(j * 1.1 + i * 0.7) * amp * 0.25;
        points.push({ x: x, y: baseY + amp * 0.15 - noise });
      }
      mountains.push(points);
    }
  }
  generateMountains();

  // ===== 天安门本地图片 + 火焰蔓延效果 =====
  let tiananmenImg = new Image();
  let tiananmenCanvas = null;
  let tiananmenReady = false;
  tiananmenImg.onload = function () {
    try {
      let oc = document.createElement('canvas');
      oc.setAttribute('aria-hidden', 'true');
      let iw = tiananmenImg.naturalWidth || tiananmenImg.width;
      let ih = tiananmenImg.naturalHeight || tiananmenImg.height;
      oc.width = iw; oc.height = ih;
      let octx = oc.getContext('2d', { willReadFrequently: true });
      octx.drawImage(tiananmenImg, 0, 0);
      let imgData = octx.getImageData(0, 0, iw, ih);
      let d = imgData.data;
      let edgeFade = Math.round(Math.min(iw, ih) * 0.15);
      for (let y = 0; y < ih; y++) {
        for (let x = 0; x < iw; x++) {
          let idx = (y * iw + x) * 4;
          let lum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
          let distL = x, distR = iw - x, distT = y;
          let minDist = Math.min(distL, distR, distT);
          let edgeAlpha = minDist < edgeFade ? Math.pow(minDist / edgeFade, 1.5) : 1;
          if (lum > 140) {
            d[idx + 3] = 0;
          } else if (lum > 85) {
            let fade = (140 - lum) / 55;
            let dark = Math.pow(lum / 255, 1.2) * 80;
            d[idx] = Math.round(dark * 2.2 + 15);
            d[idx + 1] = Math.round(dark * 0.45);
            d[idx + 2] = Math.round(dark * 0.28);
            d[idx + 3] = Math.round(255 * fade * edgeAlpha);
          } else {
            lum = ((lum - 35) * 1.6) + 35;
            lum = Math.max(0, Math.min(255, lum));
            let dark2 = Math.pow(lum / 255, 1.2) * 80;
            d[idx] = Math.round(dark2 * 2.2 + 15);
            d[idx + 1] = Math.round(dark2 * 0.45);
            d[idx + 2] = Math.round(dark2 * 0.28);
            d[idx + 3] = Math.round(255 * edgeAlpha);
          }
        }
      }
      octx.putImageData(imgData, 0, 0);
      tiananmenCanvas = oc;
      tiananmenReady = true;
    } catch (e) {
      tiananmenReady = true;
    }
  };
  tiananmenImg.onerror = function () { tiananmenReady = false; };
  tiananmenImg.src = resolveAssetPath('assets/通用/天安门.webp');

  let taFireCanvas = document.createElement('canvas');
  taFireCanvas.setAttribute('aria-hidden', 'true');
  let taFireCtx = taFireCanvas.getContext('2d', { willReadFrequently: true });
  let taEmbers = [];

  function drawTiananmen(cx, baseY, scale, alpha, time) {
    let s = scale;
    ctx.save();
    ctx.globalAlpha = alpha;

    if (tiananmenReady && tiananmenCanvas) {
      let imgW = 680 * s;
      let imgH = imgW * (tiananmenCanvas.height / tiananmenCanvas.width);
      let imgX = cx - imgW / 2;
      let imgY = baseY - imgH;

      let fireT = Math.max(0, Math.min(1, (time - TL.tiananmen - 0.3) / 1.8));
      let fireEase = 1 - Math.pow(1 - fireT, 3);
      let fireR = Math.max(1, Math.hypot(imgW, imgH) * 0.6 * fireEase);

      taFireCanvas.width = Math.max(1, Math.round(imgW));
      taFireCanvas.height = Math.max(1, Math.round(imgH));
      let fc = taFireCtx;
      fc.setTransform(1, 0, 0, 1, 0, 0);
      fc.clearRect(0, 0, taFireCanvas.width, taFireCanvas.height);
      fc.drawImage(tiananmenCanvas, 0, 0, taFireCanvas.width, taFireCanvas.height);

      let taAlphaData = fc.getImageData(0, 0, taFireCanvas.width, taFireCanvas.height);
      let taAlpha = new Uint8ClampedArray(taAlphaData.data.length / 4);
      for (let ai = 0; ai < taAlphaData.data.length; ai += 4) {
        taAlpha[ai / 4] = taAlphaData.data[ai + 3];
      }

      fc.globalCompositeOperation = 'lighter';
      let srcX = taFireCanvas.width / 2;
      let srcY = taFireCanvas.height;

      if (fireEase > 0) {
        let fg = fc.createRadialGradient(srcX, srcY, 0, srcX, srcY, fireR);
        fg.addColorStop(0, 'rgba(255,220,160,0.5)');
        fg.addColorStop(0.25, 'rgba(240,190,120,0.32)');
        fg.addColorStop(0.6, 'rgba(200,160,90,0.14)');
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        fc.fillStyle = fg;
        fc.fillRect(0, 0, taFireCanvas.width, taFireCanvas.height);

        if (fireEase > 0.4) {
          let fl = 0.9 + 0.1 * Math.sin(time * 4);
          fc.globalAlpha = (fireEase - 0.4) * 0.07 * fl;
          fc.fillStyle = 'rgba(255,210,140,1)';
          fc.fillRect(0, 0, taFireCanvas.width, taFireCanvas.height);
          fc.globalAlpha = 1;
        }
      }

      fc.globalCompositeOperation = 'source-over';
      let currentData = fc.getImageData(0, 0, taFireCanvas.width, taFireCanvas.height);
      let cd = currentData.data;
      for (let ci = 0; ci < cd.length; ci += 4) {
        let idx2 = ci / 4;
        cd[ci + 3] = Math.min(cd[ci + 3], taAlpha[idx2]);
      }
      fc.putImageData(currentData, 0, 0);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      let backG = ctx.createRadialGradient(cx, baseY - imgH * 0.4, 0, cx, baseY - imgH * 0.4, Math.max(1, imgW * 0.5));
      backG.addColorStop(0, 'rgba(255,220,160,' + (alpha * 0.3) + ')');
      backG.addColorStop(0.5, 'rgba(220,180,130,' + (alpha * 0.16) + ')');
      backG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = backG;
      ctx.fillRect(imgX - 40, imgY - 20, imgW + 80, imgH + 40);
      ctx.restore();

      ctx.drawImage(taFireCanvas, imgX, imgY);

      if (fireEase > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.1 * fireEase;
        ctx.shadowColor = '#fff0cc';
        ctx.shadowBlur = 5 * s;
        ctx.drawImage(taFireCanvas, imgX, imgY);
        ctx.restore();
      }

      if (fireEase > 0) {
        if (fireEase < 1) {
          if (Math.random() < 0.3) {
            let ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
            let dist = fireR * (0.5 + Math.random() * 0.3);
            taEmbers.push({
              x: cx + Math.cos(ang) * dist * 0.6,
              y: baseY + Math.sin(ang) * dist,
              vx: (Math.random() - 0.5) * 0.3,
              vy: -Math.random() * 1.0 - 0.2,
              life: 1, decay: 0.012 + Math.random() * 0.01,
              size: Math.random() * 1.0 + 0.4,
              hue: 25 + Math.random() * 25,
              flicker: Math.random() * Math.PI * 2
            });
          }
        }
        else if (Math.random() < 0.15) {
          taEmbers.push({
            x: imgX + Math.random() * imgW,
            y: imgY + imgH * 0.2,
            vx: (Math.random() - 0.5) * 0.2,
            vy: -Math.random() * 0.8 - 0.15,
            life: 1, decay: 0.015 + Math.random() * 0.01,
            size: Math.random() * 0.8 + 0.3,
            hue: 30 + Math.random() * 20,
            flicker: Math.random() * Math.PI * 2
          });
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let ei = taEmbers.length - 1; ei >= 0; ei--) {
        let e = taEmbers[ei];
        e.x += e.vx; e.y += e.vy; e.vy *= 0.98;
        e.vx += (Math.random() - 0.5) * 0.05;
        e.life -= e.decay; e.flicker += 0.15;
        if (e.life <= 0) { taEmbers.splice(ei, 1); continue; }
        let ea = e.life * (0.7 + 0.3 * Math.sin(e.flicker));
        let er = Math.max(0.5, e.size * 3.5);
        let eg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, er);
        eg.addColorStop(0, 'hsla(' + e.hue + ',100%,75%,' + ea + ')');
        eg.addColorStop(0.4, 'hsla(' + e.hue + ',100%,55%,' + (ea * 0.6) + ')');
        eg.addColorStop(1, 'hsla(' + e.hue + ',100%,40%,0)');
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, er, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (fireEase > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        let refl = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, imgW * 0.38);
        let reflPulse = 0.8 + 0.2 * Math.sin(time * 3);
        refl.addColorStop(0, 'rgba(255,220,160,' + (0.07 * fireEase * reflPulse) + ')');
        refl.addColorStop(0.5, 'rgba(220,190,140,' + (0.035 * fireEase) + ')');
        refl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = refl;
        ctx.fillRect(cx - imgW * 0.5, baseY - 10, imgW, 30);
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(0,0,0,' + (alpha * 0.4) + ')';
      ctx.beginPath();
      ctx.ellipse(cx, baseY + 3 * s, imgW * 0.42, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Fallback: 极简剪影
    ctx.fillStyle = '#0f0303';
    ctx.fillRect(cx - 95 * s, baseY - 8 * s, 190 * s, 8 * s);
    ctx.fillRect(cx - 88 * s, baseY - 38 * s, 176 * s, 30 * s);
    ctx.fillRect(cx - 60 * s, baseY - 66 * s, 120 * s, 28 * s);
    ctx.beginPath();
    ctx.moveTo(cx - 100 * s, baseY - 38 * s);
    ctx.lineTo(cx - 108 * s, baseY - 48 * s);
    ctx.lineTo(cx + 108 * s, baseY - 48 * s);
    ctx.lineTo(cx + 100 * s, baseY - 38 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 72 * s, baseY - 66 * s);
    ctx.lineTo(cx - 85 * s, baseY - 78 * s);
    ctx.lineTo(cx + 85 * s, baseY - 78 * s);
    ctx.lineTo(cx + 72 * s, baseY - 66 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, baseY - 100 * s);
    ctx.lineTo(cx - 12 * s, baseY - 78 * s);
    ctx.lineTo(cx + 12 * s, baseY - 78 * s);
    ctx.fill();
    ctx.restore();
  }

  // ===== 大气颗粒（胶片颗粒） =====
  let grainCanvas;
  function initGrain() {
    try {
      grainCanvas = document.createElement('canvas');
      grainCanvas.setAttribute('aria-hidden', 'true');
      grainCanvas.width = W; grainCanvas.height = H;
      let gc = grainCanvas.getContext('2d');
      let imgData = gc.createImageData(W, H);
      for (let i = 0; i < imgData.data.length; i += 4) {
        let n = Math.random() * 30;
        imgData.data[i] = n; imgData.data[i + 1] = n; imgData.data[i + 2] = n;
        imgData.data[i + 3] = 255;
      }
      gc.putImageData(imgData, 0, 0);
    } catch (e) { grainCanvas = null; }
  }
  initGrain();

  // ===== 山雾层 =====
  let fogLayers = [];
  function initFog() {
    fogLayers = [];
    for (let i = 0; i < 3; i++) {
      fogLayers.push({
        y: H * (0.5 + i * 0.05),
        speed: 0.05 + i * 0.03,
        offset: Math.random() * W,
        alpha: 0.04 + i * 0.02,
        height: 30 + i * 15
      });
    }
  }
  initFog();

  // ===== 五角星（光芒四射） =====
  function drawStarShining(cx, cy, size, time, alpha) {
    if (alpha <= 0) return;
    let a = clamp(alpha, 0, 1);
    let breathe = 0.92 + 0.08 * (0.5 + 0.5 * Math.sin(time * 3.5 + 0.3));
    let twinkle = 0.97 + 0.03 * (0.5 + 0.5 * Math.sin(time * 10));
    let s = size * breathe * twinkle;
    let rot = time * 0.25;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let haloR = s * 5.5;
    let haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
    haloGrad.addColorStop(0, 'rgba(255,230,150,' + (a * 0.28) + ')');
    haloGrad.addColorStop(0.25, 'rgba(255,200,90,' + (a * 0.18) + ')');
    haloGrad.addColorStop(0.6, 'rgba(220,130,40,' + (a * 0.07) + ')');
    haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
    ctx.fill();
    let rayAlpha = a * 0.38;
    for (let k = 0; k < 5; k++) {
      let ang = -Math.PI / 2 + rot + k * (Math.PI * 2 / 5);
      let rayLen = s * (3.5 + 0.8 * (0.5 + 0.5 * Math.sin(time * 2.5 + k)));
      let rayW = s * 0.10;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      let rayGrad = ctx.createLinearGradient(-rayLen, 0, rayLen, 0);
      rayGrad.addColorStop(0, 'rgba(255,220,140,0)');
      rayGrad.addColorStop(0.5, 'rgba(255,240,180,' + rayAlpha + ')');
      rayGrad.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, rayLen, rayW, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    let shortAlpha = a * 0.22;
    for (let kk = 0; kk < 5; kk++) {
      let sang = -Math.PI / 2 + rot * 1.15 + kk * (Math.PI * 2 / 5) + Math.PI / 5;
      let sLen = s * (1.6 + 0.5 * (0.5 + 0.5 * Math.sin(time * 4 + kk * 0.7)));
      let sW = s * 0.05;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sang);
      let sg = ctx.createLinearGradient(-sLen, 0, sLen, 0);
      sg.addColorStop(0, 'rgba(255,210,120,0)');
      sg.addColorStop(0.5, 'rgba(255,235,170,' + shortAlpha + ')');
      sg.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(0, 0, sLen, sW, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    let crossA = a * 0.42;
    let crossLen = s * 6;
    let cw = s * 0.12;
    let cgH = ctx.createLinearGradient(cx - crossLen, cy, cx + crossLen, cy);
    cgH.addColorStop(0, 'rgba(255,255,220,0)');
    cgH.addColorStop(0.5, 'rgba(255,255,230,' + crossA + ')');
    cgH.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = cgH;
    ctx.fillRect(cx - crossLen, cy - cw / 2, crossLen * 2, cw);
    let cgV = ctx.createLinearGradient(cx, cy - crossLen, cx, cy + crossLen);
    cgV.addColorStop(0, 'rgba(255,255,220,0)');
    cgV.addColorStop(0.5, 'rgba(255,255,230,' + crossA + ')');
    cgV.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = cgV;
    ctx.fillRect(cx - cw / 2, cy - crossLen, cw, crossLen * 2);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot * 0.1);
    ctx.beginPath();
    for (let si = 0; si < 10; si++) {
      let ang2 = -Math.PI / 2 + si * Math.PI / 5;
      let r2 = (si % 2 === 0) ? s : s * 0.4;
      let px2 = Math.cos(ang2) * r2;
      let py2 = Math.sin(ang2) * r2;
      if (si === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
    }
    ctx.closePath();
    let coreGrad = ctx.createRadialGradient(-s * 0.08, -s * 0.12, 0, 0, 0, s * 1.1);
    coreGrad.addColorStop(0, 'rgba(255,245,210,' + (a * 0.92) + ')');
    coreGrad.addColorStop(0.3, 'rgba(255,210,80,' + (a * 0.85) + ')');
    coreGrad.addColorStop(0.7, 'rgba(240,160,30,' + (a * 0.78) + ')');
    coreGrad.addColorStop(1, 'rgba(200,100,15,' + (a * 0.75) + ')');
    ctx.fillStyle = coreGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,250,225,' + (a * 0.55) + ')';
    ctx.lineWidth = s * 0.045;
    ctx.lineJoin = 'miter';
    ctx.stroke();
    ctx.restore();
  }

  // ===== 三层粒子系统 =====
  let stars = [];
  function initStars() {
    stars = [];
    for (let i = 0; i < (isMobile ? 80 : 170); i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.7,
        size: 0.4 + Math.random() * 1.7,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.8
      });
    }
  }
  let sparks = [];
  function initSparks() {
    sparks = [];
    for (let i = 0; i < (isMobile ? 20 : 50); i++) {
      sparks.push({
        x: Math.random() * W,
        y: H * 0.7 + Math.random() * H * 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.3 - Math.random() * 0.8,
        size: 1 + Math.random() * 2.5,
        life: Math.random(),
        decay: 0.003 + Math.random() * 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  let trails = [];
  function spawnTrail() {
    if (trails.length >= 8) return;
    trails.push({
      x: Math.random() * W,
      y: H * 0.2 + Math.random() * H * 0.3,
      vx: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3),
      vy: (Math.random() - 0.5) * 1,
      size: 3 + Math.random() * 4,
      life: 1,
      decay: 0.008 + Math.random() * 0.005,
      trail: []
    });
  }
  initStars();
  initSparks();

  // ===== 雁阵剪影 =====
  let geeseFormations = [];
  function initGeese() {
    geeseFormations = [];
    for (let f = 0; f < 2; f++) {
      let birds = 7 - f * 2;
      let arr = [];
      for (let b = 0; b < birds; b++) {
        let side = (b % 2 === 1) ? -1 : 1;
        let tier = Math.ceil(b / 2);
        arr.push({
          tier: tier,
          side: side,
          wingPhase: Math.random() * Math.PI * 2,
          wingSpeed: 4 + Math.random() * 2
        });
      }
      geeseFormations.push({
        birds: arr,
        baseSize: 4 + f * 1.2,
        startT: 1.2 + f * 0.8,
        duration: 4.2 + f * 0.4,
        startX: W * 1.15,
        startY: H * (0.10 + f * 0.08),
        endX: -W * 0.15,
        endY: H * (0.04 + f * 0.03),
        spacingX: 18 + f * 3,
        spacingY: 7 + f * 1.2
      });
    }
  }
  initGeese();

  function drawGeese(time) {
    for (let f = 0; f < geeseFormations.length; f++) {
      let gf = geeseFormations[f];
      let lifeT = clamp((time - gf.startT) / gf.duration, 0, 1);
      if (lifeT <= 0) continue;
      let fadeIn = clamp((time - gf.startT) / 0.35, 0, 1);
      let fadeOut = clamp((gf.startT + gf.duration - time) / 0.4, 0, 1);
      let formAlpha = fadeIn * fadeOut * 0.28;
      let curX = gf.startX + (gf.endX - gf.startX) * lifeT;
      let curY = gf.startY + (gf.endY - gf.startY) * lifeT;
      for (let b = 0; b < gf.birds.length; b++) {
        let bird = gf.birds[b];
        let bx = curX - bird.side * bird.tier * gf.spacingX;
        let by = curY + bird.tier * gf.spacingY;
        let bs = gf.baseSize;
        bird.wingPhase += bird.wingSpeed * 0.016;
        let flap = Math.sin(bird.wingPhase);
        let wingUp = 0.6 + 0.4 * (1 + flap) * 0.5;
        let wingDown = 0.35 + 0.35 * (1 - flap) * 0.5;
        ctx.save();
        ctx.translate(bx, by);
        ctx.fillStyle = 'rgba(20,5,5,' + formAlpha + ')';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-bs * 0.9, -bs * wingUp * 1.7, -bs * 1.9, -bs * 0.4 * wingUp);
        ctx.quadraticCurveTo(-bs * 1.1, bs * wingDown * 0.5, -bs * 0.3, bs * wingDown * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(bs * 0.9, -bs * wingUp * 1.7, bs * 1.9, -bs * 0.4 * wingUp);
        ctx.quadraticCurveTo(bs * 1.1, bs * wingDown * 0.5, bs * 0.3, bs * wingDown * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, 0, bs * 0.35, bs * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ===== 水墨云纹理 =====
  let inkClouds = [];
  function initInkClouds() {
    inkClouds = [];
    for (let i = 0; i < 4; i++) {
      inkClouds.push({
        x: Math.random() * W * 1.2 - W * 0.1,
        y: H * (0.08 + Math.random() * 0.42),
        w: W * (0.35 + Math.random() * 0.3),
        h: H * (0.08 + Math.random() * 0.08),
        speedX: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 6),
        alpha: 0.04 + Math.random() * 0.045,
        hueShift: Math.random()
      });
    }
  }
  initInkClouds();

  function drawInkClouds(time, intensity) {
    if (intensity <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < inkClouds.length; i++) {
      let c = inkClouds[i];
      c.x += c.speedX * 0.016;
      if (c.speedX > 0 && c.x - c.w > W) c.x = -c.w - 10;
      if (c.speedX < 0 && c.x + c.w < 0) c.x = W + c.w + 10;
      let a = c.alpha * intensity;
      let r = 255;
      let g = Math.round(245 - c.hueShift * 20);
      let bCol = Math.round(230 - c.hueShift * 40);
      let blobs = 5;
      for (let k = 0; k < blobs; k++) {
        let kr = k / (blobs - 1);
        let bx = c.x - c.w * 0.5 + c.w * kr;
        let by = c.y + Math.sin(kr * Math.PI * 2 + time * 0.5 + i) * c.h * 0.15;
        let bw = c.w * (0.35 + 0.15 * Math.sin(kr * 5 + i));
        let bh = c.h * (0.55 + 0.25 * Math.cos(kr * 3 + i * 2));
        let balpha = a * Math.sin(kr * Math.PI);
        if (balpha <= 0.001) continue;
        let cg = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(bw, bh));
        cg.addColorStop(0, 'rgba(' + r + ',' + g + ',' + bCol + ',' + balpha + ')');
        cg.addColorStop(0.6, 'rgba(' + r + ',' + g + ',' + bCol + ',' + (balpha * 0.3) + ')');
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(bx, by, bw, bh, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ===== 星火 =====
  let sparkX, sparkY;
  function updateSparkPos() { sparkX = W * 0.5; sparkY = H * 0.72; }
  updateSparkPos();

  let embers = [];
  function spawnEmber(x, y, count) {
    for (let i = 0; i < count; i++) {
      embers.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 1.5,
        size: 1 + Math.random() * 2,
        life: 1,
        decay: 0.01 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  // ===== 山雾 =====
  function drawFog(time, intensity) {
    if (intensity <= 0) return;
    ctx.save();
    for (let i = 0; i < fogLayers.length; i++) {
      let fl = fogLayers[i];
      fl.offset += fl.speed;
      let alpha = fl.alpha * intensity;
      if (alpha <= 0) continue;
      let grad = ctx.createLinearGradient(0, fl.y - fl.height / 2, 0, fl.y + fl.height / 2);
      grad.addColorStop(0, 'rgba(120,60,40,0)');
      grad.addColorStop(0.5, 'rgba(140,80,50,' + alpha + ')');
      grad.addColorStop(1, 'rgba(100,50,30,0)');
      ctx.fillStyle = grad;
      let yo = (fl.offset % W + W) % W;
      ctx.fillRect(-yo, fl.y - fl.height / 2, W, fl.height);
      ctx.fillRect(W - yo, fl.y - fl.height / 2, W, fl.height);
    }
    ctx.restore();
  }

  // ===== 暗角 =====
  function drawVignette() {
    let grad = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ===== 胶片颗粒 =====
  function drawGrain(time, intensity) {
    if (!grainCanvas || intensity <= 0) return;
    ctx.save();
    ctx.globalAlpha = intensity * 0.04;
    let offsetX = (time * 5) % 4;
    let offsetY = (time * 3) % 4;
    ctx.drawImage(grainCanvas, -offsetX, -offsetY);
    ctx.restore();
  }

  // ===== 地面余烬层 =====
  let groundEmbers = [];
  function initGroundEmbers() {
    groundEmbers = [];
    for (let i = 0; i < (isMobile ? 10 : 25); i++) {
      groundEmbers.push({
        x: Math.random() * W,
        y: H * 0.65 + Math.random() * H * 0.3,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.1 - Math.random() * 0.3,
        size: 0.5 + Math.random() * 1.5,
        life: Math.random(),
        decay: 0.002 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  initGroundEmbers();

  // ===== 背景诗词文字 =====
  let bgTexts = [
    '星星之火 可以燎原',
    '为有牺牲多壮志 敢教日月换新天',
    '红军不怕远征难 万水千山只等闲',
    '雄关漫道真如铁 而今迈步从头越',
    '数风流人物 还看今朝',
    '江山如此多娇',
    '不到长城非好汉',
    '天翻地覆慨而慷'
  ];

  // ===== 主绘制 =====
  function draw(now) {
    let dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    t = Math.min(t + dt, totalDuration);

    ctx.clearRect(0, 0, W, H);

    // ===== 1. 背景渐变 =====
    let bgP = clamp(t / 1.5, 0, 1);
    let bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.75, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.9);
    bgGrad.addColorStop(0, interpColor([30, 12, 6], [90, 40, 20], bgP));
    bgGrad.addColorStop(0.4, interpColor([18, 6, 4], [50, 18, 10], bgP));
    bgGrad.addColorStop(1, interpColor([10, 3, 2], [22, 8, 6], bgP));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ===== 星火光晕（全屏） =====
    if (t >= TL.spark && t < TL.dawn + 0.3) {
      const ss = sparkState(t);
      let sparkGlow_full = Math.max(1, ss.sparkR * 6);
      // 星火弧在下方 translate(0, H*0.05) 内绘制（屏幕坐标 = sparkY + H*0.05），
      // 光晕在此处补齐同一偏移，否则全屏光晕与内弧垂直错位约 5% 屏高
      let glowY = sparkY + H * 0.05;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = ss.sparkAlpha * 0.3;
      ctx.drawImage(emberSprite, sparkX - sparkGlow_full, glowY - sparkGlow_full, sparkGlow_full * 2, sparkGlow_full * 2);
      ctx.globalAlpha = ss.sparkAlpha * 0.45;
      ctx.drawImage(sparkSprite, sparkX - sparkGlow_full * 0.5, glowY - sparkGlow_full * 0.5, sparkGlow_full, sparkGlow_full);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ===== 黎明体积光束（全屏） =====
    if (t >= TL.spread) {
      let dawnT_full = clamp((t - TL.spread) / (TL.mountains - TL.spread), 0, 1);
      let dawnEase_full = easeOutCubic(dawnT_full);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      let coreR_full = Math.max(1, dawnEase_full * W * 0.35);
      let coreGrad_full = ctx.createRadialGradient(sparkX, sparkY, 0, sparkX, sparkY, coreR_full);
      coreGrad_full.addColorStop(0, 'rgba(255,210,100,' + (0.5 * dawnT_full) + ')');
      coreGrad_full.addColorStop(0.2, 'rgba(255,140,60,' + (0.3 * dawnT_full) + ')');
      coreGrad_full.addColorStop(0.5, 'rgba(220,60,30,' + (0.12 * dawnT_full) + ')');
      coreGrad_full.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad_full;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      let ha_full = dawnT_full * 0.5;
      let hGrad_full = ctx.createRadialGradient(W * 0.5, H * 0.58, 0, W * 0.5, H * 0.58, Math.max(W, H) * 0.65);
      hGrad_full.addColorStop(0, 'rgba(255,220,160,' + ha_full + ')');
      hGrad_full.addColorStop(0.35, 'rgba(220,180,130,' + (ha_full * 0.6) + ')');
      hGrad_full.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hGrad_full;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    // ===== 水墨云 =====
    if (t >= TL.spread) {
      let cloudIn = clamp((t - TL.spread) / 0.8, 0, 1);
      let cloudOut = clamp((TL.end - t) / 1.2, 0, 1);
      drawInkClouds(t, cloudIn * cloudOut);
    }

    // ===== 雁阵剪影 =====
    drawGeese(t);

    // 其余内容统一下移 5%
    let globalOffsetY = H * 0.05;
    ctx.save();
    ctx.translate(0, globalOffsetY);

    // ===== 远景星点 =====
    if (t > 0.1) {
      let starA = clamp((t - 0.1) * 2, 0, 1) * clamp((TL.end - t) / 1.5, 0, 1);
      for (let si = 0; si < stars.length; si++) {
        let s = stars[si];
        let tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s.twinkle + t * s.twinkleSpeed));
        ctx.globalAlpha = starA * tw * 0.5;
        let r = s.size * 8;
        ctx.drawImage(starSprite, s.x - r, s.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }

    // ===== 星火 =====
    if (t >= TL.spark && t < TL.dawn + 0.3) {
      const ss = sparkState(t);
      ctx.fillStyle = 'rgba(255,230,170,' + (ss.sparkAlpha * 0.5) + ')';
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, ss.sparkR, 0, Math.PI * 2);
      ctx.fill();
      if (ss.sparkT > 0.3 && Math.random() < 0.2) spawnEmber(sparkX, sparkY, 1);
    }

    // ===== 山脉 =====
    if (t >= TL.mountains) {
      let mtP = (t - TL.mountains) / (TL.mountainsEnd - TL.mountains);
      drawMountainLayer(mountains.slice(9), '#0d0202', mtP, 0, H * 0.04);
      drawMountainLayer(mountains.slice(5, 9), '#1a0504', mtP, 0.15, H * 0.1);
      drawMountainLayer(mountains.slice(1, 5), '#260806', mtP, 0.3, H * 0.16);
      drawMountainLayer(mountains.slice(0, 2), '#320c08', mtP, 0.45, H * 0.22);
    }

    // ===== 顶部五角星 =====
    if (t >= TL.tiananmen + 0.3) {
      let starAppear = clamp((t - (TL.tiananmen + 0.3)) / 0.4, 0, 1);
      let starHold = clamp((TL.end - t) / 1.0, 0, 1);
      let starAlpha = easeOutExpo(starAppear) * starHold * 0.85;
      let starSize = Math.min(W, H) * 0.028;
      let starX = W * 0.5;
      let starY = H * 0.08;
      drawStarShining(starX, starY, starSize, t, starAlpha);
    }

    // ===== 天安门剪影 =====
    if (t >= TL.tiananmen) {
      let taT = clamp((t - TL.tiananmen) / 0.8, 0, 1);
      let taEase = easeOutCubic(taT);
      if (taT > 0) {
        let taScale = Math.min(W / 800, 4.5);
        drawTiananmen(W * 0.5, H * 0.78 + H * 0.04 * (1 - taEase), taScale, taEase * 0.95, t);
      }
    }

    // ===== 山雾 =====
    if (t > TL.mountains + 0.3) {
      drawFog(t, clamp((t - TL.mountains - 0.3) / 1.0, 0, 1));
    }

    // ===== 中景火星 =====
    if (t > TL.spark) {
      let sparkFade = clamp((TL.end - t) / 1.5, 0, 1);
      for (let spi = 0; spi < sparks.length; spi++) {
        let sp = sparks[spi];
        sp.x += sp.vx; sp.y += sp.vy; sp.vy *= 0.99;
        sp.life -= sp.decay; sp.phase += dt * 6;
        if (sp.life <= 0 || sp.y < -10) {
          sp.x = Math.random() * W;
          sp.y = H * 0.8 + Math.random() * H * 0.2;
          sp.vx = (Math.random() - 0.5) * 0.3;
          sp.vy = -0.3 - Math.random() * 0.8;
          sp.life = 1;
        }
        let sa = sp.life * sparkFade * (0.6 + 0.4 * Math.sin(sp.phase));
        if (sa > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = sa;
          let sr = sp.size * 6;
          ctx.drawImage(sparkSprite, sp.x - sr, sp.y - sr, sr * 2, sr * 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ===== 近景拖尾粒子 =====
    if (t > TL.dawn && Math.random() < 0.02) spawnTrail();
    for (let tri = trails.length - 1; tri >= 0; tri--) {
      let tr = trails[tri];
      tr.trail.push({ x: tr.x, y: tr.y });
      if (tr.trail.length > 14) tr.trail.shift();
      tr.x += tr.vx; tr.y += tr.vy; tr.life -= tr.decay;
      tr.vy += 0.02;
      if (tr.life <= 0) { trails.splice(tri, 1); continue; }
      ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < tr.trail.length; j++) {
        let tp = tr.trail[j];
        let ta = (j / tr.trail.length) * tr.life * 0.7;
        ctx.globalAlpha = ta;
        let trr = tr.size * 3 * (j / tr.trail.length);
        ctx.drawImage(sparkSprite, tp.x - trr, tp.y - trr, trr * 2, trr * 2);
      }
      ctx.globalAlpha = tr.life;
      let hr = tr.size * 5;
      ctx.drawImage(sparkSprite, tr.x - hr, tr.y - hr, hr * 2, hr * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // ===== 余烬 =====
    for (let ei = embers.length - 1; ei >= 0; ei--) {
      let e = embers[ei];
      e.x += e.vx; e.y += e.vy; e.vy *= 0.98;
      e.vx += (Math.random() - 0.5) * 0.04; e.life -= e.decay;
      if (e.life <= 0) { embers.splice(ei, 1); continue; }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = e.life * 0.8;
      let er = e.size * 5;
      ctx.drawImage(emberSprite, e.x - er, e.y - er, er * 2, er * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // ===== 地面余烬 =====
    if (t > TL.dawn) {
      for (let gei = 0; gei < groundEmbers.length; gei++) {
        let ge = groundEmbers[gei];
        ge.x += ge.vx; ge.y += ge.vy;
        ge.vy += Math.sin(ge.phase + t * 2) * 0.02;
        ge.life -= ge.decay;
        if (ge.life <= 0 || ge.y < 0) {
          ge.x = Math.random() * W;
          ge.y = H * 0.85 + Math.random() * H * 0.15;
          ge.life = 1;
        }
        let ga = ge.life * 0.4;
        if (ga > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = ga;
          let ger = ge.size * 3;
          ctx.drawImage(emberSprite, ge.x - ger, ge.y - ger, ger * 2, ger * 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ===== 标题逐字浮现 =====
    if (t >= TL.titleCrack) {
      let titleY = H * 0.38;
      let titleSize = Math.min(W * 0.18, 150);
      let revT = clamp((t - TL.titleCrack) / 1.2, 0, 1);
      let revEase = easeOutExpo(revT);
      let titleChars = ['赓', '续', '血', '脉'];
      let charCount = titleChars.length;
      let charDelay = 0.12;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let ci = 0; ci < charCount; ci++) {
        let charStart = ci * charDelay;
        let charProg = clamp((revT - charStart) / 0.4, 0, 1);
        if (charProg <= 0) continue;
        let charEase = easeOutExpo(charProg);
        let charGap = titleSize * 1.00;
        let charX = W * 0.5 - (charCount - 1) * charGap / 2 + ci * charGap;
        let charY = titleY - (1 - charEase) * 15;
        let scale = 0.3 + charEase * 0.7;
        ctx.save();
        ctx.translate(charX, charY);
        ctx.scale(scale, scale);
        ctx.globalAlpha = charEase;
        ctx.font = '900 ' + titleSize + 'px "HongLeiZhuoShu","STZhongsong","SimSun",serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#3a0a0a';
        ctx.lineWidth = Math.max(4, titleSize * 0.045);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = titleSize * 0.12;
        ctx.strokeText(titleChars[ci], 0, 0);
        ctx.shadowBlur = 0;
        let strokeGrad = ctx.createLinearGradient(0, -titleSize / 2, 0, titleSize / 2);
        strokeGrad.addColorStop(0, '#d87a2a');
        strokeGrad.addColorStop(0.5, '#b91c1c');
        strokeGrad.addColorStop(1, '#7a1010');
        ctx.strokeStyle = strokeGrad;
        ctx.lineWidth = Math.max(2.5, titleSize * 0.025);
        ctx.strokeText(titleChars[ci], 0, 0);
        ctx.shadowColor = 'rgba(255,210,110,' + (charEase * 0.95) + ')';
        ctx.shadowBlur = titleSize * 0.42;
        let coreGrad2 = ctx.createLinearGradient(0, -titleSize / 2, 0, titleSize / 2);
        coreGrad2.addColorStop(0, '#fff3c0');
        coreGrad2.addColorStop(0.25, '#ffe27a');
        coreGrad2.addColorStop(0.55, '#ffc93d');
        coreGrad2.addColorStop(0.85, '#e08a18');
        coreGrad2.addColorStop(1, '#a05410');
        ctx.fillStyle = coreGrad2;
        ctx.fillText(titleChars[ci], 0, 0);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,250,220,' + (charEase * 0.9) + ')';
        ctx.lineWidth = Math.max(0.8, titleSize * 0.008);
        ctx.strokeText(titleChars[ci], 0, 0);
        ctx.restore();
      }

      // ===== 副标题 =====
      if (t >= TL.subtitle) {
        let subT = clamp((t - TL.subtitle) / 0.8, 0, 1);
        let subEase = easeOutExpo(subT);
        ctx.globalAlpha = subEase;
        let subSize = titleSize * 0.75;
        ctx.font = '700 ' + subSize + 'px "HongLeiZhuoShu","STZhongsong","SimSun",serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let subY = titleY + titleSize * 1.15;
        let subChars = '数绘红旅';
        let subGap = subSize * 0.96;
        for (let sci = 0; sci < subChars.length; sci++) {
          let subChar = subChars.charAt(sci);
          let subX = W * 0.5 - (subChars.length - 1) * subGap / 2 + sci * subGap;
          ctx.strokeStyle = '#3a0a0a';
          ctx.lineWidth = Math.max(3, subSize * 0.045);
          ctx.lineJoin = 'round';
          ctx.shadowColor = 'rgba(0,0,0,0.55)';
          ctx.shadowBlur = subSize * 0.1;
          ctx.strokeText(subChar, subX, subY);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#9a1414';
          ctx.lineWidth = Math.max(2, subSize * 0.022);
          ctx.strokeText(subChar, subX, subY);
          ctx.shadowColor = 'rgba(255,80,50,' + (subEase * 0.9) + ')';
          ctx.shadowBlur = subSize * 0.35;
          let subCoreGrad = ctx.createLinearGradient(0, subY - subSize / 2, 0, subY + subSize / 2);
          subCoreGrad.addColorStop(0, '#ffe0c0');
          subCoreGrad.addColorStop(0.3, '#ff7a5c');
          subCoreGrad.addColorStop(0.65, '#e02020');
          subCoreGrad.addColorStop(1, '#8b0a0a');
          ctx.fillStyle = subCoreGrad;
          ctx.fillText(subChar, subX, subY);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255,220,200,' + (subEase * 0.65) + ')';
          ctx.lineWidth = Math.max(0.6, subSize * 0.006);
          ctx.strokeText(subChar, subX, subY);
        }
      }
      ctx.restore();
    }

    // 结束全局下移变换
    ctx.restore();

    // ===== 背景诗词 —— 底部逐行堆叠，渐次浮现 =====
    if (t > 1.6 && t < TL.end) {
      let btSize = Math.min(W * 0.045, 30);
      let btLineH = btSize * 1.5;
      let btStartY = H * 0.82;
      let btStagger = 0.45; // 每行间隔秒数
      ctx.save();
      ctx.fillStyle = '#d4a860';
      ctx.font = '400 ' + btSize + 'px "STZhongsong","KaiTi","SimSun",serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let bi = 0; bi < bgTexts.length; bi++) {
        let btAppear = 1.6 + bi * btStagger;
        let btAlpha = clamp((t - btAppear) / 0.8, 0, 1) * 0.10;
        if (btAlpha > 0.002) {
          ctx.globalAlpha = btAlpha;
          ctx.fillText(bgTexts[bi], W * 0.5, btStartY + bi * btLineH);
        }
      }
      ctx.restore();
    }

    // ===== 暗角 =====
    drawVignette();

    // ===== 胶片颗粒 =====
    drawGrain(t, 1);

    // ===== 循环或结束 =====
    if (t < totalDuration) {
      rafId = requestAnimationFrame(draw);
    } else {
      entranceFinished = true;
      let overlay = document.getElementById('entrance-overlay');
      if (!overlay) return;
      overlay.classList.add('fade-out');
      document.documentElement.classList.remove('entrance-active');
      // 'instant' 非标准枚举，个别旧引擎会抛错 → 回退 (0,0)，避免中断入场收尾链
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
      setTimeout(function () { overlay.remove(); }, 800);
      markEntranceDone();
      finishEntrance();
    }
  }

  // ===== 颜色插值 =====
  function interpColor(c1, c2, t2) {
    let r = Math.round(c1[0] + (c2[0] - c1[0]) * t2);
    let g = Math.round(c1[1] + (c2[1] - c1[1]) * t2);
    let b = Math.round(c1[2] + (c2[2] - c1[2]) * t2);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function drawMountainLayer(mts, color, progress, delay, yOffset) {
    let p = clamp((progress - delay) / 0.4, 0, 1);
    if (p <= 0) return;
    let ep = easeOutCubic(p);
    ctx.save();
    ctx.globalAlpha = ep * 0.9;
    ctx.fillStyle = color;
    ctx.translate(0, yOffset * (1 - ep));
    ctx.beginPath();
    mts.forEach(function (mt) {
      ctx.moveTo(mt[0].x, H + 100);
      mt.forEach(function (pt) { ctx.lineTo(pt.x, pt.y); });
      ctx.lineTo(mt[mt.length - 1].x, H + 100);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ===== 事件 =====
  // resize 用 rAF 节流：拖拽窗口时避免同步重建全部粒子/山脉/颗粒层；同时刷新 isMobile/DPR
  let resizeRaf = null;
  window.addEventListener('resize', function () {
    // 动画已结束/已跳过：场景已移除，不再重建粒子层（此前每次 resize 都做全量重建 + ImageData 分配）
    if (entranceFinished) return;
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = null;
      isMobile = window.innerWidth < 768;
      DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2);
      resize();
      generateMountains();
      initStars();
      initSparks();
      initGeese();
      initInkClouds();
      initGrain();
      initFog();
      initGroundEmbers();
      updateSparkPos();
    });
  });

  const skipBtn = document.getElementById('skip');
  if (skipBtn) skipBtn.addEventListener('click', function () {
    // 取消动画循环，避免跳过后再逐帧运行数秒（低端机全屏 Canvas 高负载）
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    entranceFinished = true;
    let overlay = document.getElementById('entrance-overlay');
    if (!overlay) return;
    overlay.classList.add('fade-out');
    document.documentElement.classList.remove('entrance-active');
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
    setTimeout(function () { overlay.remove(); }, 800);
    markEntranceDone();
    finishEntrance();
  });

  rafId = requestAnimationFrame(draw);
}
