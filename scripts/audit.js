#!/usr/bin/env node
/* ============================================================
   山河序静态审计脚本（零依赖，node scripts/audit.js）
   用途：提交前 5 秒体检，抓重构最容易漏的三类问题
   1) 版本一致性：所有 HTML 的 ?v= 必须等于 js/version.js 的 ASSET_VERSION
   2) import 完整性：每个 JS 的相对 import 目标文件必须存在
   3) 无死引用：不得引用已删除的 common.js / features.js / styles.css
   4) 数据健康（仅报告）："需进一步核验"残留数、场馆类别取值
   1-3 硬失败退出（exit 1），4 仅打印提醒
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '_site', 'docs', '.claude', '_claude', 'assets', 'images']);
const DEAD_FILES = ['common.js', 'features.js', 'styles.css'];

const errors = [];

/* ---- 遍历（跳过产物/库/内部文档目录） ---- */
function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, cb);
    } else {
      cb(full);
    }
  }
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/* ---- 1) 版本一致性 ---- */
const versionMatch = fs.readFileSync(path.join(ROOT, 'js', 'version.js'), 'utf8')
  .match(/ASSET_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!versionMatch) {
  errors.push('js/version.js 无法解析 ASSET_VERSION');
} else {
  const version = versionMatch[1];
  let htmlChecked = 0, jsChecked = 0;
  walk(ROOT, (f) => {
    if (!f.endsWith('.html')) return;
    htmlChecked++;
    const content = fs.readFileSync(f, 'utf8');
    const bad = [...new Set([...content.matchAll(/\?v=(\d{10,16})/g)].map(m => m[1]).filter(v => v !== version))];
    if (bad.length) {
      errors.push(`版本不一致 ${path.relative(ROOT, f)}：应=${version}，出现=${bad.join(',')}`);
    }
  });
  // JS 模块 import 上的 ?v= 同样须与 ASSET_VERSION 一致（补全"只查 HTML"口径，防 bump-version 漏同步）
  walk(ROOT, (f) => {
    if (!f.endsWith('.js') || f.startsWith(path.join(ROOT, 'scripts'))) return;
    jsChecked++;
    const content = fs.readFileSync(f, 'utf8');
    const bad = [...new Set([...content.matchAll(/\?v=(\d{10,16})/g)].map(m => m[1]).filter(v => v !== version))];
    if (bad.length) {
      errors.push(`版本不一致 ${path.relative(ROOT, f)}：应=${version}，出现=${bad.join(',')}`);
    }
  });
  console.log(`版本号: ${version} | 检查 HTML ${htmlChecked} 个 / JS ${jsChecked} 个`);
}

/* ---- 2) import 完整性 ---- */
const jsDir = path.join(ROOT, 'js');
const jsFiles = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
for (const f of jsFiles) {
  const content = fs.readFileSync(path.join(jsDir, f), 'utf8');
  // 兼容 bump-version 写入的 ?v= 缓存破击后缀
  for (const m of content.matchAll(/(?:from|import)\s+['"]\.\/([a-z0-9-]+)\.js(?:\?v=\d{10,16})?['"]/g)) {
    const target = path.join(jsDir, m[1] + '.js');
    if (!fs.existsSync(target)) {
      errors.push(`import 目标不存在：js/${f} → ./${m[1]}.js`);
    }
  }
}

/* ---- 3) 无死引用 ---- */
for (const f of jsFiles) {
  const code = stripComments(fs.readFileSync(path.join(jsDir, f), 'utf8'));
  for (const d of DEAD_FILES) {
    if (new RegExp(`['"]\\.?\\/?${d.replace('.', '\\.')}(?:\\?v=\\d+)?['"]`).test(code)) {
      errors.push(`死引用：js/${f} 指向已删除的 ${d}`);
    }
  }
}
walk(ROOT, (f) => {
  if (!/\.(html|css)$/.test(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  for (const d of DEAD_FILES) {
    if (new RegExp(`(?:href|src|url\\()=["']?[^"')]*${d.replace('.', '\\.')}`).test(content)) {
      errors.push(`死引用：${path.relative(ROOT, f)} 指向已删除的 ${d}`);
    }
  }
});

/* ---- 3.5) 资源存在性：HTML src/href 与 CSS url() 指向的本地文件必须存在 ---- */
function resolveRef(ref, fileDir) {
  // 模板 {{BASE}} 占位符部署时替换为 '' 或 '../'，按根相对解析（根版本必然存在）
  if (ref.startsWith('{{BASE}}')) return path.join(ROOT, ref.slice('{{BASE}}'.length));
  return path.resolve(fileDir, ref);
}
walk(ROOT, (f) => {
  if (!/\.(html|css)$/.test(f)) return;
  const fileDir = path.dirname(f);
  const content = fs.readFileSync(f, 'utf8');
  const refs = [];
  for (const m of content.matchAll(/(?:src|href|poster)=["']([^"'#]+)["']/g)) refs.push(m[1]);
  for (const m of content.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) refs.push(m[2]);
  for (let ref of refs) {
    ref = ref.split('?')[0].trim(); // 去掉 ?v= 缓存破击后缀
    // 跳过外链 / 锚点 / 协议内联 / 根绝对路径；%23 为 URL 编码的 #（SVG 滤镜片段引用）
    if (!ref || ref.startsWith('http') || ref.startsWith('mailto') || ref.startsWith('tel')
      || ref.startsWith('data:') || ref.startsWith('blob:') || ref.startsWith('//')
      || ref.startsWith('#') || ref.startsWith('%23') || ref.startsWith('/')) continue;
    // BASE 混在路径中间（非常规）跳过，避免误报
    if (ref.includes('{{BASE}}') && !ref.startsWith('{{BASE}}')) continue;
    const target = resolveRef(ref, fileDir);
    if (!fs.existsSync(target)) {
      errors.push(`资源不存在：${path.relative(ROOT, f)} 引用 ${ref}`);
    }
  }
});

/* ---- 4) 数据健康（仅报告） ---- */
let pendingResidue = 0;
for (const f of fs.readdirSync(path.join(ROOT, 'data')).filter((f) => f.endsWith('.json'))) {
  const content = fs.readFileSync(path.join(ROOT, 'data', f), 'utf8');
  pendingResidue += (content.match(/需进一步核验/g) || []).length;
}
const categories = new Set();
for (const f of ['venues.json', 'extended-venues-meta.json']) {
  const p = path.join(ROOT, 'data', f);
  if (!fs.existsSync(p)) continue;
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (Array.isArray(data)) {
    data.forEach((v) => { if (v && v.category) categories.add(v.category); });
  } else {
    Object.values(data).forEach((v) => { if (v && v.category) categories.add(v.category); });
  }
}

console.log('\n数据健康（仅报告，不阻断）:');
console.log(`  - "需进一步核验" 残留: ${pendingResidue} 处`);
console.log(`  - 场馆类别取值: ${categories.size} 种 → ${[...categories].join('、')}`);

/* ---- 汇总 ---- */
console.log('');
if (errors.length) {
  console.log(`✗ 硬错误 ${errors.length} 个:`);
  errors.forEach((e) => console.log('  - ' + e));
  process.exitCode = 1;
} else {
  console.log('✓ 硬检查全部通过（版本一致 / import 完整 / 无死引用）');
}
