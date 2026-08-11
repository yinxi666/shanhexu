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
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const { chromium } = require('playwright');

const PORT = 9876;
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
  // 若已有服务在跑(用户本地开着)则直接复用
  try {
    await waitPort('127.0.0.1', PORT, 800);
    return { url: 'http://localhost:' + PORT, close: () => { } };
  } catch (e) { /* 未运行，启动新服务 */ }
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, stdio: 'ignore' });
  await waitPort('127.0.0.1', PORT, 8000);
  return { url: 'http://localhost:' + PORT, close: () => child.kill() };
}

test('运行时冒烟：7 个页面无 JS 报错 / 模块加载失败 / 资源 404', async () => {
  const { url, close } = await startServer();
  let browser;
  try {
    // 用本机系统 Chrome 无头运行，避免下载 Playwright 自带 chromium
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    const errors = [];

    page.on('pageerror', (err) => errors.push('[JS异常] ' + err.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('[console错误] ' + m.text()); });
    page.on('requestfailed', (r) => {
      const u = r.url();
      if (u.startsWith(url)) errors.push('[资源失败] ' + u.replace(url, '') + ' ' + (r.failure() && r.failure().errorText));
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
      const resp = await page.goto(url + p, { waitUntil: 'networkidle' });
      assert.ok(resp && resp.ok(), name + ' 应返回 200，实际 ' + (resp && resp.status()));
      // 留出 JS 初始化时间(数据加载/地图/入场动画)
      await page.waitForTimeout(p === '/pages/changzheng.html' ? 1500 : 1000);
    }

    assert.deepStrictEqual(errors, [], '页面运行时错误：\n' + errors.join('\n'));
  } finally {
    if (browser) await browser.close();
    close();
  }
});
