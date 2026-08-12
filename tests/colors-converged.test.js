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

/* 排除 :root 令牌定义块（按选择器定位 + 花括号配对，覆盖任意位置的 :root 块，替代原"仅行首"脆弱正则） */
function stripRootBlocks(css) {
  const re = /:root(?=\s*\{)/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(css))) {
    const open = css.indexOf('{', m.index);
    let depth = 1;
    let i = open + 1;
    while (depth > 0 && i < css.length) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    out += css.slice(last, m.index);
    last = i;
    re.lastIndex = i;
  }
  return out + css.slice(last);
}

const EXPECTED_TOKENS = [
  '--gold-ink',            // 省标签文字（浅金底上）
  '--corkboard',           // 软木板底
  '--corkboard-border',    // 软木板边框
  '--img-placeholder',     // 图片占位
  '--chat-header-grad',    // 聊天头部渐变
  '--status-ok',           // 分享成功主色
  '--status-ok-border',    // 答题正确边框
  '--status-err',          // 答题错误边框
];

test('pages.css：软木板/省标签/图片占位不硬编码（:root 之外）', () => {
  const body = stripRootBlocks(pages);
  for (const hex of ['#c9a87c', '#8b6914', '#e5e7eb']) {
    assert.doesNotMatch(body, new RegExp(hex, 'i'), `pages.css 规则体残留 ${hex}`);
  }
});

test('widgets.css：聊天头部渐变与答题状态色走令牌', () => {
  const body = stripRootBlocks(widgets);
  assert.doesNotMatch(body, /linear-gradient\(135deg,\s*#[0-9a-f]{6}/i,
    '聊天头部渐变应引用 var(--chat-header-grad)');
  for (const hex of ['#22c55e', '#4ade80', '#ef4444', '#f87171']) {
    assert.doesNotMatch(body, new RegExp(hex, 'i'), `widgets.css 残留状态色 ${hex}`);
  }
});

test('effects.css：分享成功色走令牌', () => {
  const body = stripRootBlocks(effects);
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
