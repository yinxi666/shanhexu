'use strict';
/* ============================================================
   字号契约
   行为：全站字号不低于 12px —— 中文 10px 级字号不可读且会
   触发 iOS 自动缩放。覆盖 px/rem/em 小数写法与 clamp()/calc()。
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { CSS_DIR, readCss } = require('./helpers/css-analyzer');

/** 解析纯 px/rem/em 字面量 → px */
function evalPx(expr) {
  const m = String(expr || '').trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] === 'px' ? n : n * 16;
}

/** 求值仅含 px/rem/em 与 + - * / ( ) 的 calc() 表达式 → px；含无法解析的 token 返回 null */
function evalSimple(expr) {
  const tokens = String(expr || '').match(/(?:[-+]?\d+(?:\.\d+)?(?:px|rem|em))|[-+*/()]/g);
  if (!tokens) return null;
  const pxExpr = tokens.map(t => {
    const n = evalPx(t);
    return n !== null ? String(n) : t;
  }).join('');
  if (/[a-zA-Z]/.test(pxExpr)) return null; // var() 等残留，无法解析则跳过
  try {
    // eslint-disable-next-line no-new-func
    const r = Function('return (' + pxExpr + ')')();
    return (typeof r === 'number' && Number.isFinite(r)) ? r : null;
  } catch (e) { return null; }
}

/** 计算 font-size 的最小可能渲染 px；无法确定时返回 null（跳过） */
function minFontPx(val) {
  const clampM = val.match(/^clamp\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\)$/);
  if (clampM) return evalPx(clampM[1]); // 渲染值恒 ≥ MIN（第一参数），验 MIN 即可保证 ≥12
  const calcM = val.match(/^calc\(([\s\S]*)\)$/);
  if (calcM) return evalSimple(calcM[1]);
  return evalPx(val);
}

test('全站 css 无小于 12px 的 font-size 声明（含 rem/em 小数、clamp()/calc()）', () => {
  const files = fs.readdirSync(CSS_DIR).filter(f => f.endsWith('.css'));
  const offenders = [];
  for (const f of files) {
    const css = readCss(f);
    // (?:^|[^-]) 排除自定义属性（如 --x-font-size）
    const re = /(?:^|[^-])font-size\s*:\s*([^;!]+)/g;
    let m;
    while ((m = re.exec(css))) {
      const val = m[1].trim();
      const px = minFontPx(val);
      if (px !== null && px < 12) {
        offenders.push(`${f}: font-size: ${val} (= ${px}px)`);
      }
    }
  }
  assert.deepStrictEqual(offenders, [],
    `存在小于 12px 的字号:\n  ${offenders.join('\n  ')}`);
});
