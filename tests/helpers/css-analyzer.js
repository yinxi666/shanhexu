'use strict';
/* ============================================================
   CSS 静态分析器（零依赖，供 node:test 使用）
   能力：拆规则块、取声明、提取变量/颜色/keyframes、解析颜色、
   WCAG 对比度计算、var() 单层解析
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CSS_DIR = path.join(ROOT, 'css');

function readCss(name) {
  return fs.readFileSync(path.join(CSS_DIR, name), 'utf8');
}

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** 拆分为规则列表：{ selector, body, media[] }，@media/@supports 内层递归展开 */
function tokenizeCss(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++;
    if (i >= n) break;
    const selStart = i;
    while (i < n && src[i] !== '{') i++;
    if (i >= n) break;
    const selector = src.slice(selStart, i).trim();
    i++;
    let depth = 1;
    const bodyStart = i;
    while (i < n && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.slice(bodyStart, i - 1);
    if (/^@(media|supports|container)\b/.test(selector)) {
      for (const inner of tokenizeCss(body)) {
        rules.push({ ...inner, media: [selector, ...(inner.media || [])] });
      }
    } else {
      rules.push({ selector, body, media: [] });
    }
  }
  return rules;
}

function parseDeclarations(body) {
  const decls = {};
  for (const chunk of body.split(';')) {
    const m = chunk.match(/^\s*([-\w]+)\s*:\s*([\s\S]*?)\s*$/);
    if (m) decls[m[1].trim()] = m[2].trim();
  }
  return decls;
}

/** 按选择器正则找规则（含 decls 解析） */
function findRules(css, selectorRe) {
  return tokenizeCss(css)
    .filter(r => selectorRe.test(r.selector))
    .map(r => ({ ...r, decls: parseDeclarations(r.body) }));
}

/** 提取某选择器上下文里定义的 --变量 名集合 */
function extractVars(css, selectorRe) {
  const vars = new Set();
  for (const r of findRules(css, selectorRe)) {
    for (const [prop, val] of Object.entries(r.decls)) {
      if (prop.startsWith('--')) vars.add(prop);
    }
  }
  return vars;
}

function keyframesNames(css) {
  return [...css.matchAll(/@keyframes\s+([-\w]+)/g)].map(m => m[1]);
}

/* ---------------- 颜色 ---------------- */

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black)\b/g;

function extractColors(value) {
  return value.match(COLOR_RE) || [];
}

function parseColor(str) {
  str = str.trim().toLowerCase();
  if (str === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (str === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  let m = str.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  m = str.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    const a = m[4] === undefined ? 1 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  return null;
}

/** 半透明色与背景合成后的实际颜色 */
function blend(color, bg = { r: 255, g: 255, b: 255, a: 1 }) {
  const a = color.a;
  return {
    r: color.r * a + bg.r * (1 - a),
    g: color.g * a + bg.g * (1 - a),
    b: color.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const f = v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(c1, c2) {
  const l1 = luminance(c1);
  const l2 = luminance(c2);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------------- var() 解析 ---------------- */

/** 提取某选择器上下文（如 :root / html.dark）定义的令牌表 */
function tokenMap(cssMap, selectorRe) {
  const map = {};
  for (const css of Object.values(cssMap)) {
    for (const r of findRules(css, selectorRe)) {
      for (const [k, v] of Object.entries(r.decls)) {
        if (k.startsWith('--')) map[k] = v;
      }
    }
  }
  return map;
}

/** 递归解析 var() 引用（最多 8 层），支持 fallback */
function resolveVars(value, map) {
  let out = value;
  let guard = 0;
  while (/\bvar\(--[\w-]/.test(out) && guard++ < 8) {
    out = out.replace(/\bvar\((--[\w-]+)\s*(?:,\s*([^)]+))?\)/g,
      (_, name, fallback) => (map[name] !== undefined ? map[name] : fallback !== undefined ? fallback.trim() : ''));
  }
  return out.trim();
}

module.exports = {
  ROOT,
  CSS_DIR,
  readCss,
  readFile,
  tokenizeCss,
  parseDeclarations,
  findRules,
  extractVars,
  keyframesNames,
  COLOR_RE,
  extractColors,
  parseColor,
  blend,
  luminance,
  contrastRatio,
  tokenMap,
  resolveVars,
};
