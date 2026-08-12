/* ============================================================
   赓续血脉・数绘红旅 — 背景音乐 (Music Player)
   职责：浮动播放器（播放/暂停 + 音量滑条），跨页记忆播放状态
   约束：依赖 utils(getBasePath) / ui(showToast)；被 pages.initCommon 调用
   ============================================================ */

import { getBasePath } from './utils.js?v=2026081035';
import { showToast } from './ui.js?v=2026081035';
import { icon } from './icons.js?v=2026081035';

let bgMusic = null;

function initBgMusic() {
  if (bgMusic) return;
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
    // 先设进度再播放（元数据未就绪时 currentTime 可能抛 InvalidStateError）
    if (savedTime > 0) { try { bgMusic.currentTime = savedTime; } catch (e) { } }
    // 首次交互后由下方 tryPlay 统一恢复，避免两套机制重复触发
    bgMusic.play().catch(function () { });
  }

  // 播放/暂停
  btn.addEventListener('click', function () {
    if (bgMusic.paused) {
      bgMusic.play().then(function () {
        btn.innerHTML = icon('note');
        btn.classList.add('playing');
        sessionStorage.setItem('bgmusic_playing', '1');
      }).catch(function () {
        showToast('点击任意位置后即可播放音乐');
      });
    } else {
      bgMusic.pause();
      btn.innerHTML = icon('note-off');
      btn.classList.remove('playing');
      sessionStorage.setItem('bgmusic_playing', '0');
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

  // 首次用户交互后尝试恢复播放
  const tryPlay = function () {
    if (wasPlaying && bgMusic.paused) {
      bgMusic.play().catch(function () { });
    }
    document.removeEventListener('click', tryPlay);
  };
  document.addEventListener('click', tryPlay);
}

export { initBgMusic };
