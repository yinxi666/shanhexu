'use strict';
/* ============================================================
   ① 深色模式契约测试
   行为：全站视觉在 html.dark 下保持一致且可读；主题相关颜色
   必须走设计令牌，不硬编码。
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const {
  readCss, findRules, extractColors, parseColor, blend,
  luminance, tokenMap, resolveVars, contrastRatio,
} = require('./helpers/css-analyzer');

const cssMap = {
  'base.css': readCss('base.css'),
  'widgets.css': readCss('widgets.css'),
  'dark.css': readCss('dark.css'),
};

test('移动端底栏：浅色模式下背景非近黑，且经 --mobile-nav-bg 令牌驱动', () => {
  const rules = findRules(cssMap['widgets.css'], /^\.mobile-nav$/);
  const base = rules.find(r => r.decls.background);
  assert.ok(base, 'widgets.css 应存在 .mobile-nav 基础规则');

  const bg = base.decls.background;
  assert.match(bg, /var\(--mobile-nav-bg\)/,
    `底栏背景应引用令牌 --mobile-nav-bg，当前硬编码: ${bg}`);

  // 解析令牌（浅色上下文 :root）
  const resolved = resolveVars(bg, tokenMap(cssMap, /^:root$/));
  const colors = extractColors(resolved);
  assert.ok(colors.length > 0, `无法解析底栏背景颜色: ${resolved}`);
  const blended = colors.map(c => blend(parseColor(c), { r: 253, g: 251, b: 247 }));
  for (const c of blended) {
    assert.ok(luminance(c) >= 0.06, `浅色底栏背景过暗: ${resolved} -> ${luminance(c).toFixed(3)}`);
  }
});

test('移动端底栏：html.dark 下 --mobile-nav-bg 被覆盖为深色', () => {
  const darkRules = findRules(cssMap['dark.css'], /^html\.dark$/);
  const darkVal = darkRules.map(r => r.decls['--mobile-nav-bg']).filter(Boolean);
  assert.ok(darkVal.length > 0, 'dark.css 的 html.dark 应覆盖 --mobile-nav-bg');

  const colors = extractColors(darkVal[0]);
  assert.ok(colors.length > 0, `无法解析深色底栏颜色: ${darkVal[0]}`);
  for (const c of colors) {
    assert.ok(luminance(parseColor(c)) <= 0.1,
      `深色底栏背景应接近黑，当前过亮: ${darkVal[0]}`);
  }
});

/* ---------------- 聊天快速回复按钮对比度 ---------------- */

function quickReplyContrast(cssMap, context) {
  const selectorRe = context === 'dark' ? /^html\.dark$/ : /^:root$/;
  const rules = findRules(cssMap['widgets.css'], /^\.chat-quick-btns button$/);
  const base = rules.find(r => r.decls.color && r.decls.background);
  assert.ok(base, '.chat-quick-btns button 应有 color 与 background 声明');

  const tokens = tokenMap(cssMap, selectorRe);
  const color = parseColor(resolveVars(base.decls.color, tokens));
  let bg = parseColor(resolveVars(base.decls.background, tokens));
  assert.ok(color && bg, `无法解析按钮颜色: ${base.decls.color} / ${base.decls.background}`);
  if (bg.a < 1) {
    const cardBg = parseColor(resolveVars('var(--card-bg)', tokens));
    bg = blend(bg, cardBg);
  }
  return contrastRatio(color, bg);
}

test('聊天快速回复按钮：浅色模式下文字/背景对比度 ≥ 4.5 (WCAG AA)', () => {
  const ratio = quickReplyContrast(cssMap, 'light');
  assert.ok(ratio >= 4.5, `浅色对比度不足: ${ratio.toFixed(2)}:1`);
});

test('聊天快速回复按钮：深色模式下文字/背景对比度 ≥ 4.5 (WCAG AA)', () => {
  const ratio = quickReplyContrast(cssMap, 'dark');
  assert.ok(ratio >= 4.5, `深色对比度不足: ${ratio.toFixed(2)}:1`);
});
