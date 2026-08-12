/* ============================================================
   cz-atmosphere — 长征手卷页全屏气候粒子引擎（自包含）
   职责：按站点 mood 渲染全屏 5 型粒子（余烬/雪/血雨/气泡/金光）
   解耦：通过访问器注入注入外部状态——
     getReduceMotion / getActiveStationId / getLastActiveT / setLastActiveT /
     setMoodBridge（注册 mood 回调，setActive 调用）
   ============================================================ */

import { STATIONS } from './cz-stations.js?v=2026081309';

export function initAtmosphere({ canvas, getReduceMotion, getActiveStationId, getLastActiveT, setLastActiveT, setMoodBridge }) {
  if (getReduceMotion()) return;
  const c = canvas;
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, dpr;
  const parts = [];
  let N_EMBER, N_SNOW, N_BLOOD, N_BUBBLE, N_GOLD;
  let curMood = null;
  let curCount = 0;
  let curSpawn = null;

  // 粒子预算随视口宽度/设备像素密度重算（resize 穿越断点或缩放时按当前视口调整密度，而非 init 一次定死）
  function computeBudgets() {
    const small = window.innerWidth < 768;
    const isHiDpr = (window.devicePixelRatio || 1) >= 2;
    N_EMBER = small ? (isHiDpr ? 22 : 32) : (isHiDpr ? 52 : 72);
    N_SNOW = small ? (isHiDpr ? 45 : 65) : (isHiDpr ? 85 : 115);
    N_BLOOD = small ? (isHiDpr ? 10 : 15) : (isHiDpr ? 15 : 20);
    N_BUBBLE = small ? (isHiDpr ? 16 : 22) : (isHiDpr ? 28 : 40);
    N_GOLD = small ? (isHiDpr ? 28 : 40) : (isHiDpr ? 55 : 80);
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    computeBudgets();
    // 已进入某 mood 且预算变化时，增删当前粒子池对齐（setMoodConfig 前 curSpawn 为 null，跳过）
    if (curSpawn) {
      const target = { ember: N_EMBER, blood: N_BLOOD, snow: N_SNOW, swamp: N_BUBBLE, gold: N_GOLD }[curMood] || N_EMBER;
      if (curCount !== target) {
        curCount = target;
        while (parts.length < curCount) parts.push(curSpawn());
        if (parts.length > curCount) parts.length = curCount;
      }
    }
  }
  resize();
  window.addEventListener('resize', resize);

  // ========== 粒子生成器 ==========
  const spawners = {
    ember: () => ({
      type: 'ember',
      x: Math.random() * W,
      y: H + Math.random() * 40,
      vx: -0.3 + Math.random() * 0.6,
      vy: -0.5 - Math.random() * 1.1,
      r: 1 + Math.random() * 2.6,
      life: 0,
      maxLife: 4000 + Math.random() * 5000,
      hue: 10 + Math.random() * 38,
      flick: Math.random() * Math.PI * 2
    }),
    snow: () => ({
      type: 'snow',
      x: Math.random() * W,
      y: -10 - Math.random() * 40,
      vx: -0.6 + Math.random() * 1.2,
      vy: 0.4 + Math.random() * 1.1,
      r: 0.9 + Math.random() * 2.6,
      life: 0,
      maxLife: 6000 + Math.random() * 6000,
      drift: Math.random() * Math.PI * 2,
      driftSp: 0.001 + Math.random() * 0.002
    }),
    blood: () => ({
      type: 'blood',
      x: Math.random() * W,
      y: -10 - Math.random() * 60,
      vx: -0.15 + Math.random() * 0.3,
      vy: 0.7 + Math.random() * 1.4,
      r: 0.7 + Math.random() * 1.8,
      life: 0,
      maxLife: 5000 + Math.random() * 4000
    }),
    swamp: () => ({
      type: 'bubble',
      x: Math.random() * W,
      y: H + Math.random() * 60,
      vx: -0.2 + Math.random() * 0.4,
      vy: -0.3 - Math.random() * 0.7,
      r: 1.5 + Math.random() * 4.5,
      life: 0,
      maxLife: 5500 + Math.random() * 5500,
      wob: Math.random() * Math.PI * 2
    }),
    gold: () => ({
      type: 'gold',
      x: Math.random() * W,
      y: H + Math.random() * 40,
      vx: -0.4 + Math.random() * 0.8,
      vy: -0.6 - Math.random() * 1.4,
      r: 0.8 + Math.random() * 2.4,
      life: 0,
      maxLife: 4500 + Math.random() * 5500,
      spin: Math.random() * Math.PI * 2,
      sparkle: Math.random() * Math.PI * 2
    })
  };

  function setMoodConfig(mood) {
    if (mood === curMood) return;
    curMood = mood;
    if (mood === 'ember') { curCount = N_EMBER; curSpawn = spawners.ember; }
    else if (mood === 'blood') { curCount = N_BLOOD; curSpawn = spawners.blood; }
    else if (mood === 'snow') { curCount = N_SNOW; curSpawn = spawners.snow; }
    else if (mood === 'swamp') { curCount = N_BUBBLE; curSpawn = spawners.swamp; }
    else if (mood === 'gold') { curCount = N_GOLD; curSpawn = spawners.gold; }
    else { curCount = N_EMBER; curSpawn = spawners.ember; }
    // 整体重建粒子池：旧类型粒子不残留（否则切 mood 后雪花/余烬残留数秒）
    parts.length = 0;
    for (let i = 0; i < curCount; i++) parts.push(curSpawn());
  }
  setMoodBridge(setMoodConfig);
  // 初始化时按当前站 mood 设置粒子（而非无条件 ember）：
  // setActive(1) 早于本函数执行，若加载期已滚到非 ember 站，此处直接对齐，避免氛围错配
  const activeStation = getActiveStationId() ? STATIONS[getActiveStationId() - 1] : null;
  setMoodConfig((activeStation && activeStation.mood) || 'ember');

  // ========== 渲染循环 ==========
  let lastT = performance.now();
  let atmosRafId = 0;
  let paused = false;

  function resume() {
    if (!paused) return;
    paused = false;
    lastT = performance.now();
    if (atmosRafId) cancelAnimationFrame(atmosRafId);
    atmosRafId = requestAnimationFrame(loop);
  }
  function pause() {
    paused = true;
    if (atmosRafId) cancelAnimationFrame(atmosRafId);
    atmosRafId = 0;
    ctx.clearRect(0, 0, W, H);
  }

  function loop(t) {
    atmosRafId = requestAnimationFrame(loop);
    const dt = Math.min(60, t - lastT); lastT = t;
    if (document.hidden) { pause(); return; }
    const idleMs = t - (getLastActiveT() || 0);
    if (idleMs > 4500 && parts.length) {
      pause();
      return;
    }
    ctx.clearRect(0, 0, W, H);

    // 按粒子类型走独立分支（优化：避免每粒子 5 次 if 判断）
    const spawnFn = curSpawn;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      let dead = false;
      if (p.type === 'ember') {
        p.flick += dt * 0.01;
        p.x += p.vx;
        p.y += p.vy - 0.15 * Math.sin(p.flick);
        const alpha = Math.max(0, Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI)));
        if (alpha > 0.02) {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
          grad.addColorStop(0, `hsla(${p.hue},100%,75%,${alpha * 0.95})`);
          grad.addColorStop(0.35, `hsla(${p.hue},100%,55%,${alpha * 0.45})`);
          grad.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.life > p.maxLife || p.y < -10) dead = true;
      } else if (p.type === 'snow') {
        p.drift += dt * p.driftSp;
        p.x += p.vx + Math.sin(p.drift) * 0.55;
        p.y += p.vy;
        const alpha = Math.max(0, Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI)));
        if (alpha > 0.02) {
          ctx.fillStyle = `hsla(210,100%,96%,${alpha * 0.92})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsla(205,100%,88%,${alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.life > p.maxLife || p.y > H + 15) dead = true;
      } else if (p.type === 'blood') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.0025 * dt;
        const alpha = Math.max(0, Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI)));
        if (alpha > 0.02) {
          ctx.fillStyle = `hsla(0,88%,32%,${alpha * 0.92})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsla(0,70%,22%,${alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(p.x + 0.8, p.y + 0.6, p.r * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.life > p.maxLife || p.y > H + 15) dead = true;
      } else if (p.type === 'bubble') {
        p.wob += dt * 0.002;
        p.x += p.vx + Math.sin(p.wob) * 0.35;
        p.y += p.vy;
        const alpha = Math.max(0, Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI)));
        if (alpha > 0.02) {
          const a1 = alpha * 0.8;
          const a2 = alpha * 0.18;
          ctx.strokeStyle = `hsla(98,45%,68%,${a1})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `hsla(98,55%,78%,${a2})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsla(98,70%,90%,${a1})`;
          ctx.beginPath();
          ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, Math.max(0.5, p.r * 0.25), 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.life > p.maxLife || p.y < -15) dead = true;
      } else if (p.type === 'gold') {
        p.spin += dt * 0.006;
        p.sparkle += dt * 0.005;
        p.x += p.vx;
        p.y += p.vy;
        const alpha = Math.max(0, Math.min(1, Math.sin((p.life / p.maxLife) * Math.PI)));
        if (alpha > 0.02) {
          const a1 = alpha * 0.95;
          const a2 = alpha * 0.45;
          const sparkM = 0.65 + 0.35 * Math.sin(p.sparkle);
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          grad.addColorStop(0, `hsla(48,100%,82%,${alpha * 0.9})`);
          grad.addColorStop(0.4, `hsla(46,100%,62%,${a2})`);
          grad.addColorStop(1, `hsla(44,100%,55%,0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsla(52,100%,${Math.round(70 + sparkM * 22)}%,${a1})`;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          const s = p.r * 1.4;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.28, -s * 0.28);
          ctx.lineTo(s, 0);
          ctx.lineTo(s * 0.28, s * 0.28);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.28, s * 0.28);
          ctx.lineTo(-s, 0);
          ctx.lineTo(-s * 0.28, -s * 0.28);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        if (p.life > p.maxLife || p.y < -10) dead = true;
      }
      if (dead) {
        if (spawnFn) parts[i] = spawnFn();
        else { parts[i] = parts[parts.length - 1]; parts.pop(); }
      }
    }
  }
  atmosRafId = requestAnimationFrame(loop);
  setLastActiveT(performance.now());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else { resume(); setLastActiveT(performance.now()); }
  });
  const wake = () => { setLastActiveT(performance.now()); if (paused) resume(); };
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('pointerdown', wake, { passive: true });
  window.addEventListener('wheel', wake, { passive: true });
}
