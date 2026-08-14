/* ============================================================
   赓续血脉・数绘红旅 — 背景音乐 (Music Player)
   职责：浮动播放器（播放/暂停 + 音量滑条），跨页记忆播放状态
   约束：依赖 utils(getBasePath) / ui(showToast)；被 pages.initCommon 调用
   ============================================================ */

import { getBasePath } from './utils.js?v=2026081430';
import { showToast } from './ui.js?v=2026081430';
import { icon } from './icons.js?v=2026081430';

let bgMusic = null;

function initBgMusic() {
  if (bgMusic) return;
  // 跨页续播恢复状态：必须提前声明——attemptAutoResume 在 wasPlaying 分支早期即被调用，
  // let 若在函数中部声明会触发暂时性死区（TDZ）ReferenceError，中断整个播放器初始化
  let _autoResumeTried = false;
  let _resumeBanner = null;
  bgMusic = new Audio();
  bgMusic.src = getBasePath() + 'assets/音频/NurxatAnwar - 歌唱祖国 (伴奏)_H.ogg';
  bgMusic.loop = true;
  bgMusic.volume = 0.5;
  bgMusic.preload = 'none'; // 4.1MB 音频不预下载，首次点击播放时再加载

  // 容器
  const wrap = document.createElement('div');
  wrap.className = 'music-player';
  document.body.appendChild(wrap);

  // 音量滑块（在按钮左侧）
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'music-volume';
  slider.min = 0;
  slider.max = 100;
  slider.value = 50;
  slider.setAttribute('aria-label', '音量');
  slider.title = '音量';
  wrap.appendChild(slider);

  // 播放按钮
  const btn = document.createElement('button');
  btn.className = 'music-toggle';
  btn.title = '背景音乐 · 歌唱祖国';
  btn.innerHTML = icon('note-off');
  btn.setAttribute('aria-label', '播放背景音乐');
  wrap.appendChild(btn);

  // 离页前保存进度
  window.addEventListener('beforeunload', function () {
    if (bgMusic && !bgMusic.paused) {
      try { sessionStorage.setItem('bgmusic_time', bgMusic.currentTime); } catch (e) { }
    }
  });

  // 恢复播放状态和进度（storage 裸读需容错，隐身/受限模式会抛异常）
  let wasPlaying = false, savedTime = 0;
  try {
    wasPlaying = sessionStorage.getItem('bgmusic_playing') === '1';
    savedTime = parseFloat(sessionStorage.getItem('bgmusic_time') || '0') || 0;
  } catch (e) { /* 存储不可用：忽略恢复 */ }
  if (wasPlaying) {
    btn.innerHTML = icon('note');
    btn.classList.add('playing');
    // 先设进度再 load()：HAVE_NOTHING 时设置 currentTime 视为 default playback start position，
    // 使续播从上次位置起步；preload='none' 下 load() 仅取元数据/少量预取，完整 4.1MB 仍待 play() 手势放行后下载，
    // 首次播放仍可能有短暂缓冲（体验已由手势内即时 play + 恢复横幅改善）
    if (savedTime > 0) { try { bgMusic.currentTime = savedTime; } catch (e) { } }
    try { bgMusic.load(); } catch (e) { }
    // 立即无手势试播一次：浏览器宽松（用户曾授权/MEI 达标）则切页续播零手势；
    // 被拦截时由手势监听 + 恢复横幅兜底
    attemptAutoResume();
  }

  // 播放/暂停
  btn.addEventListener('click', function () {
    if (bgMusic.paused) {
      bgMusic.play().then(markPlaying).catch(function () {
        showToast('点击任意位置后即可播放音乐');
      });
    } else {
      bgMusic.pause();
      btn.innerHTML = icon('note-off');
      btn.classList.remove('playing');
      try { sessionStorage.setItem('bgmusic_playing', '0'); } catch (e) { }
    }
  });

  // 更新滑条填充色
  function updateSliderFill() {
    const v = slider.value;
    slider.style.background = 'linear-gradient(to right, #b91c1c 0%, #b91c1c ' + v + '%, #e6dccf ' + v + '%, #e6dccf 100%)';
  }

  // 音量调节
  slider.addEventListener('input', function () {
    bgMusic.volume = this.value / 100;
    updateSliderFill();
    try { sessionStorage.setItem('bgmusic_volume', this.value); } catch (e) { }
  });

  // 恢复音量
  try {
    const savedVol = sessionStorage.getItem('bgmusic_volume');
    if (savedVol) { slider.value = savedVol; bgMusic.volume = savedVol / 100; }
  } catch (e) { }
  updateSliderFill();

  // ---- 跨页续播恢复系统 ----
  function markPlaying() {
    btn.innerHTML = icon('note');
    btn.classList.add('playing');
    hideResumeBanner();
    try { sessionStorage.setItem('bgmusic_playing', '1'); } catch (e) { }
  }

  function hideResumeBanner() {
    if (_resumeBanner) { _resumeBanner.remove(); _resumeBanner = null; }
  }

  // 自动播放被拦截时：明确引导横幅（点一下即恢复），8s 后自动淡出避免长期干扰
  function showResumeBanner() {
    if (_resumeBanner) return;
    if (!bgMusic.paused) return;  // 已通过手势续播成功则不弹（迟到 reject 竞态守卫）
    const b = document.createElement('div');
    b.className = 'music-resume-hint';
    b.setAttribute('role', 'status');
    b.textContent = '音乐已就绪 · 点击任意处继续播放';
    document.body.appendChild(b);
    _resumeBanner = b;
    setTimeout(function () {
      if (_resumeBanner) {
        _resumeBanner.classList.add('is-fading');
        setTimeout(hideResumeBanner, 300);
      }
    }, 8000);
  }

  // 首个用户手势后自动续播：pointerdown(鼠标/触摸) 立即响应、click 覆盖键盘激活、
  // touchstart 兼容旧 Safari（pointer 事件未支持）。捕获阶段监听，第一次手势即统一解绑。
  const tryPlay = function (e) {
    ['pointerdown', 'touchstart', 'click'].forEach(function (evt) {
      document.removeEventListener(evt, tryPlay, true);
    });
    // 用户点的是播放器自身控件：交给按钮自己的 handler，避免"先自动播、按钮再切换成暂停"的双重触发
    if (e.target && e.target.closest && e.target.closest('.music-player')) return;
    if (wasPlaying && bgMusic.paused) {
      bgMusic.play().then(markPlaying).catch(function () {
        showToast('点击播放按钮开启背景音乐');
      });
    }
  };

  // 切页后立即无手势试播一次：浏览器宽松（用户曾授权/MEI 达标）则直接成功、零手势感知；
  // 被拒绝时由手势监听 + 恢复横幅兜底
  function attemptAutoResume() {
    if (_autoResumeTried) return;
    _autoResumeTried = true;
    bgMusic.play().then(markPlaying).catch(function (err) {
      // 已通过手势续播成功则横幅多余；仅自动播放拦截（NotAllowedError）弹恢复引导；其余错误提示而非误导"已就绪"
      if (!bgMusic.paused) { hideResumeBanner(); return; }
      if (err && err.name === 'NotAllowedError') { showResumeBanner(); return; }
      showToast('音乐加载失败，请点击播放按钮重试');
    });
  }

  ['pointerdown', 'touchstart', 'click'].forEach(function (evt) {
    document.addEventListener(evt, tryPlay, { capture: true });
  });
}

export { initBgMusic };
