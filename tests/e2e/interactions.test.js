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
  // block Service Worker：交互测试测的是当前构建产物，避免 SW 缓存旧资源干扰
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  return ctx.newPage();
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

test('长征页：迷你地图圆点跳站切换活动站', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/pages/changzheng.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cz-route-dots g[data-station-id]', { timeout: 10000 });
    await page.waitForTimeout(2200); // 等布局 + 初始站激活
    const before = await page.$eval('.cz-hud-station', el => el.textContent);
    await page.click('#cz-route-dots g[data-station-id="5"]');
    await page.waitForTimeout(1200); // 等 setActive
    const activeId = await page.$eval('.cz-stamp.active', el => el.dataset.stationId);
    assert.strictEqual(activeId, '5', '点击迷你地图圆点 5 后活动站应为 5，实际 ' + activeId);
    const after = await page.$eval('.cz-hud-station', el => el.textContent);
    assert.notStrictEqual(after, before, 'HUD 站名应随跳站变化');
  } finally {
    await page.context().close();
  }
});

test('长征页：文物弹窗打开后 Esc 关闭', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/pages/changzheng.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.cz-note[data-station-id="1"] .cz-note-relic', { timeout: 10000 });
    await page.waitForTimeout(2200);
    await page.click('.cz-note[data-station-id="1"] .cz-note-relic');
    await page.waitForSelector('#cz-relic-modal.show', { timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const stillOpen = await page.$eval('#cz-relic-modal', el => el.classList.contains('show'));
    assert.strictEqual(stillOpen, false, 'Esc 后文物弹窗应关闭');
  } finally {
    await page.context().close();
  }
});

test('聊天安全：恢复被篡改的 sessionStorage 时净化脚本/事件属性/javascript 链接', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      sessionStorage.setItem('entrance_done_v2', '1');
      // 篡改聊天历史：注入 onerror 事件属性 + javascript: 链接 + <script>
      sessionStorage.setItem('redguide_chat', JSON.stringify([
        { cls: 'bot', text: 'x', html: '<img src="x" onerror="window.__pwned=1"><a href="javascript:window.__pwned2=1">bad</a><script>window.__pwned3=1</script>' }
      ]));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelector('.chat-fab').click());
    await page.waitForSelector('.chat-bubble', { timeout: 5000 });
    await page.waitForTimeout(300);
    const st = await page.evaluate(() => ({
      pwned: window.__pwned === 1,
      pwned2: window.__pwned2 === 1,
      pwned3: window.__pwned3 === 1,
      onAttr: document.querySelectorAll('.chat-bubble [onerror], .chat-bubble [onload], .chat-bubble [onclick]').length,
      badHref: !!document.querySelector('.chat-bubble a[href^="javascript:"]')
    }));
    assert.strictEqual(st.pwned, false, 'onerror 不应执行');
    assert.strictEqual(st.pwned2, false, 'javascript: 链接不应生效');
    assert.strictEqual(st.pwned3, false, '<script> 不应执行');
    assert.strictEqual(st.onAttr, 0, '不应残留 on* 事件属性');
    assert.strictEqual(st.badHref, false, '不应残留 javascript: href');
  } finally {
    await page.context().close();
  }
});

test('导览收藏：再点一次取消收藏', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/pages/guide.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.venue-card .fav-btn', { timeout: 10000 });
    await page.click('.venue-card .fav-btn');
    await page.waitForTimeout(250);
    const added = await page.evaluate(() => JSON.parse(localStorage.getItem('redguide_favs') || '[]'));
    assert.ok(Array.isArray(added) && added.length >= 1, '首次点击应加入收藏');
    await page.click('.venue-card .fav-btn'); // 再点取消
    await page.waitForTimeout(250);
    const id = await page.getAttribute('.venue-card .fav-btn', 'data-id');
    const removed = await page.evaluate(() => JSON.parse(localStorage.getItem('redguide_favs') || '[]'));
    assert.ok(!removed.includes(id), '再点应取消收藏（redguide_favs 不再含该 id）');
  } finally {
    await page.context().close();
  }
});

