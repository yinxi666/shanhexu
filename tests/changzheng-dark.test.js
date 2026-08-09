'use strict';
/* ============================================================
   长征手卷页深色模式契约
   行为：changzheng 页主题色走 --cz-* 令牌（浅色模式视觉不变），
   且每个令牌在 dark.css 的 html.dark 下有覆盖 —— 深色模式下
   金/纸色块与全站暗色视觉协调，不出现刺眼的浅色残留。
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const {
  readCss, findRules, extractVars, tokenMap,
} = require('./helpers/css-analyzer');

const cz = readCss('changzheng.css');
const dark = readCss('dark.css');

/* 排除 :root 令牌定义块（定义处允许字面量值） */
const czWithoutTokens = cz.replace(/^:root\s*\{[\s\S]*?\}\s*/m, '');

test('changzheng：金色 #ffd76e 不在 :root 之外硬编码，统一走 --cz-gold 令牌', () => {
  assert.doesNotMatch(czWithoutTokens, /#ffd76e/i,
    'changzheng.css 规则体中不应再出现硬编码金色 #ffd76e');
  const gold = findRules(cz, /^:root$/).map(r => r.decls['--cz-gold']).filter(Boolean);
  assert.ok(gold.length === 1, 'changzheng :root 应定义 --cz-gold');
});

test('changzheng：纸色 #fff1d0 不在 :root 之外硬编码，统一走 --cz-paper 令牌', () => {
  assert.doesNotMatch(czWithoutTokens, /#fff1d0/i,
    'changzheng.css 规则体中不应再出现硬编码纸色 #fff1d0');
  const paper = findRules(cz, /^:root$/).map(r => r.decls['--cz-paper']).filter(Boolean);
  assert.ok(paper.length === 1, 'changzheng :root 应定义 --cz-paper');
});

test('changzheng：:root 定义 --cz-* 令牌集非空（防止空契约）', () => {
  const tokens = extractVars(cz, /^:root$/);
  const czTokens = [...tokens].filter(t => t.startsWith('--cz-'));
  assert.ok(czTokens.length >= 3, `--cz-* 令牌集过少: ${czTokens.length}`);
});

test('changzheng：每个 --cz-* 令牌都被 dark.css 的 html.dark 覆盖', () => {
  const czTokens = [...extractVars(cz, /^:root$/)].filter(t => t.startsWith('--cz-'));
  const darkTokens = tokenMap({ dark }, /^html\.dark$/);
  for (const t of czTokens) {
    assert.ok(darkTokens[t] !== undefined, `dark.css 缺少 ${t} 的覆盖`);
  }
});
