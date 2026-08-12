'use strict';
/* ============================================================
   交互行为回归测试（e2e，Playwright + 系统 Chrome）
   覆盖两轮审查修复的关键运行时行为，防"逻辑改了但没测试拦住"的回归：
   1) 实践点赞自增 + 刷新持久
   2) 导览收藏写 localStorage + aria-pressed
   3) 聊天跨页恢复：子页恢复的详情链接 base 路径正确（不 404）
   4) 知识答题断点续答（刷新后恢复进度）
   5) 留言提交显示成功 + 写入 sessionStorage
   6) 导览地图移动→桌面 resize 后出现场馆标记
   需要：npm ci + 本机 Chrome/Edge；npm run smoke 同款 _site 自建服务器
   运行：node --test tests/e2e/interactions.test.js
   ============================================================ */

const { test, before, after } = require('node:test');
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

let server = null;
let browser = null;
let baseUrl = '';

before(async () => {
  // 与 smoke 同源：构建部署产物 _site 再测"实际部署的内容"
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-site.js')], { stdio: 'pipe' });
  const siteDir = path.join(ROOT, '_site');
  const port = 20000 + Math.floor(Math.random() * 20000);
  server = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, PORT: String(port), ROOT_DIR: siteDir }
  });
  let bootErr = '';
  server.stderr.on('data', (d) => { bootErr += d; });
  try {
    await waitPort('127.0.0.1', port, 8000);
  } catch (e) {
    server.kill();
    throw new Error('server.js 启动失败: ' + (bootErr || e.message));
  }
  baseUrl = 'http://127.0.0.1:' + port;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) server.kill();
});

/** 新开独立 context 页面（storage 隔离），避免测试间串状态 */
async function newPage() {
  const ctx = await browser.newContext();
  return ctx.newPage();
}

/** 访问首页前先标记"入场已看过"，跳过 6.4s 入场遮罩 */
async function gotoNoEntrance(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => sessionStorage.setItem('entrance_done_v2', '1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200); // 等 boot + 页面初始化
}

test('实践点赞：点击自增 + 刷新后高亮与计数持久', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/pages/practice.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.practice-card .practice-likes', { timeout: 10000 });
    const before = await page.textContent('.practice-card .like-count');
    await page.click('.practice-card .practice-likes');
    await page.waitForTimeout(350);
    const after = await page.textContent('.practice-card .like-count');
    assert.strictEqual(parseInt(after, 10), parseInt(before, 10) + 1, '点赞数应自增 1');
    // 刷新：已赞高亮保持 + 计数不变（增量持久在 sessionStorage）
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.practice-card .practice-likes', { timeout: 10000 });
    const active = await page.$eval('.practice-card .practice-likes', el => el.classList.contains('active'));
    const afterReload = await page.textContent('.practice-card .like-count');
    assert.strictEqual(active, true, '刷新后点赞应保持高亮');
    assert.strictEqual(parseInt(afterReload, 10), parseInt(after, 10), '刷新后计数不应变');
  } finally {
    await page.context().close();
  }
});

test('导览收藏：点击写入 localStorage 且 aria-pressed 置真', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/pages/guide.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.venue-card .fav-btn', { timeout: 10000 });
    const id = await page.getAttribute('.venue-card .fav-btn', 'data-id');
    await page.click('.venue-card .fav-btn');
    await page.waitForTimeout(300);
    const favs = await page.evaluate(() => JSON.parse(localStorage.getItem('redguide_favs') || '[]'));
    assert.ok(Array.isArray(favs) && favs.includes(id), 'redguide_favs 应包含刚收藏的场馆 id');
    const pressed = await page.getAttribute('.venue-card .fav-btn', 'aria-pressed');
    assert.strictEqual(pressed, 'true', '收藏按钮 aria-pressed 应为 true');
  } finally {
    await page.context().close();
  }
});

