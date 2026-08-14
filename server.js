const http = require('http');
const fs = require('fs');
const path = require('path');

// 常见静态文件 MIME 映射
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

// 默认服务仓库根目录；ROOT_DIR 环境变量可覆盖（冒烟测试用它指向 _site 部署产物，验证"实际部署的内容"）
const ROOT = process.env.ROOT_DIR ? path.resolve(process.env.ROOT_DIR) : path.resolve(__dirname);

// 端口支持环境变量覆盖（冒烟测试可用独立端口自起服务，避免误连他人/过期实例）；
// 非法值（非整数/越界）回退默认 9876，避免 listen 同步抛 RangeError 崩溃
let PORT = 9876;
if (process.env.PORT) {
  const p = Number(process.env.PORT);
  if (Number.isInteger(p) && p >= 0 && p < 65536) PORT = p;
}

const server = http.createServer((req, res) => {
  // 解析并净化请求路径，防目录穿越
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch (e) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  const requested = urlPath === '/' ? 'index.html' : urlPath;

  // NUL 等非法字节：path.resolve 不拒绝含 NUL 的路径，fs.readFile 会同步抛错崩溃整个进程
  if (requested.includes('\u0000')) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  const filePath = path.resolve(path.join(ROOT, requested));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // 只暴露站点内容：拒绝 .git / node_modules（含任意深度的嵌套）与任意 dotfile，避免整仓被局域网可读
  const rel = path.relative(ROOT, filePath).split(path.sep);
  if (rel.some((seg) => seg.startsWith('.') || seg === 'node_modules')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const contentType = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

  // 异步回调式 readFile 不会同步抛错（NUL 等非法输入已在前面路由阶段拦截）
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',          // 防点击劫持（旧浏览器兜底）
        'Referrer-Policy': 'same-origin',         // 防跨源泄漏完整 URL
        'X-XSS-Protection': '0',                  // 现代标准：禁用过时的 XSS 过滤器
        'Content-Security-Policy': "object-src 'none'; frame-ancestors 'self'",  // 只收紧 object/frame，不动脚本样式，零误伤
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});
