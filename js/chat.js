/* ============================================================
   赓续血脉・数绘红旅 — AI 智能导览助手 (Chat Widget)
   职责：悬浮聊天组件 + 规则引擎问答
   约束：依赖 utils / data / venue-store(getVenues)；
         被 app.js（初始化）与 action-delegate.js（openChat）引用
   ============================================================ */

import { escapeHtml, escapeAttr, sanitizeUrl, getBasePath, resolveAssetPath, safeStorage } from './utils.js?v=2026081007';
import * as RedData from './data.js?v=2026081007';
import { getVenues } from './venue-store.js?v=2026081007';
import { icon } from './icons.js?v=2026081007';
import { knowledge } from './chat-knowledge.js?v=2026081007';

const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

function initChatWidget() {
  if ($('.chat-widget')) return;

  const html = `
      <div class="chat-widget">
        <button class="chat-fab" aria-label="AI导览助手" title="AI智能导览助手">
          <img class="chat-fab-icon" src="${getBasePath()}ai图标.webp" alt="AI导览助手">
          <span class="chat-fab-badge">AI</span>
        </button>
        <div class="chat-panel">
          <div class="chat-header">
            <div class="chat-header-left">
              <img class="chat-avatar" src="${getBasePath()}ai图标.webp" alt="">
              <div>
                <strong>红旅AI助手</strong>
                <small>智能导览 · 知识库 Agent</small>
              </div>
            </div>
            <button class="chat-close" aria-label="关闭对话">✕</button>
          </div>
          <div class="chat-messages" id="chat-messages">
            <div class="chat-msg bot">
              <div class="chat-bubble">
                你好！我是<b>红旅AI助手</b><br><br>
                 <b>查场馆</b>：「延安有哪些场馆」「介绍井冈山」<br>
                 <b>学历史</b>：「长征」「遵义会议」「九一八」<br>
                 <b>悟精神</b>：「红船精神」「红旗渠精神」<br>
                 <b>看数据</b>：「有多少场馆」「哪些省份最多」<br>
                 <b>找路线</b>：「推荐红色旅游路线」<br>
                 <b>对比</b>：「比较井冈山和延安」<br>
                 <b>历史查询</b>：「1935年发生了什么」<br><br>
                <i>试试输入你想了解的内容吧！</i>
              </div>
            </div>
          </div>
          <div class="chat-input-area">
            <div class="chat-quick-btns" id="chat-quick-btns">
              <button data-q="推荐红色旅游路线">${icon('route')} 推荐路线</button>
              <button data-q="有多少场馆">${icon('chart')} 数据统计</button>
              <button data-q="红船精神是什么">${icon('flag')} 红色精神</button>
              <button data-q="长征">${icon('book')} 历史事件</button>
              <button data-q="延安有哪些场馆">${icon('pin')} 查场馆</button>
              <button data-q="有哪些省份">${icon('map')} 省份分布</button>
            </div>
            <div class="chat-input-row">
              <input type="text" id="chat-input" placeholder="输入问题…" aria-label="输入问题" maxlength="200">
              <button id="chat-send" aria-label="发送">➤</button>
            </div>
          </div>
        </div>
      </div>
    `;
  document.body.insertAdjacentHTML('beforeend', html);

  const fab = $('.chat-fab');
  const panel = $('.chat-panel');
  const close = $('.chat-close');
  const input = $('#chat-input');
  const sendBtn = $('#chat-send');
  const messages = $('#chat-messages');
  const quickBtns = $('#chat-quick-btns');

  fab.addEventListener('click', () => {
    const opening = !panel.classList.contains('open');
    panel.classList.toggle('open');
    fab.classList.toggle('is-hidden', opening);
    if (opening) { if (quickBtns) quickBtns.classList.remove('is-hidden'); input.focus(); restoreChatHistory(); }
  });
  close.addEventListener('click', () => {
    panel.classList.remove('open');
    fab.classList.remove('is-hidden');
    saveChatHistory();
  });

  function saveChatHistory() {
    const bubbles = $$('.chat-bubble', messages);
    // 统一存纯文本(textContent)：恢复时按纯文本渲染，
    // 避免"存储 innerHTML、恢复走 textContent"导致富文本标签字面量上屏，同时防篡改注入
    const history = bubbles.map(b => {
      const isUser = b.parentElement.classList.contains('user');
      return { text: b.textContent, cls: isUser ? 'user' : 'bot' };
    });
    safeStorage.set('redguide_chat', history.slice(-20), sessionStorage);
  }
  function restoreChatHistory() {
    const saved = safeStorage.get('redguide_chat', [], sessionStorage);
    if (!Array.isArray(saved) || saved.length === 0) return;
    const valid = saved.filter(m => m && (m.cls === 'user' || m.cls === 'bot') && typeof m.text === 'string');
    if (valid.length === 0) return;
    const existing = $$('.chat-msg', messages);
    if (existing.length <= 1) {
      messages.innerHTML = '';
      valid.forEach(m => appendMsg(m.cls, m.text, true));
    }
  }

  function sendMessage(text) {
    if (!text.trim()) return;
    appendMsg('user', text);
    input.value = '';
    quickBtns.classList.add('is-hidden');

    const thinkingId = appendMsg('bot', '<span class="ai-thinking"><span class="ai-thinking-icon">✦</span><span class="ai-thinking-text">正在检索知识库</span><span class="ai-thinking-dots"><span>.</span><span>.</span><span>.</span></span></span>');
    setTimeout(() => {
      const reply = generateReply(text);
      const thinkingEl = document.getElementById(thinkingId);
      if (thinkingEl) thinkingEl.remove();
      appendMsg('bot', reply);
      saveChatHistory();
    }, 700 + Math.random() * 600);
  }

  function appendMsg(role, text, plain) {
    const id = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    div.id = id;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    if (role === 'user' || plain) {
      // plain：来自存储恢复的内容一律按纯文本渲染，防止篡改 sessionStorage 注入 HTML
      bubble.textContent = text;
    } else {
      bubble.innerHTML = text;
      bubble.querySelectorAll('img').forEach(img => {
        img.onerror = function () { img.classList.add('is-hidden'); };
      });
    }
    div.appendChild(bubble);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return id;
  }

  sendBtn.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage(input.value);
  });

  quickBtns.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.q));
  });
}

