/* ============================================================
   赓续血脉・数绘红旅 — AI 智能导览助手 (Chat Widget)
   职责：悬浮聊天组件 + 规则引擎问答
   约束：依赖 utils / data / venue-store(getVenues)；
         被 app.js（初始化）与 action-delegate.js（openChat）引用
   ============================================================ */

import { getBasePath, safeStorage } from './utils.js?v=2026081309';
import { $, $$ } from './ui.js?v=2026081309';
import { icon } from './icons.js?v=2026081309';
import { generateReply } from './chat-engine.js?v=2026081309';

/* 相对路径重定向到当前页 base：聊天历史跨页恢复时，首页生成的 'pages/…' 在 /pages/ 子页会解析成
   /pages/pages/… 404；把开头 '../' 剥成根相对再拼当前 base（http/锚点/根绝对 原样保留） */
function rebaseUrl(raw) {
  const u = String(raw || '').trim();
  if (!u || /^(https?:|mailto:|tel:|#|data:|\/)/i.test(u)) return raw;
  return getBasePath() + u.replace(/^(\.\.\/)+/, '');
}

/* 恢复时对机器人消息 HTML 做白名单净化（用惰性的 <template> 解析，脚本不执行），
   既保留富文本（场馆按钮/小卡片），又堵住 sessionStorage 被篡改时的注入 */
function sanitizeBotHtml(html) {
  // TABLE/TBODY/TR/TD：compareVenues 的对比表是结构标签（无事件属性），放行以保恢复后表格完整
  const ALLOWED = new Set(['A', 'B', 'BR', 'DIV', 'SPAN', 'I', 'SMALL', 'IMG', 'STRONG', 'P', 'TABLE', 'TBODY', 'TR', 'TD']);
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html || '');
  const clean = function (el) {
    Array.prototype.forEach.call(el.querySelectorAll('*'), function (node) {
      if (!ALLOWED.has(node.tagName)) {
        while (node.firstChild) el.insertBefore(node.firstChild, node);
        node.remove();
        return;
      }
      Array.prototype.forEach.call(node.attributes, function (attr) {
        const name = attr.name.toLowerCase();
        const val = attr.value.trim().toLowerCase();
        if (name === 'style' || name === 'srcdoc' || name.indexOf('on') === 0) { node.removeAttribute(attr.name); return; }
        if (name === 'href' || name === 'src') {
          // href/src 协议白名单（与 utils.sanitizeUrl 同口径）：http(s)/mailto/tel、站内相对路径、assets/images/uploads/pages/data 前缀；
          // 其余一律剔除——堵住 javascript:/vbscript:/data: 各种子 scheme（含 data:image/svg+xml 这类黑名单漏网）
          const safe = /^(https?:|mailto:|tel:)/i.test(val)
            || (/^[/.]/.test(val) && !/^\/\//.test(val))
            || /^(assets|images|uploads|pages|data)\//i.test(val);
          if (!safe) { node.removeAttribute(attr.name); return; }
          // 白名单通过后，把相对路径 rebase 到当前页 base（防跨页恢复 404）
          node.setAttribute(attr.name, rebaseUrl(attr.value));
        }
      });
      clean(node);
    });
  };
  clean(tpl.content);
  return tpl.innerHTML;
}

function initChatWidget() {
  if ($('.chat-widget')) return;

  const html = `
      <div class="chat-widget">
        <button class="chat-fab" aria-label="AI导览助手" title="AI智能导览助手" aria-expanded="false" aria-controls="chat-panel">
          <img class="chat-fab-icon" src="${getBasePath()}assets/通用/ai图标.webp" alt="AI导览助手">
          <span class="chat-fab-badge">AI</span>
        </button>
        <!-- 非模态浮层：不声明 aria-modal（面板未接 focus-trap，声明 modal 语义却不圈定焦点是契约失配） -->
        <div class="chat-panel" id="chat-panel" role="dialog" aria-label="AI导览助手">
          <div class="chat-header">
            <div class="chat-header-left">
              <img class="chat-avatar" src="${getBasePath()}assets/通用/ai图标.webp" alt="">
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
    fab.setAttribute('aria-expanded', String(opening));
    if (opening) { if (quickBtns) quickBtns.classList.remove('is-hidden'); input.focus(); restoreChatHistory(); }
  });
  function closePanel() {
    panel.classList.remove('open');
    fab.classList.remove('is-hidden');
    fab.setAttribute('aria-expanded', 'false');
    saveChatHistory();
    // 关闭后把焦点还给 FAB，避免键盘/读屏焦点悬在 display:none 的关闭按钮上
    fab.focus();
  }
  close.addEventListener('click', closePanel);
  // Esc 关闭（对话面板内任意焦点位置均可触发）
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closePanel(); } });

  function saveChatHistory() {
    // 跳过"正在检索"的临时 thinking 气泡：它若被持久化，刷新后恢复会变成卡死转圈（无定时器能移除它）
    const bubbles = $$('.chat-bubble', messages).filter(b => !b.querySelector('.ai-thinking'));
    // 机器人消息存 innerHTML（富文本：场馆按钮/小卡片），用户消息只存纯文本；
    // 恢复时对机器人 HTML 做白名单净化，防 sessionStorage 被篡改注入
    const history = bubbles.map(b => {
      const isUser = b.parentElement.classList.contains('user');
      return isUser
        ? { text: b.textContent, cls: 'user' }
        : { text: b.textContent, html: b.innerHTML, cls: 'bot' };
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
      valid.forEach(m => {
        if (m.cls === 'bot') {
          // 机器人消息：有富文本存档则恢复为净化后的 HTML（场馆按钮/小卡片），
          // 无 html 字段的回退文本必须走 textContent 纯文本渲染（plain=!m.html），堵住篡改 sessionStorage 注入
          appendMsg('bot', m.html ? sanitizeBotHtml(m.html) : m.text, !m.html);
        } else {
          appendMsg('user', m.text, true);
        }
      });
    }
  }

  let _replyQueue = [];
  let _replying = false;

  function sendMessage(text) {
    if (!text.trim()) return;
    appendMsg('user', text);
    input.value = '';
    // 串行化回复：多条问题连发时按发送顺序逐条回答。
    // 之前每条回复独立 setTimeout(700+rand*600)，后问的可先答造成乱序
    _replyQueue.push(text);
    pumpReplies();
  }

  function pumpReplies() {
    if (_replying || _replyQueue.length === 0) return;
    _replying = true;
    const q = _replyQueue.shift();
    const thinkingId = appendMsg('bot', '<span class="ai-thinking"><span class="ai-thinking-icon">✦</span><span class="ai-thinking-text">正在检索知识库</span><span class="ai-thinking-dots"><span>.</span><span>.</span><span>.</span></span></span>');
    setTimeout(() => {
      const reply = generateReply(q);
      const thinkingEl = document.getElementById(thinkingId);
      if (thinkingEl) thinkingEl.remove();
      appendMsg('bot', reply);
      saveChatHistory();
      _replying = false;
      pumpReplies();
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

/* ---- 程序化打开入口：供 action-delegate 复用 FAB 点击逻辑 ---- */
function openChat() {
  const fab = document.querySelector('.chat-fab');
  if (fab) fab.click();
}

export { initChatWidget, openChat };