test('知识答题：作答后选项锁定 + 下一题/上一题导航', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.setItem('entrance_done_v2', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.click('[data-action="open-quiz"]');
    await page.waitForSelector('#quiz-start-btn', { timeout: 5000 });
    await page.click('#quiz-start-btn');
    await page.waitForSelector('.quiz-opt', { timeout: 5000 });
    // 作答：选项锁定 + 出现反馈
    await page.click('.quiz-opt');
    await page.waitForTimeout(250);
    const locked = await page.$$eval('.quiz-opt', els => els.every(e => e.disabled));
    assert.strictEqual(locked, true, '作答后选项应锁定');
    const feedback = await page.textContent('#quiz-feedback');
    assert.ok(feedback.trim().length > 0, '作答后应显示反馈');
    // 下一题 → 上一题
    await page.click('#quiz-next-btn');
    await page.waitForTimeout(250);
    const q2 = await page.textContent('.quiz-progress');
    assert.ok(/第 2 \//.test(q2), '下一题应在第 2 题，实际: ' + q2);
    await page.click('#quiz-prev-btn');
    await page.waitForTimeout(250);
    const q1 = await page.textContent('.quiz-progress');
    assert.ok(/第 1 \//.test(q1), '上一题应回第 1 题，实际: ' + q1);
  } finally {
    await page.context().close();
  }
});

test('留言表单：内容不足 20 字被拦截不提交', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/pages/message.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#msg-form', { timeout: 10000 });
    await page.fill('#msg-author', '测试');
    await page.fill('#msg-title', '太短');
    await page.fill('#msg-content', '太短内容'); // 4 字 < minlength 20
    await page.click('.form-submit');
    await page.waitForTimeout(600);
    // textarea minlength=20 原生拦截：不显示成功、不写入 storage、列表不新增
    const success = await page.$('.form-success.show');
    assert.strictEqual(success, null, '不足 20 字不应显示成功');
    const titles = await page.evaluate(() => JSON.parse(sessionStorage.getItem('redguide_messages') || '[]').map(m => m.title));
    assert.ok(!titles.includes('太短'), '不足 20 字不应写入 redguide_messages');
  } finally {
    await page.context().close();
  }
});

test('深色切换：热力图保留用户缩放（MutationObserver 不重置视图）', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.setItem('entrance_done_v2', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // ECharts 从 CDN 加载：能加载则验证 zoom 保留（回归守护点）；CDN 不可达时应用按设计走 SVG 降级，
    // 断言降级路径存在后跳过——不把外网可达性当作硬失败阈值（避免离线/弱网 CI flake）
    const hasEcharts = await page.evaluate(() => typeof window.echarts !== 'undefined');
    if (!hasEcharts) {
      const svgFallback = await page.waitForSelector('#home-heatmap .mini-map-svg', { timeout: 18000 }).catch(() => null);
      assert.ok(svgFallback, 'ECharts CDN 不可达时热力图应降级为内联 SVG（.mini-map-svg）');
      return;
    }
    await page.waitForFunction('window.__homeHeatmapChart', null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    // 放大
    await page.click('[data-zoom="in"]');
    await page.waitForTimeout(300);
    const zoomBefore = await page.evaluate(() => window.__homeHeatmapChart.getOption().series[0].zoom);
    assert.ok(zoomBefore > 1.7, '点 + 后 zoom 应大于 1.7，实际 ' + zoomBefore);
    // 切深色 → 重渲染但 zoom 保留（回归修复点）
    await page.click('[data-action="toggle-dark"]');
    await page.waitForTimeout(400);
    const zoomAfter = await page.evaluate(() => window.__homeHeatmapChart.getOption().series[0].zoom);
    assert.strictEqual(zoomAfter, zoomBefore, '深色切换后 zoom 应保持，实际 ' + zoomAfter);
  } finally {
    await page.context().close();
  }
});

test('详情页：分享按钮把详情链接复制到剪贴板', async () => {
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  try {
    await page.goto(baseUrl + '/pages/detail.html?id=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-action="copy-share-link"]', { timeout: 10000 });
    await page.click('[data-action="copy-share-link"]');
    await page.waitForTimeout(400);
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    assert.ok(clip.includes('detail.html?id=1'), '剪贴板应含详情页链接，实际: ' + clip);
  } finally {
    await ctx.close();
  }
});

test('详情页：打印按钮触发 window.print', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/pages/detail.html?id=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-action="print-page"]', { timeout: 10000 });
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await page.click('[data-action="print-page"]');
    await page.waitForTimeout(300);
    const printed = await page.evaluate(() => window.__printed);
    assert.ok(printed >= 1, '点击打印应调用 window.print');
  } finally {
    await page.context().close();
  }
});

test('导览页：搜索关键词过滤场馆列表', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/pages/guide.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.venue-card', { timeout: 10000 });
    const before = await page.$$eval('.venue-card', els => els.length);
    assert.ok(before > 0, '初始应有场馆卡');
    await page.fill('#search-input', '延安');
    await page.click('#guide-search-btn');
    await page.waitForTimeout(900);
    const cards = await page.$$eval('.venue-card', els => els.map(e => e.textContent));
    assert.ok(cards.length > 0 && cards.every(c => c.includes('延安')), '搜索延安后应只剩含延安的场馆，实际 ' + cards.length + ' 张');
  } finally {
    await page.context().close();
  }
});

test('深色模式：切换 html.dark 并写入 localStorage', async () => {
  const page = await newPage();
  try {
    await page.goto(baseUrl + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.setItem('entrance_done_v2', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.click('[data-action="toggle-dark"]');
    await page.waitForTimeout(300);
    const dark = await page.evaluate(() => ({
      html: document.documentElement.classList.contains('dark'),
      stored: localStorage.getItem('redguide_dark')
    }));
    assert.strictEqual(dark.html, true, '切换后 html 应带 dark 类');
    assert.strictEqual(dark.stored, '1', '应写入 redguide_dark=1');
  } finally {
    await page.context().close();
  }
});
