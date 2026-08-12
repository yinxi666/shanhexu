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

const ROOT = path.resolve(__dirname);

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

  // 只暴露站点内容：拒绝 .git / node_modules 与任意 dotfile，避免整仓（含版本控制元数据）被局域网可读
  const rel = path.relative(ROOT, filePath).split(path.sep);
  if (rel.some((seg) => seg.startsWith('.')) || rel[0] === 'node_modules') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const contentType = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

  // try/catch：readFile 对非法路径可能同步抛错（如含 NUL），捕获后返回 400 而非崩溃
  try {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-cache'
        });
        res.end(data);
      }
    });
  } catch (e) {
    res.writeHead(400);
    res.end('Bad request');
  }
});

server.listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT);
});
