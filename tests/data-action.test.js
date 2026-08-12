'use strict';
/* ============================================================
   data-action 事件委托契约测试
   行为：全站所有 data-action="值" 都必须能在 js/action-delegate.js
   的单一 switch 中找到对应 case（防字符串枚举漂移/拼错值静默失效）。
   背景：data-action 是无类型字符串契约——漏一个 case、拼错一个值
   都会让该动作静默不触发（default 吞掉），因此用测试守住枚举闭环。
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./helpers/css-analyzer');

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (!['node_modules', '.git', '_site', 'assets', 'images', 'docs', 'tests', 'scripts'].includes(entry)) walk(full, cb);
    } else {
      cb(full);
    }
  }
}

test('data-action 契约：所有使用的动作值都在 action-delegate 单一 switch 中有对应 case', () => {
  const delegate = fs.readFileSync(path.join(ROOT, 'js', 'action-delegate.js'), 'utf8');
  const cases = [...delegate.matchAll(/case\s+'([^']+)':/g)].map((m) => m[1]);
  assert.ok(cases.length >= 10, `action-delegate 应有 ≥10 个 case，实际 ${cases.length}`);

  const used = new Set();
  walk(ROOT, (f) => {
    if (!/\.(js|html)$/.test(f)) return;
    const content = fs.readFileSync(f, 'utf8');
    for (const m of content.matchAll(/data-action=["']([^"']+)["']/g)) used.add(m[1]);
  });
  assert.ok(used.size >= 10, `应收集到 ≥10 个 data-action 使用值，实际 ${used.size}`);

  const missing = [...used].filter((v) => !cases.includes(v));
  assert.deepStrictEqual(missing, [], `使用但无对应 case 的 data-action 值：${missing.join(', ')}`);
});
