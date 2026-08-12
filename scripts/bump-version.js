/* ============================================================
   版本号同步脚本
   读取 js/version.js 中的 ASSET_VERSION，统一刷新：
   1) 所有 HTML 文件里的 ?v=...
   2) js/ 下 ES 模块的相对 import 说明符（.js?v=...），实现模块级缓存破击
   用法：node scripts/bump-version.js
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VERSION_FILE = path.join(ROOT, 'js', 'version.js');

function extractVersion() {
  const content = fs.readFileSync(VERSION_FILE, 'utf8');
  const match = content.match(/ASSET_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error('无法从 js/version.js 解析 ASSET_VERSION');
  }
  const version = match[1];
  // 只接受 10-16 位纯数字，防止版本写成 8 位/带字母时 replace 静默空转仍"成功"
  if (!/^\d{10,16}$/.test(version)) {
    throw new Error('ASSET_VERSION 非法（需 10-16 位纯数字，当前: ' + version + '），中止同步');
  }
  return version;
}

function processFile(filePath, version) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(/(\?v=)\d{10,16}/g, `$1${version}`);
  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('已更新:', path.relative(ROOT, filePath));
  }
}

// ES 模块 import 说明符：from './x.js' / from '../sub/x.js' / import './sub/x.js'
// 支持 ./ 与 ../ 前缀 + 多段子目录 + 大小写混合文件名（工具链不再对驼峰/上目录静默漏刷新）；
// 已带 ?v= 则替换版本号，幂等
const JS_IMPORT_RE = /((?:from|import)\s+['"]\.{1,2}\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.js)(?:\?v=\d{10,16})?(['"])/g;

function processJsImports(filePath, version) {
  // 仅处理 js/ 目录下的 ES 模块；scripts/ 是 CommonJS（require），不会命中
  if (!filePath.startsWith(path.join(ROOT, 'js') + path.sep)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(JS_IMPORT_RE, `$1?v=${version}$2`);
  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('已更新:', path.relative(ROOT, filePath));
  }
}

function walk(dir, callback) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // 跳过构建产物/版本库/内部文档/代理缓存目录，避免误改或误伤
      if (entry === 'node_modules' || entry === '.git' || entry === '_site' || entry === 'docs' || entry === '.claude' || entry === '_claude') continue;
      walk(fullPath, callback);
    } else if (stat.isFile() && entry.endsWith('.html')) {
      callback(fullPath, 'html');
    } else if (stat.isFile() && entry.endsWith('.js')) {
      callback(fullPath, 'js');
    }
  }
}

const version = extractVersion();
console.log('当前版本号:', version);
walk(ROOT, (filePath, type) => {
  if (type === 'html') processFile(filePath, version);
  else processJsImports(filePath, version);
});
console.log('同步完成');
