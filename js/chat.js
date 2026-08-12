/* ============================================================
   赓续血脉・数绘红旅 — AI 智能导览助手 (Chat Widget)
   职责：悬浮聊天组件 + 规则引擎问答
   约束：依赖 utils / data / venue-store(getVenues)；
         被 app.js（初始化）与 action-delegate.js（openChat）引用
   ============================================================ */

import { getBasePath, safeStorage } from './utils.js?v=2026081016';
import { $, $$ } from './ui.js?v=2026081016';
import { icon } from './icons.js?v=2026081016';
import { generateReply } from './chat-engine.js?v=2026081016';

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

/* ---- 程序化打开入口：供 action-delegate 复用 FAB 点击逻辑 ---- */
function openChat() {
  const fab = document.querySelector('.chat-fab');
  if (fab) fab.click();
}

export { initChatWidget, openChat };
