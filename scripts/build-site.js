#!/usr/bin/env node
/* ============================================================
   站点打包脚本（零依赖，node scripts/build-site.js）
   用途：把站点运行所需文件组装进 _site/，与 .github/workflows/static.yml
         的部署打包保持同源（CI 部署与本地 smoke 共用同一份产物）。
   输出：_site/（可整体静态托管 / upload-pages-artifact）
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, '_site');

/** 递归拷贝目录（含子目录），目标不存在则创建 */
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dst, entry);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// 清空并重建 _site
fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(SITE, { recursive: true });

// 1) 根目录固定文件
for (const f of ['index.html', 'favicon.png', 'manifest.json', '.nojekyll', 'sw.js']) {
  if (fs.existsSync(path.join(ROOT, f))) {
    fs.copyFileSync(path.join(ROOT, f), path.join(SITE, f));
  }
}
// 2) 根目录 webp/jpg 素材（天安门.webp / 长征.webp 等）
for (const f of fs.readdirSync(ROOT)) {
  if (/\.(webp|jpg)$/i.test(f)) fs.copyFileSync(path.join(ROOT, f), path.join(SITE, f));
}
// 3) 运行目录
for (const d of ['pages', 'css', 'js', 'data', 'assets', 'images', 'templates']) {
  if (fs.existsSync(path.join(ROOT, d))) copyDir(path.join(ROOT, d), path.join(SITE, d));
}
// 4) docs/素材说明（仅此子目录；不部署学校服务器部署说明等内部文档）
if (fs.existsSync(path.join(ROOT, 'docs', '素材说明'))) {
  copyDir(path.join(ROOT, 'docs', '素材说明'), path.join(SITE, 'docs', '素材说明'));
}

console.log('已生成 _site/（站点运行文件已打包，server.js/README/tests/scripts 不在其中）');