/* ---- AI 回答生成引擎 ---- */
function generateReply(query) {
  const q = query.trim();
  if (!q) return '请告诉我你想了解什么 ';

  const venues = getVenues();
  if (venues.length === 0) return '场馆数据正在加载中，请稍后再试…';

  // ===== 第一层：历史事件与精神知识库 =====

  // ===== 第一层匹配：历史知识库 =====
  for (let ki = 0; ki < knowledge.length; ki++) {
    if (knowledge[ki].re.test(q)) return knowledge[ki].answer;
  }

  // ===== 第二层：场馆/省份/类别搜索模式 =====
  const patterns = [
    // 推荐路线
    { re: /(推荐|规划|设计|定制).*(路线|行程|旅游|游览|攻略)|(路线|行程|旅游|攻略).*(推荐|规划|怎么|如何)/, handler: () => recommendRoute(q) },
    // 省份/城市查询（支持"延安有什么场馆""陕西有哪些红色场馆"等变体）
    { re: /(.{2,4})(?:省|市|自治区|地区).*?(?:有哪些|几个|多少|什么|搜集|收录|覆盖).*?(?:场馆|红色|景点)/, handler: (m) => searchByRegion(m[1]) },
    { re: /(.{2,4})(?:省|市).*?(?:场馆|红色)/, handler: (m) => searchByRegion(m[1]) },
    { re: /(.{2,4}).*?(?:有什么|有哪些|几个|多少).*?(?:场馆|红色)/, handler: (m) => searchByRegion(m[1]) },
    // 统计类
    { re: /(?:有多少|几个|多少).*(?:场馆|红色|收录)|(?:场馆|红色).*(?:有多少|几个|多少|统计)/, handler: () => getStats() },
    { re: /(?:哪些|什么).*(?:省份|省|地区).*(?:最多|最少|没有)/, handler: () => getProvinceRanking() },
    { re: /(?:有哪些|哪些|什么).*(?:省份|省|地区)|省份分布/, handler: () => getProvinceList() },
    { re: /(?:有哪些|哪些|什么).*(?:类别|类型|分类|主题)/, handler: () => getCategories() },
    // 场馆介绍
    { re: /(?:介绍|了解|说说|讲讲|查一下|查询|查看)(.{2,})/, handler: (m) => searchVenue(m[1]) },
    { re: /(.{2,})(?:在哪里|怎么去|在哪|地址|位置|交通|怎么走)/, handler: (m) => searchVenueLocation(m[1]) },
    { re: /(.{3,})(?:纪念馆|博物馆|会址|故居|旧址|陵园|纪念园|陈列馆|展览馆|纪念塔)/, handler: (m) => searchVenue(m[0]) },
    // 类别查询
    { re: /(?:有哪些|什么|哪些).*(.{1,4})(?:类型|类别|主题|式).*(?:场馆|纪念馆)/, handler: (m) => searchByCategory(m[1]) },
    // 对比
    { re: /(?:比较|对比|区别|哪个更好).*(.{2,})(?:和|与|vs)(.{2,})/, handler: (m) => compareVenues(m[1], m[2]) },
    // 最近/周边
    { re: /(.{2,})(?:附近|周边|周围|旁边|临近).*(?:有什么|有哪些|场馆)/, handler: (m) => searchNearby(m[1]) },
    // 问候/帮助
    { re: /你好|嗨|hello|hi|在吗|帮助|help|能做什么|功能|怎么用|使用说明/, handler: () => getHelp() },
    // 感谢
    { re: /谢谢|感谢|多谢|thank/, handler: () => '不客气！ 随时为你解答红色文旅相关问题。有什么想了解的可以继续问我～' },
    // 历史时间线
    { re: /(\d{4})年.*(?:发生|事件|历史|大事)/, handler: (m) => getYearEvents(m[1]) },
    // 精神/文化专题
    { re: /(?:什么|哪些|介绍).*精神/, handler: () => getSpiritList() },
  ];

  for (const { re, handler } of patterns) {
    const match = q.match(re);
    if (match) {
      return handler(match);
    }
  }

  // ===== 第三层：模糊匹配与智能降级 =====
  // 先尝试场馆名模糊搜索
  const fuzzyVenue = findVenue(q);
  if (fuzzyVenue) {
    return formatVenueDetail(fuzzyVenue) + '<br><i> 输入「推荐路线」可获取主题游览建议</i>';
  }

  // 尝试省份/城市模糊匹配
  let regionMatch = venues.filter(v => v.province && v.province.includes(q.slice(0, 2)));
  if (regionMatch.length === 0) regionMatch = venues.filter(v => v.city && v.city.includes(q.slice(0, 2)));
  if (regionMatch.length === 0) regionMatch = venues.filter(v => v.district && v.district.includes(q.slice(0, 2)));
  if (regionMatch.length > 0) {
    return searchByRegion(q.slice(0, 2));
  }

  // 尝试在简介中全文搜索
  const summaryMatch = venues.filter(v => v.summary && v.summary.includes(q.slice(0, 3)));
  if (summaryMatch.length > 0) {
    return ` 在简介中搜索「${escapeHtml(q.slice(0, 6))}」找到 <b>${summaryMatch.length}</b> 个相关场馆：<br>` +
      summaryMatch.slice(0, 5).map(v => `• <b>${escapeHtml(v.name)}</b> — ${escapeHtml(v.province)} ${escapeHtml(v.city || '')}<br><small>${escapeHtml((v.summary || '').slice(0, 60))}…</small>`).join('<br><br>') +
      `<br><i> 点击场馆名可在导览页查看详情</i>`;
  }

  // 真正的智能降级：给出有帮助的建议
  return ` 关于「<b>${escapeHtml(q.slice(0, 30))}</b>」，我还在学习中。试试这些：<br><br>
       <b>查场馆</b>：「延安有什么场馆」「介绍井冈山革命博物馆」<br>
       <b>学历史</b>：「长征」「遵义会议」「九一八事变」<br>
       <b>悟精神</b>：「红船精神」「长征精神」「红旗渠精神」<br>
       <b>看数据</b>：「有多少场馆」「哪些省份最多」「场馆类别」<br>
       <b>找路线</b>：「推荐红色旅游路线」「长征路线怎么走」<br><br>
      <i>或者到<a href="${escapeAttr(getBasePath())}pages/guide.html">全国导览</a>页面浏览全部 ${venues.length} 个场馆</i>`;
}