test('聊天跨页恢复：子页恢复的详情链接带正确 base 路径（不 /pages/pages/ 404）', async () => {
  const page = await newPage();
  try {
    // 首页生成带详情链接的回复并保存历史
    await page.goto(baseUrl + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.setItem('entrance_done_v2', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelector('.chat-fab').click());
    await page.waitForSelector('#chat-input', { timeout: 5000 });
    await page.fill('#chat-input', '介绍井冈山革命博物馆');
    await page.press('#chat-input', 'Enter');
    await page.waitForSelector('.ai-card-link', { timeout: 8000 }); // 回复里应有详情链接
    await page.click('.chat-close'); // 关闭即保存历史到 sessionStorage
    await page.waitForTimeout(300);
    // 跨页导航到子页，恢复历史
    await page.goto(baseUrl + '/pages/guide.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.evaluate(() => document.querySelector('.chat-fab').click());
    await page.waitForSelector('.ai-card-link', { timeout: 6000 });
    const href = await page.getAttribute('.ai-card-link', 'href');
    assert.ok(href, '恢复后应有详情链接');
    assert.ok(href.startsWith('../'), '子页恢复链接应以 ../ 开头（base 路径正确），实际: ' + href);
    assert.ok(!href.includes('/pages/pages/'), '不应出现 /pages/pages/ 重复路径，实际: ' + href);
  } finally {
    await page.context().close();
  }
});

test('知识答题：刷新后断点续答（恢复进度而非从头）', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.setItem('entrance_done_v2', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    // 打开答题并开始
    await page.click('[data-action="open-quiz"]');
    await page.waitForSelector('#quiz-start-btn', { timeout: 5000 });
    await page.click('#quiz-start-btn');
    await page.waitForSelector('.quiz-progress', { timeout: 5000 });
    const q1 = await page.textContent('.quiz-progress');
    assert.ok(/第 1 \//.test(q1), '开始后应在第 1 题，实际: ' + q1);
    // 进到第 2 题（会保存断点）
    await page.click('#quiz-next-btn');
    await page.waitForTimeout(300);
    const q2 = await page.textContent('.quiz-progress');
    assert.ok(/第 2 \//.test(q2), '点下一题应到第 2 题，实际: ' + q2);
    // 刷新：断点应恢复（直接渲染第 2 题，而非回到开始屏）
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.click('[data-action="open-quiz"]');
    await page.waitForSelector('.quiz-progress', { timeout: 5000 });
    const resumed = await page.textContent('.quiz-progress');
    const hasStartBtn = await page.$('#quiz-start-btn') !== null;
    assert.ok(!hasStartBtn, '恢复时应跳过开始屏');
    assert.ok(/第 2 \//.test(resumed), '刷新后应恢复第 2 题，实际: ' + resumed);
  } finally {
    await page.context().close();
  }
});

test('留言提交：显示成功面板并写入 sessionStorage（回到第 1 页可见）', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/pages/message.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#msg-form', { timeout: 10000 });
    await page.fill('#msg-author', '测试学生');
    await page.fill('#msg-title', '交互测试留言');
    await page.fill('#msg-content', '这是一条用于验证留言提交交互的测试内容，长度超过二十个字符以保证通过校验。');
    await page.click('.form-submit');
    // 成功面板
    await page.waitForSelector('.form-success.show', { timeout: 5000 });
    // 写入 sessionStorage
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('redguide_messages') || '[]'));
    assert.ok(Array.isArray(saved) && saved.length >= 1 && saved[0].title === '交互测试留言', '新留言应写入 redguide_messages 首条');
    // 列表中应出现该留言（提交后回到第 1 页，新留言可见）
    await page.waitForSelector('.message-card .msg-title', { timeout: 5000 });
    const titles = await page.$$eval('.message-card .msg-title', els => els.map(e => e.textContent));
    assert.ok(titles.includes('交互测试留言'), '新留言应出现在列表第 1 页，当前标题: ' + JSON.stringify(titles.slice(0, 3)));
  } finally {
    await page.context().close();
  }
});

test('导览地图：移动端→桌面 resize 后出现场馆标记（此前 resize 后空白）', async () => {
  const page = await newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  try {
    await page.goto(baseUrl + '/pages/guide.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.venue-card', { timeout: 10000 });
    await page.waitForTimeout(1500);
    const markersBefore = await page.evaluate(() => document.querySelectorAll('.red-star-marker').length);
    assert.strictEqual(markersBefore, 0, '移动端初始不应有地图标记（地图按需加载）');
    // 跨断点 resize 到桌面：触发地图初始化 + 标记绘制（回归修复点）
    await page.setViewportSize({ width: 900, height: 844 });
    await page.waitForTimeout(2000);
    const markersAfter = await page.evaluate(() => document.querySelectorAll('.red-star-marker').length);
    assert.ok(markersAfter > 0, 'resize 到桌面后应出现场馆标记，实际 ' + markersAfter + ' 个');
  } finally {
    await page.context().close();
  }
});
