'use strict';
/* ============================================================
   设计令牌收敛契约
   行为：圆角只取令牌刻度（--radius-* 的 0/4/6/8/10/14/20/999 +
   圆形 50%）；过渡时长只取令牌刻度（0.25s/0.3s/0.6s，装饰动画
   >0.6s 豁免）；间距（padding/margin/gap）对齐 4px 网格。
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { CSS_DIR, readCss, tokenizeCss, parseDeclarations } = require('./helpers/css-analyzer');

const files = fs.readdirSync(CSS_DIR).filter(f => f.endsWith('.css'));
const allRules = files.flatMap(f =>
  tokenizeCss(readCss(f)).map(r => ({ ...r, file: f, decls: parseDeclarations(r.body) })));

/* ---------------- 圆角 ---------------- */

const VALID_RADIUS_PX = new Set(['0', '4', '6', '8', '10', '14', '20', '999']);

test('border-radius 只取令牌刻度（0/4/6/8/10/14/20/999px、50%、var(--radius-*)）', () => {
  const offenders = [];
  for (const r of allRules) {
    for (const [prop, val] of Object.entries(r.decls)) {
      if (prop !== 'border-radius') continue;
      for (const part of val.split('/').flatMap(s => s.trim().split(/\s+/))) {
        const token = part.replace('!important', '').trim();
        const m = token.match(/^(-?\d+(?:\.\d+)?)(px|%)$/);
        if (m) {
          if (m[2] === 'px' && !VALID_RADIUS_PX.has(m[1])) {
            offenders.push(`${r.file} 「${r.selector.trim()}」 border-radius: ${part}`);
          } else if (m[2] === '%' && m[1] !== '50') {
            offenders.push(`${r.file} 「${r.selector.trim()}」 border-radius: ${part}`);
          }
        } else if (!/^var\(--radius(?:-[\w-]+)?\)$/.test(token) && token !== '0' && token !== '') {
          offenders.push(`${r.file} 「${r.selector.trim()}」 border-radius: ${part}`);
        }
      }
    }
  }
  assert.deepStrictEqual(offenders, [],
    `圆角魔法值（应收敛到 --radius-* 刻度）:\n  ${offenders.join('\n  ')}`);
});

/* ---------------- 过渡时长 ---------------- */

const VALID_DURATIONS = new Set(['0', '0s', '0.25s', '0.3s', '0.6s',
  'var(--transition)', 'var(--duration-fast)', 'var(--duration-normal)']);

/** 提取时长值（s 与 ms 统一归一化为秒），支持 .5s 写法 */
function extractTimes(val) {
  const out = [];
  const re = /(\d+(?:\.\d+)?|\.\d+)(ms|s)/g;
  let m;
  while ((m = re.exec(val)) !== null) {
    const num = parseFloat(m[1]);
    const sec = m[2] === 'ms' ? num / 1000 : num;
    const norm = String(Math.round(sec * 10000) / 10000) + 's';
    out.push({ sec, norm, raw: m[0] });
  }
  return out;
}

/** 是否处于 prefers-reduced-motion 覆盖块（其 0.01ms 杀值豁免） */
function isReducedMotion(r) {
  return (r.media || []).some(q => /prefers-reduced-motion/.test(q));
}

test('transition 时长只取令牌刻度（0.25s/0.3s/0.6s，含 ms 写法）', () => {
  const offenders = [];
  for (const r of allRules) {
    if (isReducedMotion(r)) continue;
    for (const [prop, val] of Object.entries(r.decls)) {
      if (!/^transition(-duration)?$/.test(prop)) continue;
      for (const t of extractTimes(val)) {
        if (!VALID_DURATIONS.has(t.norm)) {
          offenders.push(`${r.file} 「${r.selector.trim()}」 ${prop}: ${val} 时长 ${t.raw}（=${t.norm}）`);
        }
      }
    }
  }
  assert.deepStrictEqual(offenders, [],
    `transition 时长魔法值（应收敛到 --transition/--duration-*）:\n  ${offenders.join('\n  ')}`);
});

test('animation 时长：≤0.6s 必须取令牌刻度（>0.6s 装饰动画豁免，含 ms 写法）', () => {
  const offenders = [];
  for (const r of allRules) {
    if (isReducedMotion(r)) continue;
    for (const [prop, val] of Object.entries(r.decls)) {
      if (prop !== 'animation-duration' && prop !== 'animation') continue;
      /* animation 简写：第一个时间值是 duration，其后为 delay（豁免） */
      const times = prop === 'animation'
        ? extractTimes(val).slice(0, 1)
        : extractTimes(val);
      for (const t of times) {
        if (t.sec <= 0.6 && !VALID_DURATIONS.has(t.norm)) {
          offenders.push(`${r.file} 「${r.selector.trim()}」 ${prop}: ${val} 时长 ${t.raw}（=${t.norm}）`);
        }
      }
    }
  }
  assert.deepStrictEqual(offenders, [],
    `animation 时长魔法值（≤0.6s 应收敛到令牌刻度）:\n  ${offenders.join('\n  ')}`);
});

/* ---------------- 间距 ---------------- */

test('间距（padding/margin/gap）对齐 4px 网格', () => {
  const offenders = [];
  for (const r of allRules) {
    for (const [prop, val] of Object.entries(r.decls)) {
      if (!/^(padding|margin|gap)(-block|-inline|-left|-right|-top|-bottom)?$/.test(prop)) continue;
      const px = val.match(/\d+(?:\.\d+)?px/g) || [];
      for (const p of px) {
        const n = parseFloat(p);
        if (n % 4 !== 0) {
          offenders.push(`${r.file} 「${r.selector.trim()}」 ${prop}: ${val} → ${p}`);
        }
      }
    }
  }
  assert.deepStrictEqual(offenders, [],
    `间距魔法值（应对齐 4px 网格）:\n  ${offenders.join('\n  ')}`);
});
