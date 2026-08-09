/* ============================================================
   设计令牌收敛脚本（幂等，可重复运行）
   把散落的圆角/时长/间距魔法值收敛到 --radius-*、--transition、
   --duration-* 与 4px 网格，供 tests/design-tokens.test.js 验证。
   运行：node scripts/converge-design-tokens.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const CSS_DIR = path.join(__dirname, '..', 'css');
const files = fs.readdirSync(CSS_DIR).filter(f => f.endsWith('.css'));

let total = 0;

/* ---------- 1. 圆角：映射到令牌 ---------- */
const RADIUS_MAP = [
  ['border-radius: 1px', 'border-radius: var(--radius-xs)'],
  ['border-radius: 2px', 'border-radius: var(--radius-xs)'],
  ['border-radius: 3px', 'border-radius: var(--radius-xs)'],
  ['border-radius: 12px', 'border-radius: var(--radius)'],
  ['border-radius: 16px', 'border-radius: var(--radius-lg)'],
  ['border-radius: 24px', 'border-radius: var(--radius-xl)'],
  ['border-radius: 34px', 'border-radius: var(--radius-pill)'],
  ['border-radius: 36px', 'border-radius: var(--radius-pill)'],
  ['border-radius: 40px', 'border-radius: var(--radius-pill)'],
  ['border-radius: 50px', 'border-radius: var(--radius-pill)'],
  ['border-radius: 60px', 'border-radius: var(--radius-pill)'],
  ['border-radius: 2px / 4px', 'border-radius: var(--radius-xs) / var(--radius-xs)'],
  ['border-radius: 0 2px 2px 0', 'border-radius: 0 var(--radius-xs) var(--radius-xs) 0'],
  ['border-radius: 0 0 3px 3px', 'border-radius: 0 0 var(--radius-xs) var(--radius-xs)'],
];

/* ---------- 2. 时长：≤0.6s 一律收敛（动画与过渡通用） ---------- */
const DUR_MAP = [
  ['0.12s', 'var(--transition)'],
  ['0.15s', 'var(--transition)'],
  ['0.18s', 'var(--transition)'],
  ['0.2s', 'var(--transition)'],
  ['0.35s', 'var(--duration-fast)'],
  ['0.4s', 'var(--duration-fast)'],
  ['0.45s', 'var(--duration-normal)'],
  ['0.5s', 'var(--duration-normal)'],
  ['0.55s', 'var(--duration-normal)'],
  ['.2s', 'var(--transition)'],
  ['.35s', 'var(--duration-fast)'],
  ['.4s', 'var(--duration-fast)'],
];

/* ---------- 3. transition 中的慢速值（animation 装饰豁免） ---------- */
/* 每个值独立替换：多值 transition 里前一个值被消费后，后者仍能被各自的循环命中 */
const TRANSITION_SLOW_VALUES = ['1.2s', '0.95s', '0.75s', '1s', '1.8s', '1.5s', '0.8s', '.8s', '0.7s'];

/* ---------- 4. 间距：padding/margin/gap 收敛到 4px 网格 ---------- */
const SPACING_MAP = { 1: 4, 2: 4, 3: 4, 5: 4, 6: 8, 7: 8, 9: 8, 10: 12, 11: 12, 13: 12, 14: 16, 18: 16, 22: 24, 26: 28, 30: 32, 34: 32, 470: 468 };

for (const f of files) {
  const file = path.join(CSS_DIR, f);
  let css = fs.readFileSync(file, 'utf8');
  const before = css;

  for (const [from, to] of RADIUS_MAP) {
    while (css.includes(from)) { css = css.replace(from, to); total++; }
  }
  for (const [from, to] of DUR_MAP) {
    /* `.2s` 写法前是空格/逗号等非词字符，`\b` 断言失效 → 用负向环视 */
    const re = new RegExp(`(?<![\\d.])${from.replace('.', '\\.')}\\b`, 'g');
    const hits = css.match(re);
    if (hits) { css = css.replace(re, to); total += hits.length; }
  }
  for (const v of TRANSITION_SLOW_VALUES) {
    /* 前缀用负向环视而非 \b：`.8s` 等省略前导 0 的写法前是空格+点（均非词字符） */
    const re = new RegExp(`(transition[^;]*?)(?<![\\d.])${v.replace('.', '\\.')}\\b`, 'g');
    const hits = css.match(re);
    if (hits) { css = css.replace(re, '$1var(--duration-normal)'); total += hits.length; }
  }

  for (const [from, to] of Object.entries(SPACING_MAP)) {
    const re = new RegExp(`((?:padding|margin|gap)(?:-(?:block|inline|left|right|top|bottom))?\\s*:\\s*[^;]*?)\\b${from}px\\b`, 'g');
    const hits = css.match(re);
    if (hits) { css = css.replace(re, `$1${to}px`); total += hits.length; }
  }

  if (css !== before) {
    fs.writeFileSync(file, css);
    console.log(`  ${f}: ${(css.length - before.length) > 0 ? '+' : ''}${css.length - before.length} chars`);
  }
}
console.log(`共收敛 ${total} 处魔法值`);
