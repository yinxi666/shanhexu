/* ============================================================
   赓续血脉・数绘红旅 — 红色知识问答挑战 (Quiz)
   职责：悬浮 FAB + 弹窗问答挑战
   约束：依赖 focus-trap；被 app.js（初始化）与 action-delegate.js（openQuiz）引用
   ============================================================ */

import { trapFocus, releaseFocus } from './focus-trap.js?v=2026080503';
import { icon } from './icons.js?v=2026080503';

const $ = (sel, ctx) => (ctx || document).querySelector(sel);

function initQuiz() {
  if ($('.quiz-fab')) return;

  const quizData = [
    { q: '中共一大在上海哪个区召开？', opts: ['黄浦区', '浦东新区', '徐汇区', '静安区'], a: 0, tip: '中共一大会址位于上海市黄浦区兴业路76号。' },
    { q: '井冈山革命博物馆位于哪个省？', opts: ['湖南', '江西', '福建', '广东'], a: 1, tip: '井冈山位于江西省吉安市井冈山市。' },
    { q: '遵义会议会址在哪个省？', opts: ['四川', '云南', '贵州', '广西'], a: 2, tip: '遵义会议会址位于贵州省遵义市红花岗区。' },
    { q: '"飞夺泸定桥"发生在哪条河上？', opts: ['金沙江', '大渡河', '赤水河', '乌江'], a: 1, tip: '泸定桥横跨大渡河，位于四川省甘孜州泸定县。' },
    { q: '古田会议会址位于哪个省？', opts: ['江西', '广东', '浙江', '福建'], a: 3, tip: '古田会议会址位于福建省龙岩市上杭县古田镇。' },
    { q: '延安革命纪念馆位于哪个省？', opts: ['山西', '甘肃', '陕西', '宁夏'], a: 2, tip: '延安革命纪念馆位于陕西省延安市宝塔区。' },
    { q: '九一八历史博物馆在哪个城市？', opts: ['长春', '哈尔滨', '沈阳', '大连'], a: 2, tip: '九一八历史博物馆位于辽宁省沈阳市大东区。' },
    { q: '韶山毛泽东同志故居在哪个省？', opts: ['湖北', '江西', '湖南', '河南'], a: 2, tip: '韶山位于湖南省湘潭市韶山市。' },
    { q: '百色起义纪念馆位于哪个自治区？', opts: ['内蒙古', '新疆', '西藏', '广西'], a: 3, tip: '百色起义纪念馆位于广西壮族自治区百色市。' },
    { q: '雨花台烈士纪念馆在哪个城市？', opts: ['北京', '上海', '南京', '武汉'], a: 2, tip: '雨花台烈士纪念馆位于江苏省南京市雨花台区。' },
    { q: '西柏坡纪念馆位于哪个省？', opts: ['河北', '河南', '山西', '山东'], a: 0, tip: '西柏坡纪念馆位于河北省石家庄市平山县。' },
    { q: '南昌八一起义纪念馆在哪个省？', opts: ['湖南', '湖北', '江西', '安徽'], a: 2, tip: '南昌八一起义纪念馆位于江西省南昌市东湖区。' },
  ];

  const html = `
      <button class="quiz-fab" aria-label="红色知识问答" title="红色知识挑战赛">
        <span>${icon('star')}</span>
      </button>
      <div class="quiz-modal-overlay" id="quiz-overlay">
        <div class="quiz-modal" role="dialog" aria-modal="true" aria-label="红色知识挑战赛">
          <button class="quiz-close" aria-label="关闭">✕</button>
          <div class="quiz-body" id="quiz-body">
            <div class="quiz-start">
              <div class="quiz-logo">${icon('star')}</div>
              <h3>红色知识挑战赛</h3>
              <p>测测你对红色场馆和革命历史的了解程度！</p>
              <p class="quiz-meta">共 ${quizData.length} 题 · 即时反馈 · 不限时间</p>
              <button class="btn primary" id="quiz-start-btn">开始挑战 →</button>
            </div>
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
    overlay.classList.add('open');
    trapFocus(overlay.querySelector('.quiz-modal'), {
      initialFocus: startBtn,
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
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeQuiz(); });

  let currentQ = 0;
  let score = 0;
  let answered = [];
  let advanceTimer = null;

  startBtn.addEventListener('click', startQuiz);

  function startQuiz() {
    clearTimeout(advanceTimer);
    currentQ = 0;
    score = 0;
    answered = [];
    result.classList.add('is-hidden');
    showQuestion();
  }

  function showQuestion() {
    if (currentQ >= quizData.length) { showResult(); return; }
    const item = quizData[currentQ];
    body.innerHTML = `
        <div class="quiz-question">
          <div class="quiz-progress">第 ${currentQ + 1} / ${quizData.length} 题 · 得分 ${score}</div>
          <h3>${item.q}</h3>
          <div class="quiz-options">
            ${item.opts.map((opt, i) => `
              <button class="quiz-opt" data-idx="${i}">
                <span class="opt-letter">${'ABCD'[i]}</span> ${opt}
              </button>
            `).join('')}
          </div>
          <div class="quiz-feedback" id="quiz-feedback"></div>
        </div>
      `;

    const firstOpt = body.querySelector('.quiz-opt');
    if (firstOpt) firstOpt.focus();

    body.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.addEventListener('click', function () {
        if (answered.includes(currentQ)) return;
        answered.push(currentQ);
        const idx = parseInt(this.dataset.idx);
        const correct = idx === item.a;

        body.querySelectorAll('.quiz-opt').forEach((b, i) => {
          b.classList.add('is-disabled');
          if (i === item.a) b.classList.add('correct');
          if (i === idx && !correct) b.classList.add('wrong');
        });

        if (correct) score++;
        const fb = $('#quiz-feedback');
        fb.innerHTML = correct
          ? icon('check') + ' <b>回答正确！</b> ' + item.tip
          : icon('cross') + ' <b>回答错误</b> ' + item.tip;
        fb.classList.add('show');

        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(() => { currentQ++; showQuestion(); }, 2500);
      });
    });
  }

  function showResult() {
    clearTimeout(advanceTimer);
    const pct = Math.round((score / quizData.length) * 100);
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
          <div class="quiz-result-score">${score}/${quizData.length}</div>
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
    clearTimeout(advanceTimer);
    currentQ = 0; score = 0; answered = [];
    body.innerHTML = `
        <div class="quiz-start">
          <div class="quiz-logo">${icon('star')}</div>
          <h3>红色知识挑战赛</h3>
          <p>测测你对红色场馆和革命历史的了解程度！</p>
          <p class="quiz-meta">共 ${quizData.length} 题 · 即时反馈 · 不限时间</p>
          <button class="btn primary" id="quiz-start-btn">开始挑战 →</button>
        </div>
      `;
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
