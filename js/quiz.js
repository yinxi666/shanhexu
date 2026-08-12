/* ============================================================
   赓续血脉・数绘红旅 — 红色知识问答挑战 (Quiz)
   职责：悬浮 FAB + 弹窗问答挑战
   约束：依赖 focus-trap；被 app.js（初始化）与 action-delegate.js（openQuiz）引用
   ============================================================ */

import { trapFocus, releaseFocus } from './focus-trap.js?v=2026081310';
import { $, onOverlayClick } from './ui.js?v=2026081310';
import { icon } from './icons.js?v=2026081310';
import { getBasePath } from './utils.js?v=2026081310';
import { quizData } from './quiz-data.js?v=2026081310';

function initQuiz() {
  if ($('.quiz-fab')) return;


  // 每局随机抽取的题数
  const GAME_SIZE = 10;

  // Fisher-Yates 洗牌（返回新数组，不改动原数组）
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 开始屏 HTML（初始注入与 resetQuiz 重建共用，避免两份拷贝漂移）
  const startScreenHtml = () => `
        <div class="quiz-start">
          <div class="quiz-logo">${icon('star')}</div>
          <h3>红色知识挑战赛</h3>
          <p>测测你对红色场馆和革命历史的了解程度！</p>
          <p class="quiz-meta">每局随机 ${GAME_SIZE} 题 · 即时反馈 · 不限时间</p>
          <button class="btn primary" id="quiz-start-btn">开始挑战 →</button>
        </div>
      `;

  const html = `
      <button class="quiz-fab" aria-label="红色知识问答" title="红色知识挑战赛">
        <span><img class="quiz-fab-icon" src="${getBasePath()}assets/通用/挑战赛.webp" alt="红色知识挑战赛"></span>
      </button>
      <div class="quiz-modal-overlay" id="quiz-overlay">
        <div class="quiz-modal" role="dialog" aria-modal="true" aria-label="红色知识挑战赛">
          <button class="quiz-close" aria-label="关闭">✕</button>
          <div class="quiz-body" id="quiz-body">
            ${startScreenHtml()}
          </div>
          <div class="quiz-result is-hidden" id="quiz-result"></div>
        </div>
      </div>
    `;
  document.body.insertAdjacentHTML('beforeend', html);

  const fab = $('.quiz-fab');
  const overlay = $('#quiz-overlay');
  const closeBtn = $('.quiz-close', overlay);
  const startBtn = $('#quiz-start-btn');
  const body = $('#quiz-body');
  const result = $('#quiz-result');

  function openQuiz() {
    // 已打开则忽略：焦点陷阱改栈式后，重复 openQuiz 会压入两个指向同一弹窗的 trap，导致一次关闭后残留
    if (overlay.classList.contains('open')) return;
    // 断点续答：有未完成回合则直接恢复（不用从开始屏重新开始）
    const saved = loadState();
    if (saved && saved.currentQ < saved.gameQuestions.length) {
      currentQ = saved.currentQ;
      score = saved.score;
      gameQuestions = saved.gameQuestions;
      answers = saved.answers;
      result.classList.add('is-hidden');
      renderQuestion();
    }
    overlay.classList.add('open');
    // 每次打开重新查询：关闭后 resetQuiz 会重建开始按钮，旧引用已脱离 DOM
    const focusTarget = $('#quiz-start-btn')
      || overlay.querySelector('.quiz-opt:not(.is-disabled)')
      || $('#quiz-next-btn')
      || $('#quiz-prev-btn');
    trapFocus(overlay.querySelector('.quiz-modal'), {
      initialFocus: focusTarget || undefined,
      // Esc 关闭也必须 releaseFocus，否则焦点困在隐藏弹窗内
      onClose: closeQuiz
    });
  }
  function closeQuiz() {
    releaseFocus();
    overlay.classList.remove('open');
    resetQuiz();
  }

  fab.addEventListener('click', openQuiz);
  closeBtn.addEventListener('click', closeQuiz);
  onOverlayClick(overlay, closeQuiz);

  let currentQ = 0;
  let score = 0;
  let gameQuestions = []; // 本局随机抽出的题目
  let answers = []; // 每题所选选项索引，null=未答
  // 无自动进题：答完停留当前题，由用户点"下一题/完成"手动前进

  // 断点续答：把当次回合进度存 sessionStorage（跨页面/关闭弹窗保留），下次打开直接恢复
  const SAVE_KEY = 'redguide_quiz';
  function saveState() {
    try {
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({
        qs: gameQuestions.map(q => quizData.indexOf(q)), // 存题号，恢复时引用题库
        currentQ: currentQ,
        score: score,
        answers: answers
      }));
    } catch (e) { /* 存储不可用（隐私模式等）时静默降级为不复位 */ }
  }
  function loadState() {
    try {
      const raw = sessionStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !Array.isArray(s.qs) || !Array.isArray(s.answers)) return null;
      const gq = s.qs.map(i => quizData[i]).filter(Boolean);
      if (gq.length === 0 || gq.length !== s.answers.length) return null; // 数据损坏则丢弃
      return { currentQ: s.currentQ, score: s.score, gameQuestions: gq, answers: s.answers };
    } catch (e) { return null; }
  }
  function clearState() {
    try { sessionStorage.removeItem(SAVE_KEY); } catch (e) { }
  }

  startBtn.addEventListener('click', startQuiz);

  function startQuiz() {
    currentQ = 0;
    score = 0;
    gameQuestions = shuffle(quizData).slice(0, Math.min(GAME_SIZE, quizData.length));
    answers = new Array(gameQuestions.length).fill(null);
    result.classList.add('is-hidden');
    clearState(); // 新回合清掉旧的断点
    saveState();  // 立刻保存初始态，中途关闭可恢复
    renderQuestion();
  }

  function renderQuestion() {
    if (currentQ >= gameQuestions.length) { showResult(); return; }
    const item = gameQuestions[currentQ];
    const sel = answers[currentQ];
    const done = sel != null;
    const isLast = currentQ >= gameQuestions.length - 1;

    body.innerHTML = `
        <div class="quiz-question">
          <div class="quiz-progress">第 ${currentQ + 1} / ${gameQuestions.length} 题 · 得分 ${score}</div>
          <h3>${item.q}</h3>
          <div class="quiz-options">
            ${item.opts.map((opt, i) => {
              let cls = 'quiz-opt';
              if (done) {
                cls += ' is-disabled';
                if (i === item.a) cls += ' correct';
                if (i === sel && i !== item.a) cls += ' wrong';
              }
              return `<button class="${cls}" data-idx="${i}"${done ? ' disabled' : ''}>
                <span class="opt-letter">${'ABCD'[i]}</span> ${opt}
              </button>`;
            }).join('')}
          </div>
          <div class="quiz-feedback" id="quiz-feedback"></div>
          <div class="quiz-nav">
            <button class="quiz-nav-btn" id="quiz-prev-btn" ${currentQ === 0 ? 'disabled' : ''}>${icon('arrow-left')} 上一题</button>
            <button class="quiz-nav-btn" id="quiz-next-btn">${isLast ? '完成' : '下一题'}${isLast ? '' : icon('arrow-right')}</button>
          </div>
        </div>
      `;

    // 返回已答题目时恢复反馈与选中态（不重复计分）
    if (done) {
      const fb = $('#quiz-feedback');
      const correct = sel === item.a;
      fb.innerHTML = correct
        ? icon('check') + ' <b>回答正确！</b> ' + item.tip
        : icon('cross') + ' <b>回答错误</b> ' + item.tip;
      fb.classList.add(correct ? 'correct' : 'wrong');
      fb.classList.add('show');
    }

    body.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.addEventListener('click', function () {
        if (answers[currentQ] != null) return;
        const idx = parseInt(this.dataset.idx);
        const correct = idx === item.a;
        answers[currentQ] = idx;

        body.querySelectorAll('.quiz-opt').forEach((b, i) => {
          b.classList.add('is-disabled');
          b.disabled = true; // 同时封住键盘/读屏：退出 Tab 序，不触发点击
          if (i === item.a) b.classList.add('correct');
          if (i === idx && !correct) b.classList.add('wrong');
        });

        if (correct) score++;
        const fb = $('#quiz-feedback');
        fb.innerHTML = correct
          ? icon('check') + ' <b>回答正确！</b> ' + item.tip
          : icon('cross') + ' <b>回答错误</b> ' + item.tip;
        fb.classList.add(correct ? 'correct' : 'wrong');
        fb.classList.add('show');

        saveState(); // 记录本题作答结果（退出后可恢复）

        // 答完停留当前题，把焦点交给"下一题/完成"让用户手动前进（原点击项已 disabled 会丢焦点）
        const nxt = $('#quiz-next-btn');
        if (nxt) nxt.focus();
      });
    });

    // 上一题 / 下一题：手动导航，取消自动进题计时器；最后一题"完成"直达结果
    const prevBtn = $('#quiz-prev-btn');
    const nextBtn = $('#quiz-next-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => { currentQ--; renderQuestion(); });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (isLast) { showResult(); return; }
      currentQ++;
      renderQuestion();
    });

    // 焦点：未答题聚焦首个选项；已答题聚焦可用的导航按钮
    const firstEnabled = body.querySelector('.quiz-opt:not(.is-disabled)');
    if (firstEnabled) firstEnabled.focus();
    else if (nextBtn) nextBtn.focus();
    else if (prevBtn && !prevBtn.disabled) prevBtn.focus();

    saveState(); // 记录翻题后的当前位置/得分
  }

  function showResult() {
    clearState(); // 回合已完成，清除断点（下次打开是全新开始）
    const pct = Math.round((score / gameQuestions.length) * 100);
    let emoji, msg;
    if (pct >= 90) { emoji = icon('trophy'); msg = '太棒了！你是红色知识达人！'; }
    else if (pct >= 60) { emoji = icon('star'); msg = '不错！继续学习红色文化！'; }
    else { emoji = icon('book'); msg = '继续加油！多逛逛场馆页面学习吧~'; }

    body.innerHTML = '';
    result.classList.remove('is-hidden');
    result.innerHTML = `
        <div class="quiz-result-center">
          <div class="quiz-result-emoji">${emoji}</div>
          <h3>挑战完成！</h3>
          <div class="quiz-result-score">${score}/${gameQuestions.length}</div>
          <p class="quiz-result-rate">正确率 ${pct}%</p>
          <p class="quiz-result-msg">${msg}</p>
          <button class="btn primary quiz-btn-margin" id="quiz-retry-btn">${icon('refresh')} 再来一次</button>
          <button class="btn secondary quiz-btn-margin" id="quiz-close-btn">关闭</button>
        </div>
      `;
    $('#quiz-retry-btn').addEventListener('click', startQuiz);
    $('#quiz-close-btn').addEventListener('click', closeQuiz);
    const retryBtn = $('#quiz-retry-btn');
    if (retryBtn) retryBtn.focus();
  }

  function resetQuiz() {
    currentQ = 0; score = 0; gameQuestions = []; answers = [];
    body.innerHTML = startScreenHtml();
    result.classList.add('is-hidden');
    const newStartBtn = $('#quiz-start-btn');
    if (newStartBtn) newStartBtn.addEventListener('click', startQuiz);
  }
}

// 程序化打开：供 action-delegate 的 open-quiz case 调用（复用 FAB 点击逻辑）
function openQuiz() {
  const fab = document.querySelector('.quiz-fab');
  if (fab) fab.click();
}

export { initQuiz, openQuiz };