/* ===== 智能搜索函数 ===== */

function searchByRegion(region) {
  const venues = getVenues();
  // 先在省份中搜
  let found = venues.filter(v => v.province && v.province.includes(region));
  // 省份中没找到，尝试在城市名中搜索
  if (found.length === 0) {
    found = venues.filter(v => v.city && v.city.includes(region));
  }
  // 还没找到，尝试在区县中搜索
  if (found.length === 0) {
    found = venues.filter(v => v.district && v.district.includes(region));
  }
  if (found.length === 0) {
    return `暂未收录「${escapeHtml(region)}」的场馆信息。目前已覆盖 <b>${getProvinceCount()}</b> 个省区市。试试输入省份全称如「陕西省」「湖南省」？`;
  }
  const esc = escapeHtml;
  const cats = [...new Set(found.map(v => v.category).filter(Boolean))];
  return ` <b>${esc(region)}</b> 共有 <b>${found.length}</b> 个红色场馆<br><br>` +
    found.map(v => `• <b>${esc(v.name)}</b> — ${esc(v.category || '红色场馆')}｜${esc(v.city || '')}${esc(v.district || '')}<br><small>${esc((v.summary || '').slice(0, 50))}…</small>`).join('<br>') +
    `<br> 类别分布：${cats.map(esc).join(' · ')}` +
    `<br><i> 输入场馆名称可查看详细信息</i>`;
}

