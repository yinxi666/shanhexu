'use strict';
/* ============================================================
   减少动效契约
   行为：系统开启"减少动效"时，全站动画/过渡/滚动平滑全部禁用。
   实现契约：base.css 提供全局 prefers-reduced-motion 覆盖
   （base.css 被所有页面加载，含长征页）。
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const { readCss, tokenizeCss, parseDeclarations, keyframesNames } = require('./helpers/css-analyzer');

const base = readCss('base.css');

const reduceRules = tokenizeCss(base)
  .filter(r => (r.media || []).some(m => /prefers-reduced-motion/.test(m)))
  .map(r => ({ ...r, decls: parseDeclarations(r.body) }));

test('base.css 存在 prefers-reduced-motion 覆盖块', () => {
  assert.ok(reduceRules.length > 0,
    'base.css 应包含 prefers-reduced-motion 媒体块（防空洞：base.css 自身定义 5 个 keyframes）');
});

test('reduce 块内 `*` 规则禁用动画与过渡', () => {
  const star = reduceRules.find(r => /\*::after/.test(r.selector) && /\*::before/.test(r.selector));
  assert.ok(star, 'reduce 块应含 `*, *::before, *::after` 规则');
  const d = star.decls;
  assert.match(d['animation-duration'] || '', /0(\.\d+)?(ms|s)|none/i,
    `animation-duration 应为 0/0.01ms: ${d['animation-duration']}`);
  assert.match(d['animation-iteration-count'] || '', /1|none/i,
    `animation-iteration-count 应停止循环: ${d['animation-iteration-count']}`);
  assert.match(d['transition-duration'] || '', /0(\.\d+)?(ms|s)|none/i,
    `transition-duration 应为 0/0.01ms: ${d['transition-duration']}`);
});

test('全站所有定义 keyframes 的 css 文件都有 reduce 覆盖可依赖', () => {
  const cssDir = require('path').join(__dirname, '..', 'css');
  const fs = require('fs');
  const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
  const filesWithKeyframes = files.filter(f => keyframesNames(readCss(f)).length > 0);
  assert.ok(filesWithKeyframes.length >= 5,
    `应有 5 个 css 文件定义 keyframes，当前: ${filesWithKeyframes.join(', ')}`);
  // base.css 全局块即所有文件的 reduce 契约来源
  assert.ok(reduceRules.some(r => /\*::after/.test(r.selector) && /\*::before/.test(r.selector)),
    'base.css 全局块缺失，其他文件将无 reduce 覆盖');
});
