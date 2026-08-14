'use strict';
/* ============================================================
   Emoji 清理契约
   行为：站点交付物（HTML/JS/JSON/CSS）的用户可见内容不使用 emoji
   图标（跨平台渲染差异大，与红金水墨审美冲突）。
   保留的排版文本符号：★(U+2605) ✕(U+2715) ✦(U+2726) ☰(U+2630)。
   排除：tests/ scripts/ docs/（工具链自用，非交付物）。
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'docs', '.claude', 'tests', 'scripts', '_site']);

/* emoji 区段全集，扣除保留文本符号 ★(2605) ☰(2630) ✕(2715) ✦(2726) ➤(27A4)；
   补充 Misc 技术区（U+23xx）：⏳(23F3) 等常用 emoji 此前漏扫 */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{231A}-\u{231B}\u{2328}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{2600}-\u{2604}\u{2606}-\u{262F}\u{2631}-\u{26FF}\u{2700}-\u{2714}\u{2716}-\u{2725}\u{2727}-\u{27A3}\u{27A5}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

function collectFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const s = fs.statSync(p);
    if (s.isDirectory()) {
      if (!SKIP.has(e)) out.push(...collectFiles(p));
    } else if (/\.(html|js|json|css)$/.test(e)) {
      out.push(p);
    }
  }
  return out;
}

test('交付物 HTML/JS/JSON/CSS 不含 emoji（保留 ★✕✦☰ 排版符号）', () => {
  const offenders = [];
  for (const p of collectFiles(ROOT)) {
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    lines.forEach((l, i) => {
      const m = l.match(EMOJI);
      if (m) offenders.push(`${path.relative(ROOT, p)}:${i + 1}: ${l.trim().slice(0, 100)}`);
    });
  }
  assert.deepStrictEqual(offenders, [],
    `交付物中存在 emoji:\n  ${offenders.join('\n  ')}`);
});
