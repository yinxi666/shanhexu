'use strict';
/* ============================================================
   批次④ 行为契约：主题跟随 / 视频加载 / 无障碍属性 / 回退栈
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { CSS_DIR, readCss } = require('./helpers/css-analyzer');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const VIDEO_PAGES = [
  ['index.html', 'assets/'],
  ['pages/guide.html', '../assets/'],
  ['pages/detail.html', '../assets/'],
  ['pages/message.html', '../assets/'],
  ['pages/policy.html', '../assets/'],
  ['pages/practice.html', '../assets/'],
];

/* ---------------- 2. 国旗视频：首屏不自动下载 ---------------- */

test('6 个页面的 flag-video 均 preload="none" + poster + 无 HTML autoplay', () => {
  for (const [file, _prefix] of VIDEO_PAGES) {
    const html = read(file);
    const m = html.match(/<video class="flag-video"[^>]*>/s);
    assert.ok(m, `${file} 应有 flag-video 元素`);
    const tag = m[0];
    assert.ok(!/\bautoplay\b/.test(tag), `${file}: video 不应有 HTML autoplay（改由 JS 大屏自动播放）`);
    assert.match(tag, /preload="none"/, `${file}: video 应 preload="none"`);
    assert.match(tag, /poster="[^"]+\.(webp|png|jpg|jpeg)"/, `${file}: video 应有 poster`);
  }
});

/* ---------------- 3. 桌面自动播放逻辑（≥1024px 且不减少动效） ---------------- */

test('app.js 提供大屏自动播放 flag-video 的逻辑（min-width 1024 + 尊重 prefers-reduced-motion）', () => {
  const js = read('js/app.js');
  assert.match(js, /flag-video/, 'app.js 应引用 flag-video');
  assert.match(js, /play\(\)/, '应调用 video.play()');
  assert.match(js, /1024/, '应检查桌面断点 1024px');
  assert.match(js, /prefers-reduced-motion/, '应尊重系统减少动效设置');
});

/* ---------------- 4. canvas 声明式无障碍 ---------------- */

test('所有 createElement("canvas") 附带 aria-hidden="true"', () => {
  for (const file of ['js/entrance-animation.js', 'js/cardgen.js']) {
    const lines = read(file).split(/\r?\n/).map((l, i) => [i + 1, l]);
    for (let i = 0; i < lines.length; i++) {
      const [no, line] = lines[i];
      if (/createElement\(['"]canvas['"]\)/.test(line)) {
        const claim = (lines[i + 1]?.[1] || '') + ' ' + line;
        assert.match(claim, /aria-hidden/, `${file}:${no} createElement('canvas') 应立即声明 aria-hidden`);
      }
    }
  }
});

test('changzheng.html 的 cz-atmos canvas 附带 aria-hidden="true"', () => {
  const html = read('pages/changzheng.html');
  const line = html.split(/\r?\n/).find(l => l.includes('cz-atmos'));
  assert.ok(line, '应有 cz-atmos canvas');
  assert.match(line, /aria-hidden="true"/, 'cz-atmos 应声明 aria-hidden');
});

/* ---------------- 5. 品牌 Logo 尺寸属性（防 CLS） ---------------- */

test('site-header.html 品牌 Logo 携带 width/height 属性', () => {
  const html = read('templates/site-header.html');
  const line = html.split(/\r?\n/).find(l => l.includes('brand-logo'));
  assert.ok(line, '应有 brand-logo img');
  assert.match(line, /width="\d+"/, '应有 width 属性');
  assert.match(line, /height="\d+"/, '应有 height 属性');
});

/* ---------------- 6. 页脚导航 aria-label ---------------- */

test('site-footer.html 两个导航 ul 均声明 aria-label', () => {
  const html = read('templates/site-footer.html');
  const uls = html.match(/<ul[^>]*>/g) || [];
  assert.ok(uls.length >= 2, '页脚应有 2 个导航列表');
  for (const ul of uls) {
    assert.match(ul, /aria-label="/, `页脚 ul 应带 aria-label: ${ul}`);
  }
});

/* ---------------- 7. 返回顶部 hover 仅作用于可见态 + 打印隐藏灯箱 ---------------- */

test('back-to-top hover 选择器限定 visible 态（避免 transform 跳变）', () => {
  const css = read('css/pages.css');
  assert.ok(!/\.back-to-top:hover/.test(css), '.back-to-top:hover 应改为 .back-to-top.visible:hover');
  assert.match(css, /\.back-to-top\.visible:hover/, '应有 .back-to-top.visible:hover 规则');
});

test('打印样式隐藏 .lightbox（弹窗组件的最后遗漏项）', () => {
  const css = read('css/effects.css');
  const printBlock = css.match(/@media print\s*\{[\s\S]*?\n\}/);
  assert.ok(printBlock, 'effects.css 应有打印样式块');
  assert.match(printBlock[0], /\.lightbox/, '打印块应隐藏 .lightbox');
});

/* ---------------- 8. 字体回退栈以通用族收尾 ---------------- */

test('所有 font-family 声明以 serif/sans-serif 通用族收尾', () => {
  const files = fs.readdirSync(CSS_DIR).filter(f => f.endsWith('.css'));
  const offenders = [];
  for (const f of files) {
    const css = readCss(f);
    const re = /font-family\s*:\s*([^;}]+)/g;
    let m;
    while ((m = re.exec(css))) {
      const stack = m[1].trim();
      if (!/(serif|sans-serif|monospace|cursive|fantasy|system-ui|emoji|math|fangsong|inherit|initial)$/.test(stack)) {
        offenders.push(`${f}: font-family: ${stack}`);
      }
    }
  }
  assert.deepStrictEqual(offenders, [],
    `font-family 缺少通用族回退:\n  ${offenders.join('\n  ')}`);
});

/* ---------------- 1. theme-color 跟随深色模式 ---------------- */

test('darkmode.js 同步 meta[name=theme-color]（浅色 #b91c1c / 深色 #0f172a）', () => {
  const js = read('js/darkmode.js');
  assert.match(js, /theme-color/, 'darkmode.js 应处理 theme-color meta');
  assert.match(js, /#b91c1c|b91c1c/, '应有浅色 theme-color 值（品牌红）');
  assert.match(js, /#0f172a|0f172a/, '应有深色 theme-color 值（暗蓝黑）');
  /* 行为：init 时设置一次，toggle 时更新 */
  assert.ok((js.match(/setAttribute\(/g) || []).length >= 1, '应通过 setAttribute 写入 meta');
  assert.ok(js.includes("document.querySelector('meta[name=\"theme-color\"]')") ||
    js.includes('meta[name="theme-color"]'), '应查询 theme-color meta');
});
