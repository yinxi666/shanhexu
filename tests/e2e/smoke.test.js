'use strict';
/* ============================================================
   运行时冒烟测试（e2e）
   行为：用本机系统 Chrome 无头打开各页面，捕获 JS 未捕获异常、
   console 错误、站点内资源加载失败（ES 模块 404 等）。
   静态测试覆盖不了的运行时问题（重构接线、模块加载、初始化报错）
   在这里兜底。需要：npm install + 本机装有 Chrome/Edge。
   运行：npm run smoke（node --test tests/e2e/smoke.test.js）
   ============================================================ */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawn, execFileSync } = require('child_process');
const net = require('net');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');

function waitPort(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const sock = net.connect(port, host, () => { sock.destroy(); resolve(true); });
      sock.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('端口未就绪'));
        else setTimeout(tick, 200);
      });
    };
    tick();
  });
}

async function startServer() {
  // 0) 组装部署产物 _site（与 CI 打包同源），冒烟直接测"真正部署的内容"——
  //    否则 deploy 打包遗漏某目录时 CI 全绿、线上却 404
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-site.js')], { stdio: 'pipe' });
  const siteDir = path.join(ROOT, '_site');

  // 1) 自起独立端口的全新服务：复用 server.js 但 ROOT_DIR 指向 _site（避免复用已在 9876 运行的实例）
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'pipe'], // 捕获 stderr，启动失败可诊断
    env: { ...process.env, PORT: String(port), ROOT_DIR: siteDir }
  });
  let bootErr = '';
  child.stderr.on('data', (d) => { bootErr += d; });
  try {
    await waitPort('127.0.0.1', port, 8000);
  } catch (e) {
    child.kill();
    throw new Error('server.js 启动失败: ' + (bootErr || e.message));
  }
  if (child.exitCode !== null) {
    throw new Error('server.js 提前退出: ' + bootErr);
  }
  return { url: 'http://127.0.0.1:' + port, close: () => child.kill() };
}

test('运行时冒烟：7 个页面无 JS 报错 / 模块加载失败 / 资源 404', async () => {
  const { url, close } = await startServer();
  let browser;
  try {
    // 用本机系统 Chrome 无头运行，避免下载 Playwright 自带 chromium
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    // block Service Worker：冒烟测的是当前构建产物，避免 SW 缓存上一版本资源干扰
    const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage();
    const errors = [];

    page.on('pageerror', (err) => errors.push('[JS异常] ' + err.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('[console错误] ' + m.text()); });
    page.on('requestfailed', (r) => {
      const u = r.url();
      // 只记录同源资源失败（ES 模块 404 / 本站资源缺失）；
      // 外部 CDN（echarts/leaflet/字体）失败属可降级场景，首页会回退 SVG，不计为错误
      if (!u.startsWith(url)) return;
      const err = r.failure() && r.failure().errorText;
      // 切页导航会 abort 上一页仍在途的同源请求（net::ERR_ABORTED），并非真实资源失败，跳过避免误报
      if (err === 'net::ERR_ABORTED') return;
      errors.push('[资源失败] ' + u.replace(url, '') + ' ' + err);
    });

    const pages = [
      ['首页', '/'],
      ['全国导览', '/pages/guide.html'],
      ['场馆详情', '/pages/detail.html?id=1'],
      ['重走长征', '/pages/changzheng.html'],
      ['时事政策', '/pages/policy.html'],
      ['实践成果', '/pages/practice.html'],
      ['学习留言', '/pages/message.html'],
    ];

    for (const [name, p] of pages) {
      // domcontentloaded 而非 networkidle：外部 CDN 慢/被墙时 networkidle 可能永不空闲导致超时，
      // 而本站 ES 模块在 DOMContentLoaded 前即求值，足以捕获模块加载/初始化错误
      const resp = await page.goto(url + p, { waitUntil: 'domcontentloaded' });
      assert.ok(resp && resp.ok(), name + ' 应返回 200，实际 ' + (resp && resp.status()));
      // 等待 app.js boot 完成标志（替代固定 sleep：慢机器不再按固定时长赌时序）。
      // 超时是真实缺陷（boot 挂起/永远不设置标志）：显式记入 errors，让测试红掉而非静默通过
      try {
        await page.waitForFunction('window.__shanhexuBooted === true', null, { timeout: 15000 });
      } catch (e) {
        errors.push('[初始化超时] ' + name + ' 的 app.js boot 未在 15s 内完成');
      }
    }

    assert.deepStrictEqual(errors, [], '页面运行时错误：\n' + errors.join('\n'));
  } finally {
    if (browser) await browser.close();
    close();
  }
});
