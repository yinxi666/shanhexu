'use strict';
/* ============================================================
   字号契约
   行为：全站字号不低于 12px —— 中文 10px 级字号不可读且会
   触发 iOS 自动缩放。
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { CSS_DIR, readCss } = require('./helpers/css-analyzer');

test('全站 css 无小于 12px 的 font-size 声明', () => {
  const files = fs.readdirSync(CSS_DIR).filter(f => f.endsWith('.css'));
  const offenders = [];
  for (const f of files) {
    const css = readCss(f);
    const re = /font-size\s*:\s*([^;!]+)/g;
    let m;
    while ((m = re.exec(css))) {
      const val = m[1].trim();
      let px = null;
      if (/^-?\d+(\.\d+)?px$/.test(val)) px = parseFloat(val);
      else if (/^-?0\.\d+rem$/.test(val)) px = parseFloat(val) * 16;
      else if (/^-?\d+rem$/.test(val)) px = parseFloat(val) * 16;
      else if (/^-?0\.\d+em$/.test(val)) px = parseFloat(val) * 16;
      if (px !== null && px < 12) {
        offenders.push(`${f}: font-size: ${val} (= ${px}px)`);
      }
    }
  }
  assert.deepStrictEqual(offenders, [],
    `存在小于 12px 的字号:\n  ${offenders.join('\n  ')}`);
});
