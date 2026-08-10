/* ============================================================
   赓续血脉・数绘红旅 — 红色知识问答挑战 (Quiz)
   职责：悬浮 FAB + 弹窗问答挑战
   约束：依赖 focus-trap；被 app.js（初始化）与 action-delegate.js（openQuiz）引用
   ============================================================ */

import { trapFocus, releaseFocus } from './focus-trap.js?v=2026081006';
import { icon } from './icons.js?v=2026081006';
import { getBasePath } from './utils.js?v=2026081006';

const $ = (sel, ctx) => (ctx || document).querySelector(sel);

function initQuiz() {
  if ($('.quiz-fab')) return;

  const quizData = [
    { q: '中共一大会址纪念馆位于上海市的哪个区？', opts: ['黄浦区', '浦东新区', '徐汇区', '静安区'], a: 0, tip: '中共一大会址位于上海市黄浦区兴业路76号，1921年7月党的一大在此开幕。' },
    { q: '中共一大最后一天转移至嘉兴南湖的一条游船上闭幕，这条游船被称为什么？', opts: ['红船', '龙舟', '乌篷船', '画舫'], a: 0, tip: '1921年8月初代表们转移至嘉兴南湖红船上完成最后议程，"红船精神"由此得名。' },
    { q: '南昌起义打响了武装反抗国民党反动派的第一枪，发生在哪一年？', opts: ['1924年', '1927年', '1928年', '1931年'], a: 1, tip: '1927年8月1日南昌起义爆发，8月1日因此成为人民军队的建军节。' },
    { q: '井冈山革命根据地是中国第一个农村革命根据地，位于哪个省？', opts: ['湖南', '江西', '福建', '广东'], a: 1, tip: '井冈山位于江西省吉安市，是"农村包围城市、武装夺取政权"道路的起点。' },
    { q: '红军长征中生死攸关、具有伟大转折意义的会议是？', opts: ['古田会议', '遵义会议', '瓦窑堡会议', '八七会议'], a: 1, tip: '1935年1月的遵义会议确立了毛泽东在党和红军中的领导地位，是中国革命从挫折走向胜利的转折点。' },
    { q: '中央红军二万五千里长征的出发地是哪里？', opts: ['江西瑞金', '贵州遵义', '陕西延安', '甘肃会宁'], a: 0, tip: '1934年10月中央红军从江西瑞金出发，踏上漫漫长征路。' },
    { q: '红军三大主力胜利会师、宣告长征结束的地点在哪里？', opts: ['甘肃会宁', '陕西延安', '四川懋功', '贵州遵义'], a: 0, tip: '1936年10月红一、二、四方面军在甘肃会宁胜利会师，长征胜利结束。' },
    { q: '"飞夺泸定桥"发生在哪条河上？', opts: ['金沙江', '大渡河', '赤水河', '乌江'], a: 1, tip: '泸定桥横跨大渡河，1935年红四团昼夜奔袭240里飞夺泸定桥。' },
    { q: '"九一八事变"揭开中国抗日战争序幕，发生在哪一年？', opts: ['1929年', '1931年', '1935年', '1937年'], a: 1, tip: '1931年9月18日日本关东军炮轰沈阳、侵占东北，九一八历史博物馆就建在沈阳。' },
    { q: '延安革命纪念馆位于哪个省？', opts: ['山西', '甘肃', '陕西', '宁夏'], a: 2, tip: '延安革命纪念馆位于陕西省延安市，延安是抗日战争时期的革命圣地。' },
    { q: '中华人民共和国开国大典在何时举行？', opts: ['1945年10月1日', '1949年10月1日', '1949年12月1日', '1950年10月1日'], a: 1, tip: '1949年10月1日毛泽东在天安门城楼庄严宣告中华人民共和国中央人民政府成立。' },
    { q: '西柏坡是党中央"进京赶考"的出发地，与党的哪次会议相关？', opts: ['七届二中全会', '遵义会议', '古田会议', '十一届三中全会'], a: 0, tip: '1949年3月七届二中全会在西柏坡召开，会后党中央从西柏坡出发"进京赶考"迁往北平。' },
    { q: '古田会议确立了"思想建党、政治建军"的原则，发生在哪一年？', opts: ['1927年', '1929年', '1931年', '1935年'], a: 1, tip: '1929年12月古田会议在福建上杭古田召开，确立了党对军队的绝对领导。' },
    { q: '中国第一颗原子弹爆炸成功是在哪一年？', opts: ['1960年', '1964年', '1967年', '1970年'], a: 1, tip: '1964年10月16日中国第一颗原子弹爆炸成功，"两弹一星"精神由此铸就。' },
    { q: '每年的"学雷锋纪念日"是哪一天？', opts: ['3月5日', '5月4日', '7月1日', '10月1日'], a: 0, tip: '1963年3月5日毛泽东题词"向雷锋同志学习"，雷锋精神永不过时。' },
    { q: '被称为"人工天河"的红旗渠，是林县人民在哪个年代开凿的？', opts: ['20世纪30年代', '20世纪50年代', '20世纪60年代', '20世纪80年代'], a: 2, tip: '红旗渠1960年动工，林县人民苦战十年凿成1500公里"人工天河"，红旗渠精神由此诞生。' },
    { q: '渡江战役是解放战争的决定性战役，百万雄师过大江发生在哪一年？', opts: ['1947年', '1948年', '1949年', '1950年'], a: 2, tip: '1949年4月21日百万雄师横渡长江，宣告了国民党反动统治的覆灭。' },
    { q: '党的七大确立的党的指导思想是？', opts: ['毛泽东思想', '邓小平理论', '"三个代表"重要思想', '科学发展观'], a: 0, tip: '1945年中共七大正式确立毛泽东思想为党的指导思想并写入党章。' },
    { q: '中国人民抗日战争胜利纪念日是每年的？', opts: ['9月3日', '7月7日', '8月15日', '10月1日'], a: 0, tip: '1945年9月2日日本签署无条件投降书，9月3日成为中国人民抗日战争胜利纪念日。' },
    { q: '中国人民志愿军抗美援朝、出国作战是在哪一年？', opts: ['1949年', '1950年', '1951年', '1953年'], a: 1, tip: '1950年10月中国人民志愿军跨过鸭绿江赴朝作战，抗美援朝精神永载史册。' },
    { q: '五四运动爆发于哪一年，拉开了中国新民主主义革命的序幕？', opts: ['1917年', '1919年', '1921年', '1925年'], a: 1, tip: '1919年五四运动促进了马克思主义在中国的传播，为中国共产党成立准备了思想条件。' },
    { q: '毛泽东与朱德领导的部队在井冈山会师，合编为红四军，会师发生在？', opts: ['1927年4月', '1928年4月', '1929年4月', '1930年4月'], a: 1, tip: '1928年4月朱德、陈毅率南昌起义余部与毛泽东率领的秋收起义部队在井冈山胜利会师。' },
    { q: '1945年毛泽东赴重庆谈判，国共双方最终签署的文件是？', opts: ['"双十协定"', '"和平建国纲领"', '《停战协定》', '《政协决议》'], a: 0, tip: '1945年10月10日国共双方签署《双十协定》。红岩革命纪念馆就位于重庆。' },
    { q: '解放战争中的"三大战役"不包括下列哪一场？', opts: ['辽沈战役', '淮海战役', '平津战役', '渡江战役'], a: 3, tip: '三大战役指辽沈、淮海、平津三大战役，基本消灭了国民党军主力。' },
    { q: '中国人民抗日战争全面爆发的标志是？', opts: ['九一八事变', '七七事变', '一二八事变', '八一三事变'], a: 1, tip: '1937年7月7日卢沟桥事变（七七事变）爆发，标志着中国全民族抗战开始。' },
    { q: '人民英雄纪念碑碑文"人民英雄永垂不朽"是由谁题写的？', opts: ['毛泽东', '周恩来', '朱德', '刘少奇'], a: 0, tip: '毛泽东为人民英雄纪念碑题写"人民英雄永垂不朽"，碑文内容亦由他起草。' },
    { q: '中华人民共和国国歌《义勇军进行曲》的词作者是？', opts: ['田汉', '冼星海', '聂耳', '光未然'], a: 0, tip: '《义勇军进行曲》由田汉作词、聂耳作曲，诞生于抗日救亡运动中。' },
    { q: '"红岩精神"孕育于抗日战争时期的哪座城市？', opts: ['延安', '重庆', '武汉', '南京'], a: 1, tip: '红岩精神孕育于重庆，红岩革命纪念馆是重庆的标志性红色场馆。' },
    { q: '董存瑞舍身炸碉堡、黄继光用胸膛堵枪眼，他们分别牺牲于哪场战争？', opts: ['解放战争和抗美援朝', '抗日战争和解放战争', '长征和抗日战争', '抗美援朝和解放战争'], a: 0, tip: '董存瑞在解放战争隆化战役中牺牲，黄继光在抗美援朝上甘岭战役中牺牲。' },
    { q: '红军长征途中翻越的第一座大雪山是？', opts: ['夹金山', '岷山', '六盘山', '昆仑山'], a: 0, tip: '1935年6月红军翻越长征途中的第一座大雪山——夹金山，这也是长征站点之一。' },
  ];

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

  const html = `
      <button class="quiz-fab" aria-label="红色知识问答" title="红色知识挑战赛">
        <span><img class="quiz-fab-icon" src="${getBasePath()}挑战赛.webp" alt="红色知识挑战赛"></span>
      </button>
      <div class="quiz-modal-overlay" id="quiz-overlay">
        <div class="quiz-modal" role="dialog" aria-modal="true" aria-label="红色知识挑战赛">
          <button class="quiz-close" aria-label="关闭">✕</button>
          <div class="quiz-body" id="quiz-body">
            <div class="quiz-start">
              <div class="quiz-logo">${icon('star')}</div>
              <h3>红色知识挑战赛</h3>
              <p>测测你对红色场馆和革命历史的了解程度！</p>
              <p class="quiz-meta">每局随机 ${GAME_SIZE} 题 · 即时反馈 · 不限时间</p>
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
      // 每次打开重新查询：关闭后 resetQuiz 会重建开始按钮，旧引用已脱离 DOM
      initialFocus: $('#quiz-start-btn'),
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
  let gameQuestions = []; // 本局随机抽出的题目
  let answers = []; // 每题所选选项索引，null=未答
  // 无自动进题：答完停留当前题，由用户点"下一题/完成"手动前进

  startBtn.addEventListener('click', startQuiz);

  function startQuiz() {
    currentQ = 0;
    score = 0;
    gameQuestions = shuffle(quizData).slice(0, Math.min(GAME_SIZE, quizData.length));
    answers = new Array(gameQuestions.length).fill(null);
    result.classList.add('is-hidden');
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
  }

  function showResult() {
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
    body.innerHTML = `
        <div class="quiz-start">
          <div class="quiz-logo">${icon('star')}</div>
          <h3>红色知识挑战赛</h3>
          <p>测测你对红色场馆和革命历史的了解程度！</p>
          <p class="quiz-meta">每局随机 ${GAME_SIZE} 题 · 即时反馈 · 不限时间</p>
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