function searchVenue(name) {
  const v = findVenue(name.replace(/[的了吗呢]$/, '').trim());
  if (!v) return `没找到「<b>${escapeHtml(name.slice(0, 15))}</b>」的详细信息。<br><br> 试试：<br>• 输入完整场馆名称<br>• 输入省份名称查看当地全部场馆<br>• 到<a href="${escapeAttr(getBasePath())}pages/guide.html">全国导览</a>搜索`;
  return formatVenueDetail(v) + '<br><i> 问「' + escapeHtml(v.name.slice(0, 4)) + '附近有什么」查看周边场馆</i>';
}

function searchVenueLocation(name) {
  // 整词剥离"怎么去/在哪里/地址/位置/交通"等后缀，而非只删单个字符
  const v = findVenue(name.replace(/(怎么去|怎么走|在哪里|在哪儿|在哪|地址|位置|交通|怎么走)$/, '').trim());
  if (!v) return searchVenue(name);
  const coord = v.coordinates;
  const esc = escapeHtml;
  // 仅允许 http(s) 链接，杜绝 javascript: 注入
  const safeUrl = (v.officialUrl && /^https?:\/\//i.test(v.officialUrl)) ? v.officialUrl : '';
  return ` <b>${esc(v.name)}</b><br>
       <b>详细地址</b>：${esc(v.province || '')}${esc(v.city || '')}${esc(v.district || '')}<br>
      ${coord ? ` <b>经纬度</b>：${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}<br>` : ''}
      ${safeUrl ? ` <a href="${escapeAttr(safeUrl)}" target="_blank" rel="noopener">官方网站（含交通指引）</a><br>` : ''}
      <br><i> 建议出行前通过官网或电话确认开放时间和预约方式</i>`;
}

/* ---- 场馆详情格式化（AI 聊天用） ---- */
function formatVenueDetail(v) {
  if (!v) return '暂未找到该场馆的详细信息。';
  const detail = (typeof RedData.getVenueDetail === 'function')
    ? RedData.getVenueDetail(v.name)
    : null;
  const bp = getBasePath();
  const coord = v.coordinates;
  const rawImgSrc = (typeof resolveAssetPath === 'function')
    ? resolveAssetPath(v.image, bp)
    : (v.image || '');
  const imgSrc = sanitizeUrl(rawImgSrc);
  const truncate = (s, n) => (s && s.length > n) ? s.slice(0, n) + '…' : s;
  const esc = escapeHtml;
  const attr = escapeAttr;

  let html = '<div class="ai-card">';
  html += '<div class="ai-card-title"> ' + esc(v.name) + '</div>';
  html += '<div class="ai-card-meta"> ' + esc(v.province || '') +
    (v.city ? ' · ' + esc(v.city) : '') +
    (v.district ? ' · ' + esc(v.district) : '') +
    (v.category ? ' · ' + esc(v.category) : '') + '</div>';
  if (coord && coord.lat != null && coord.lng != null) {
    html += '<div class="ai-card-meta"> 坐标：' + coord.lat.toFixed(4) + ', ' + coord.lng.toFixed(4) + '</div>';
  }
  if (imgSrc) {
    html += '<img class="ai-card-img" src="' + attr(imgSrc) + '" alt="' + esc(v.name) + '" loading="lazy">';
  }
  if (detail && detail.history) {
    html += '<br><b> 历史背景</b><br>' + esc(truncate(detail.history, 110));
  } else if (v.summary) {
    html += '<br><b> 简介</b><br>' + esc(truncate(v.summary, 110));
  }
  if (detail && detail.education) {
    html += '<br><b> 教育意义</b><br>' + esc(truncate(detail.education, 80));
  }
  html += '<br><br><a class="ai-card-link" href="' + attr(bp) + 'pages/detail.html?id=' + encodeURIComponent(v.id) + '">查看完整详情 →</a>';
  html += '</div>';
  return html;
}

function searchByCategory(cat) {
  const found = getVenues().filter(v => v.category && v.category.includes(cat));
  if (found.length === 0) {
    const allCats = getCategoriesRaw();
    return `没找到「${escapeHtml(cat)}」类别。当前场馆类别有：${allCats.join('、')}<br><br><i> 输入类别名查看该类别下的场馆</i>`;
  }
  return ` <b>${escapeHtml(cat)}</b> 类场馆共 <b>${found.length}</b> 个：<br><br>` +
    found.map(v => `• <b>${escapeHtml(v.name)}</b> — ${escapeHtml(v.province)} ${escapeHtml(v.city || '')}`).join('<br>') +
    `<br><i> 输入场馆名了解详情</i>`;
}

function compareVenues(a, b) {
  const va = findVenue(a.trim());
  const vb = findVenue(b.trim());
  if (!va || !vb) return `需要两个有效场馆名才能对比哦。试试如「比较井冈山和延安」`;
  const esc = escapeHtml;
  return ` <b>场馆对比</b><br><br>
      <table class="ai-compare-table">
      <tr><td></td><td><b>${esc(va.name)}</b></td><td><b>${esc(vb.name)}</b></td></tr>
      <tr><td> 地区</td><td>${esc(va.province)} ${esc(va.city || '')}</td><td>${esc(vb.province)} ${esc(vb.city || '')}</td></tr>
      <tr><td> 类别</td><td>${esc(va.category || '—')}</td><td>${esc(vb.category || '—')}</td></tr>
      <tr><td> 简介</td><td>${esc((va.summary || '').slice(0, 40))}…</td><td>${esc((vb.summary || '').slice(0, 40))}…</td></tr>
      </table><br><i> 输入场馆名查看完整详情</i>`;
}

function searchNearby(name) {
  const v = findVenue(name.replace(/(附近|周边|周围|旁边|临近)$/, '').trim());
  if (!v) return searchVenue(name);
  const sameProv = getVenues().filter(x => x.province === v.province && x.name !== v.name);
  const sameCity = sameProv.filter(x => x.city === v.city);
  const nearby = sameCity.length > 0 ? sameCity : sameProv;
  const esc = escapeHtml;
  return ` <b>${esc(v.name)}</b> 位于 <b>${esc(v.province)}${esc(v.city || '')}</b><br><br>` +
    (nearby.length > 0
      ? `同地区的其他场馆（${nearby.length}个）：<br>` + nearby.slice(0, 6).map(x => `• <b>${esc(x.name)}</b> — ${esc(x.category || '')}`).join('<br>')
      : `该地区目前仅收录了这一个场馆`) +
    `<br><i> 输入「${esc(v.province.replace(/省|市|自治区/g, ''))}有哪些场馆」查看全部</i>`;
}

function getStats() {
  const v = getVenues();
  const provinces = getProvinceCount();
  const cats = getCategoriesRaw();
  let latest = '持续更新';
  const dates = v.map(x => x.officialVerificationDate).filter(Boolean).sort();
  if (dates.length) {
    const mm = String(dates[dates.length - 1]).match(/^(\d{4})-(\d{2})/);
    latest = mm ? mm[1] + '年' + String(parseInt(mm[2], 10)) + '月' : String(dates[dates.length - 1]);
  }
  return ` <b>红色场馆数据统计</b><br><br>
       场馆总数：<b>${v.length}</b> 个<br>
       覆盖省区市：<b>${provinces}</b> 个<br>
       场馆类别：<b>${cats.length}</b> 种（${cats.join('、')}）<br>
       数据更新：${latest}<br><br>
      <i> 输入省份名查看该地区的场馆</i>`;
}

function getProvinceRanking() {
  const esc = escapeHtml;
  const count = {};
  getVenues().forEach(v => {
    const p = v.province.replace(/省|市|自治区|壮族|回族|维吾尔/g, '');
    count[p] = (count[p] || 0) + 1;
  });
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return ` <b>各省区市场馆数量排名</b><br><br>` +
    sorted.slice(0, 10).map(([p, c], i) => `${['①', '②', '③'][i] || (i + 1)} <b>${esc(p)}</b>：${c} 个`).join('<br>') +
    `<br><i> 输入省份名查看该地区的具体场馆</i>`;
}

function getProvinceList() {
  const esc = escapeHtml;
  const count = {};
  getVenues().forEach(v => {
    const p = v.province.replace(/省|市|自治区|壮族|回族|维吾尔/g, '');
    count[p] = (count[p] || 0) + 1;
  });
  const items = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return ` <b>当前收录场馆覆盖的省区市</b><br><br>` +
    items.map(([p, c]) => `• <b>${esc(p)}</b>：${c} 个`).join('<br>') +
    `<br><i> 输入「某省有哪些场馆」查看该地区的具体场馆</i>`;
}

function getCategories() {
  return ` 当前场馆覆盖的类别：<br><br>` +
    getCategoriesRaw().map(c => `• <b>${c}</b>`).join('<br>') +
    `<br><i> 输入类别名查看该类别下的场馆，如「革命纪念馆有哪些」</i>`;
}

function getCategoriesRaw() {
  return [...new Set(getVenues().map(v => v.category).filter(Boolean))].sort();
}

function getProvinceCount() {
  return new Set(getVenues().map(v => v.province)).size;
}

function getHelp() {
  return ` <b>红旅AI助手 使用指南</b><br><br>
       <b>查场馆</b><br>「延安有哪些场馆」「介绍井冈山革命博物馆」「韶山在哪」<br><br>
       <b>学历史</b><br>「长征」「遵义会议」「九一八事变」「飞夺泸定桥」<br><br>
       <b>悟精神</b><br>「红船精神」「长征精神」「延安精神」「红旗渠精神」<br><br>
       <b>看数据</b><br>「有多少场馆」「哪些省份最多」「场馆类别有哪些」<br><br>
       <b>找路线</b><br>「推荐红色旅游路线」「长征路线怎么走」<br><br>
       <b>对比</b><br>「比较井冈山和延安」「对比西柏坡和遵义」<br><br>
      <i>现在就开始提问吧！</i>`;
}

function getYearEvents(year) {
  const timeline = {
    '1921': ' 1921年7月23日，<b>中共一大</b>在上海开幕，后转移至嘉兴南湖闭幕，中国共产党正式成立。',
    '1927': ' 1927年8月1日<b>南昌起义</b>、9月<b>秋收起义</b>、12月<b>广州起义</b>，是我党独立领导武装斗争的开端。',
    '1929': ' 1929年12月，<b>古田会议</b>在福建上杭召开，确立"思想建党、政治建军"原则。',
    '1931': ' 1931年9月18日<b>九一八事变</b>，日本侵占东北；11月<b>中华苏维埃共和国</b>在瑞金成立。',
    '1934': ' 1934年10月，中央红军从江西出发，开始<b>长征</b>。',
    '1935': ' 1935年1月<b>遵义会议</b>、5月<b>飞夺泸定桥</b>、10月中央红军到达陕北。',
    '1936': ' 1936年10月，红军三大主力在<b>甘肃会宁</b>胜利会师，长征结束。',
    '1937': ' 1937年7月7日<b>卢沟桥事变</b>，全面抗战爆发。',
    '1945': ' 1945年8月15日，<b>日本宣布无条件投降</b>，抗日战争胜利。',
    '1949': ' 1949年3月<b>七届二中全会</b>在西柏坡召开；10月1日<b>开国大典</b>。',
    '1964': ' 1964年10月16日，中国第一颗<b>原子弹</b>在青海原子城爆炸成功。',
  };
  if (timeline[year]) return ` <b>${year}年</b>${timeline[year]}`;
  return ` <b>${year}年</b>的具体红色历史事件我还在整理中。<br><br>目前已收录：${Object.keys(timeline).join('、')} 年的重要事件。<br><i> 输入具体事件名如「长征」「开国大典」了解更多</i>`;
}

function getSpiritList() {
  return ` <b>红色精神谱系</b><br><br>
      • <b>红船精神</b> — 开天辟地、敢为人先<br>
      • <b>井冈山精神</b> — 坚定信念、艰苦奋斗<br>
      • <b>长征精神</b> — 不怕牺牲、不畏艰难<br>
      • <b>延安精神</b> — 实事求是、全心全意为人民服务<br>
      • <b>西柏坡精神</b> — 两个务必、赶考精神<br>
      • <b>红岩精神</b> — 崇高理想、坚定信念<br>
      • <b>大别山精神</b> — 坚守信念、团结奋斗<br>
      • <b>红旗渠精神</b> — 自力更生、艰苦创业<br>
      • <b>两弹一星精神</b> — 无私奉献、大力协同<br>
      • <b>苏区精神</b> — 求真务实、一心为民<br><br>
      <i> 输入精神名称了解详情，如「红旗渠精神」</i>`;
}

function findVenue(name) {
  const venues = getVenues();
  if (typeof RedData.findVenueByName === 'function') {
    const result = RedData.findVenueByName(venues, name);
    if (result) return result;
  }
  name = name.replace(/[的了吗呢在哪怎么走]$/, '').trim();
  let found = venues.find(v => (v.name || '') === name || (v.standardName || '') === name);
  if (found) return found;
  found = venues.find(v => (v.name || '').includes(name) || (v.standardName || '').includes(name));
  if (found) return found;
  return venues.find(v => (v.name || '').includes(name.slice(0, 4)));
}

function recommendRoute(q) {
  const venues = getVenues();
  const isChangzheng = q.indexOf('长征') >= 0;
  const routes = [
    { name: ' 建党足迹之旅（2天）', desc: '上海一大会址 → 嘉兴南湖红船，追寻党的诞生足迹。', venues: ['中共一大会址纪念馆', '嘉兴南湖红船'], theme: '建党' },
    { name: ' 长征精神之旅（5天）', desc: '井冈山 → 遵义 → 泸定桥 → 会宁，重走长征关键节点。', venues: ['井冈山革命博物馆', '遵义会议会址', '泸定桥', '会宁红军长征胜利纪念馆'], theme: '长征' },
    { name: ' 延安精神之旅（3天）', desc: '延安 → 西柏坡 → 北京，从延安到开国大典。', venues: ['延安革命纪念馆', '西柏坡纪念馆', '中国共产党历史展览馆'], theme: '延安' },
    { name: ' 抗战记忆之旅（4天）', desc: '沈阳 → 太行 → 重庆，重温全民族抗战史诗。', venues: ['九一八历史博物馆', '八路军太行纪念馆', '红岩革命纪念馆'], theme: '抗战' },
    { name: ' 革命摇篮之旅（3天）', desc: '南昌 → 井冈山 → 古田，探索人民军队创建之路。', venues: ['南昌八一起义纪念馆', '井冈山革命博物馆', '古田会议会址'], theme: '建军' },
    { name: ' 伟人故里之旅（2天）', desc: '韶山 → 天津，缅怀伟人风范。', venues: ['韶山毛泽东同志故居', '周恩来邓颖超纪念馆'], theme: '伟人' },
    { name: ' 奋斗精神之旅（3天）', desc: '红旗渠 → 三五九旅 → 原子城，感受奋斗力量。', venues: ['红旗渠纪念馆', '三五九旅屯垦纪念馆', '青海原子城纪念馆'], theme: '奋斗' },
  ];
  const displayRoutes = isChangzheng ? routes.filter(function (r) { return r.theme === "长征"; }).concat(routes.filter(function (r) { return r.theme !== "长征"; })) : routes;
  let html = '<div class="ai-card-title"> 红色旅游主题路线推荐</div><br>';
  displayRoutes.forEach(function (r) {
    html += '<div class="ai-card">';
    html += '<b>' + r.name + '</b><br> ' + r.desc + '<br>';
    html += ' ' + r.venues.map(function (vn) {
      const v = venues.find(function (x) { return (x.name || '').indexOf(vn) >= 0; });
      return v ? '<a class="ai-card-link" href="' + escapeAttr(getBasePath()) + 'pages/detail.html?id=' + encodeURIComponent(v.id) + '">' + escapeHtml(vn) + '</a>' : escapeHtml(vn);
    }).join(' → ');
    html += '</div>';
  });
  html += '<br><i> 点击场馆名查看详情 | 输入「长征路线」查看长征专题</i>';
  return html;
}

/* ---- 程序化打开入口：供 action-delegate 复用 FAB 点击逻辑 ---- */
function openChat() {
  const fab = document.querySelector('.chat-fab');
  if (fab) fab.click();
}

export { initChatWidget, openChat };
