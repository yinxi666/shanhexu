'use strict';
/* ============================================================
   硬编码颜色收敛契约
   行为：pages/widgets/effects 中的主题相关硬编码色（软木板、
   图片占位、聊天头渐变、答题状态、分享成功）必须走令牌，
   dark.css 逐项覆盖 —— 深色下不出现白块/补丁感。
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const { readCss, tokenMap } = require('./helpers/css-analyzer');

const pages = readCss('pages.css');
const widgets = readCss('widgets.css');
const effects = readCss('effects.css');
const dark = readCss('dark.css');

/* 排除 :root 令牌定义块 */
const stripRoot = css => css.replace(/^:root\s*\{[\s\S]*?\}\s*/m, '');

const EXPECTED_TOKENS = [
  '--gold-ink',            // 省标签文字（浅金底上）
  '--corkboard',           // 软木板底
  '--corkboard-border',    // 软木板边框
  '--img-placeholder',     // 图片占位
  '--chat-header-grad',    // 聊天头部渐变
  '--status-ok',           // 分享成功主色
  '--status-ok-border',    // 答题正确边框
  '--status-ok-bg',        // 分享成功底
  '--status-ok-text',      // 答题正确文字
  '--status-err',          // 答题错误边框
  '--status-err-text',     // 答题错误文字
];

test('pages.css：软木板/省标签/图片占位不硬编码（:root 之外）', () => {
  const body = stripRoot(pages);
  for (const hex of ['#c9a87c', '#8b6914', '#e5e7eb']) {
    assert.doesNotMatch(body, new RegExp(hex, 'i'), `pages.css 规则体残留 ${hex}`);
  }
});

test('widgets.css：聊天头部渐变与答题状态色走令牌', () => {
  const body = stripRoot(widgets);
  assert.doesNotMatch(body, /linear-gradient\(135deg,\s*#[0-9a-f]{6}/i,
    '聊天头部渐变应引用 var(--chat-header-grad)');
  for (const hex of ['#22c55e', '#4ade80', '#ef4444', '#f87171']) {
    assert.doesNotMatch(body, new RegExp(hex, 'i'), `widgets.css 残留状态色 ${hex}`);
  }
});

test('effects.css：分享成功色走令牌', () => {
  const body = stripRoot(effects);
  for (const hex of ['#22c55e', '#16a34a', '#f0fdf4']) {
    assert.doesNotMatch(body, new RegExp(hex, 'i'), `effects.css 残留 ${hex}`);
  }
});

test('收敛令牌：全部在 base.css :root 定义且被 dark.css html.dark 覆盖', () => {
  const baseTokens = tokenMap({ base: readCss('base.css') }, /^:root$/);
  const darkTokens = tokenMap({ dark }, /^html\.dark$/);
  for (const t of EXPECTED_TOKENS) {
    assert.ok(baseTokens[t] !== undefined, `base.css 缺少 ${t}`);
    assert.ok(darkTokens[t] !== undefined, `dark.css 缺少 ${t} 覆盖`);
  }
});
