/* ============================================================
   长征页 — 环境音景引擎（Web Audio 合成，自包含）
   通过 initSound(toggleBtn, getStation) 与页面解耦：
   - toggleBtn：声音开关按钮元素
   - getStation：返回当前站点的回调（用于确定 mood）
   ============================================================ */

import { icon } from './icons.js?v=2026081516';

let _audioCtx = null;
let _soundMaster = null;
let _soundOn = false;
let _soundNodes = [];
let _boomTimer = null;
let _lastSndMood = null;
let _toggleBtn = null;
let _getStation = null;

function _currentStation() {
  return _getStation ? _getStation() : null;
}

function _noiseBuffer(ctx, brown) {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else d[i] = w;
  }
  return buf;
}
// 工具：停止并摘除整条音频链上的节点（stop 只停源/振荡器，filter/gain 仍挂在图上会泄漏）
function _stopChain(nodes) {
  for (const n of nodes) { try { if (typeof n.stop === 'function') n.stop(); } catch (e) { } }
  for (const n of nodes) { try { n.disconnect(); } catch (e) { } }
}
function _windNode(ctx, level, cutoff) {
  const src = ctx.createBufferSource();
  src.buffer = _noiseBuffer(ctx, false);
  src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = ctx.createGain(); g.gain.value = level;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
  const lg = ctx.createGain(); lg.gain.value = level * 0.45;
  lfo.connect(lg).connect(g.gain);
  src.connect(f).connect(g).connect(_soundMaster);
  src.start(); lfo.start();
  return { stop() { _stopChain([src, f, g, lfo, lg]); } };
}
function _rumbleNode(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = _noiseBuffer(ctx, true);
  src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 110;
  const g = ctx.createGain(); g.gain.value = 0.5;
  src.connect(f).connect(g).connect(_soundMaster);
  src.start();
  return { stop() { _stopChain([src, f, g]); } };
}
function _droneNode(ctx, freq, level) {
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 1.5;
  const g = ctx.createGain(); g.gain.value = level;
  o1.connect(g); o2.connect(g); g.connect(_soundMaster);
  o1.start(); o2.start();
  return { stop() { _stopChain([o1, o2, g]); } };
}
function _padNode(ctx) {
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700;
  const g = ctx.createGain(); g.gain.value = 0.05;
  filter.connect(g).connect(_soundMaster);
  const outs = [220, 277.18, 329.63];
  const nodes = outs.map((fq, i) => {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = fq;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = fq * 1.005;
    const og = ctx.createGain(); og.gain.value = 1 / (i + 1);
    o.connect(og); o2.connect(og); og.connect(filter);
    o.start(); o2.start();
    return [o, o2, og];
  }).flat();
  return { stop() { _stopChain([filter, g, ...nodes]); } };
}
function _boomOnce() {
  if (!_audioCtx) return;
  const ctx = _audioCtx;
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.setValueAtTime(95, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(26, ctx.currentTime + 1.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.55, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
  osc.connect(g).connect(_soundMaster);
  osc.start(); osc.stop(ctx.currentTime + 2.1);
  // 炮声播完后摘除整条链，避免每次 boom 向音频图泄漏 osc+gain
  setTimeout(() => {
    try { osc.disconnect(); } catch (e) { }
    try { g.disconnect(); } catch (e) { }
  }, 2200);
}
function _scheduleBooms() {
  clearTimeout(_boomTimer);
  const loop = () => { _boomOnce(); _boomTimer = setTimeout(loop, 3200 + Math.random() * 4600); };
  _boomTimer = setTimeout(loop, 1400);
}
function playSoundscape(mood) {
  if (!_audioCtx || !_soundMaster || mood === _lastSndMood) return;
  _lastSndMood = mood;
  clearTimeout(_boomTimer);
  _soundNodes.forEach(n => n.stop());
  _soundNodes = [];
  const level = mood === 'snow' ? 0.5 : mood === 'blood' ? 0.24 : 0.3;
  const cutoff = mood === 'snow' ? 1500 : mood === 'blood' ? 850 : 950;
  _soundNodes.push(_windNode(_audioCtx, level, cutoff));
  if (mood === 'blood') { _soundNodes.push(_rumbleNode(_audioCtx)); _scheduleBooms(); }
  else if (mood === 'swamp') { _soundNodes.push(_droneNode(_audioCtx, 54, 0.5)); }
  else if (mood === 'gold') { _soundNodes.push(_padNode(_audioCtx)); }
  else if (mood === 'ember') { _soundNodes.push(_droneNode(_audioCtx, 70, 0.18)); }
}
function updateSoundscape(mood) {
  if (!_audioCtx || !_soundOn) return;
  playSoundscape(mood);
}
function updateSoundToggle() {
  if (_toggleBtn) {
    _toggleBtn.innerHTML = _soundOn ? icon('speaker') : icon('speaker-off');
    _toggleBtn.setAttribute('aria-pressed', String(_soundOn));
    _toggleBtn.setAttribute('aria-label', _soundOn ? '关闭环境音景' : '开启环境音景');
  }
}
function _ensureAudio() {
  if (_audioCtx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    _audioCtx = new AC();
    _soundMaster = _audioCtx.createGain();
    _soundMaster.gain.value = 0.16;
    _soundMaster.connect(_audioCtx.destination);
    return true;
  } catch (e) { return false; }
}
function initSound(toggleBtn, getStation) {
  _toggleBtn = toggleBtn;
  _getStation = getStation;
  // 只绑一次点击；保持初始关闭态(_soundOn=false)，AudioContext 在首次点击时才懒创建
  if (_toggleBtn && !_toggleBtn.dataset.czSoundBound) {
    _toggleBtn.dataset.czSoundBound = '1';
    _toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSound(); });
  }
  updateSoundToggle();
}
function toggleSound() {
  if (!_audioCtx) {
    // 首次点击：在用户手势内创建 AudioContext 才能出声
    if (!_ensureAudio()) return;
    // Safari/iOS 新建 context 默认 suspended，须在用户手势内 resume 才出声（与再开分支行为一致）
    if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => { });
    _soundOn = true;
    const s = _currentStation();
    playSoundscape(s ? s.mood : 'ember');
    updateSoundToggle();
    return;
  }
  _soundOn = !_soundOn;
  if (_soundOn) {
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    _soundMaster.gain.value = 0.16;
    const s = _currentStation();
    _lastSndMood = null;
    playSoundscape(s ? s.mood : 'ember');
  } else {
    clearTimeout(_boomTimer);
    _soundNodes.forEach(n => n.stop());
    _soundNodes = [];
    _soundMaster.gain.value = 0;
  }
  updateSoundToggle();
}

export { initSound, updateSoundscape };
