/* ============================================================
   赓续血脉・数绘红旅 — 创新功能模块
   AI 智能导览 / 深色模式 / 知识问答 / 场馆收藏 / 路线推荐
   ============================================================ */

window.RedFeatures = (() => {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

  let venuesCache = [];

  /* ================================================================
     (1) AI 智能导览助手
     ================================================================ */
  function initChatWidget() {
    if ($('.chat-widget')) return;

    const html = `
      <div class="chat-widget">
        <button class="chat-fab" aria-label="AI导览助手" title="AI智能导览助手">
          <span class="chat-fab-icon">🤖</span>
          <span class="chat-fab-badge">AI</span>
        </button>
        <div class="chat-panel">
          <div class="chat-header">
            <div class="chat-header-left">
              <span class="chat-avatar">🤖</span>
              <div>
                <strong>红旅AI助手</strong>
                <small>基于场馆知识库 · 离线可用</small>
              </div>
            </div>
            <button class="chat-close" aria-label="关闭对话">✕</button>
          </div>
          <div class="chat-messages" id="chat-messages">
            <div class="chat-msg bot">
              <div class="chat-bubble">
                你好！我是<b>红旅AI助手</b> 🤖<br><br>
                🗺️ <b>查场馆</b>：「延安有哪些场馆」「介绍井冈山」<br>
                📖 <b>学历史</b>：「长征」「遵义会议」「九一八」<br>
                🚩 <b>悟精神</b>：「红船精神」「红旗渠精神」<br>
                📊 <b>看数据</b>：「有多少场馆」「哪些省份最多」<br>
                🛤️ <b>找路线</b>：「推荐红色旅游路线」<br>
                ⚖️ <b>对比</b>：「比较井冈山和延安」<br>
                📅 <b>历史查询</b>：「1935年发生了什么」<br><br>
                <i>试试输入你想了解的内容吧！</i>
              </div>
            </div>
          </div>
          <div class="chat-input-area">
            <div class="chat-quick-btns" id="chat-quick-btns">
              <button data-q="推荐红色旅游路线">🗺️ 推荐路线</button>
              <button data-q="有多少场馆">📊 数据统计</button>
              <button data-q="红船精神是什么">🚩 红色精神</button>
              <button data-q="长征">📖 历史事件</button>
              <button data-q="延安有哪些场馆">📍 查场馆</button>
              <button data-q="有哪些省份">🗺️ 省份分布</button>
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
      panel.classList.toggle('open');
      fab.style.display = panel.classList.contains('open') ? 'none' : '';
      if (panel.classList.contains('open')) { input.focus(); restoreChatHistory(); }
    });
    close.addEventListener('click', () => {
      panel.classList.remove('open');
      fab.style.display = '';
      saveChatHistory();
    });

    function saveChatHistory() {
      try {
        const bubbles = $$('.chat-bubble', messages);
        const history = bubbles.map(b => ({ html: b.innerHTML, cls: b.parentElement.classList.contains('user') ? 'user' : 'bot' }));
        sessionStorage.setItem('redguide_chat', JSON.stringify(history.slice(-20)));
      } catch (e) {}
    }
    function restoreChatHistory() {
      try {
        const saved = JSON.parse(sessionStorage.getItem('redguide_chat') || '[]');
        if (saved.length === 0) return;
        const existing = $$('.chat-msg', messages);
        if (existing.length <= 1) {
          messages.innerHTML = '';
          saved.forEach(m => appendMsg(m.cls, m.html));
        }
      } catch (e) {}
    }

    function sendMessage(text) {
      if (!text.trim()) return;
      appendMsg('user', text);
      input.value = '';
      quickBtns.style.display = 'none';

      const typingId = appendMsg('bot', '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>');
      setTimeout(() => {
        const reply = generateReply(text);
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();
        appendMsg('bot', reply);
        saveChatHistory();
      }, 600 + Math.random() * 600);
    }

    function appendMsg(role, text) {
      const id = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const div = document.createElement('div');
      div.className = 'chat-msg ' + role;
      div.id = id;
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      if (role === 'user') {
        bubble.textContent = text;
      } else {
        bubble.innerHTML = text;
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
    if (!q) return '请告诉我你想了解什么 😊';

    const venues = venuesCache;
    if (venues.length === 0) return '场馆数据正在加载中，请稍后再试…';

    // ===== 第一层：历史事件与精神知识库 =====
    const knowledge = [
      { re: /(四渡赤水|四渡赤水河)/, answer: '📍 <b>四渡赤水</b>是遵义会议后，中央红军在长征途中进行的一次具有决定性意义的运动战战役。1935年1月至3月，红军在贵州、四川、云南交界的赤水河地区，巧妙穿插于国民党军重兵集团之间，取得了战略转移中具有决定意义的胜利。主要地点包括贵州遵义、赤水，四川古蔺等地。', related: ['遵义会议', '长征路线', '飞夺泸定桥'] },
      { re: /(长征|二万五千里)(?!.*(?:精神|纪念馆|路线|推荐))/, answer: '🚶 <b>长征</b>（1934.10—1936.10）是中国工农红军在第五次反"围剿"失利后进行的战略转移，历经二万五千里，跨越14个省，翻越夹金山、雪山草地，胜利会师甘肃会宁，铸就了伟大的<b>长征精神</b>。', related: ['长征精神', '遵义会议', '飞夺泸定桥', '会宁会师'] },
      { re: /(遵义会议)(?!.*(?:会址|纪念馆))/, answer: '🏛️ <b>遵义会议</b>于1935年1月在贵州遵义召开，确立了毛泽东同志在党中央和红军的领导地位，是中国共产党历史上一个生死攸关的转折点。', related: ['遵义会议会址', '长征', '四渡赤水'] },
      { re: /(古田会议)(?!.*(?:会址|纪念馆))/, answer: '📜 <b>古田会议</b>于1929年12月在福建上杭古田召开，确立了"思想建党、政治建军"的原则，是中国共产党和红军建设史上的重要里程碑。', related: ['古田会议会址', '南昌起义'] },
      { re: /(西柏坡|进京赶考|两个务必)/, answer: '🏠 <b>西柏坡</b>（1947.5—1949.3）是解放战争时期中共中央所在地。在这里指挥了三大战役，召开七届二中全会，毛泽东同志提出"两个务必"和"进京赶考"的历史命题。', related: ['西柏坡纪念馆', '延安革命纪念馆', '开国大典'] },
      { re: /延安精神/, answer: '🔥 <b>延安精神</b>：坚定正确的政治方向、解放思想实事求是、全心全意为人民服务、自力更生艰苦奋斗。延安时期（1935—1948）是党走向成熟的关键阶段。', related: ['延安革命纪念馆', '西柏坡', '南泥湾精神'] },
      { re: /井冈山精神/, answer: '⛰️ <b>井冈山精神</b>：坚定信念、艰苦奋斗，实事求是、敢闯新路，依靠群众、勇于胜利。井冈山是中国第一个农村革命根据地（1927年创建）。', related: ['井冈山革命博物馆', '秋收起义', '南昌起义'] },
      { re: /百色起义/, answer: '🔫 <b>百色起义</b>于1929年12月11日在广西百色举行，由邓小平、张云逸等领导，建立了中国工农红军第七军和右江革命根据地，是党在少数民族地区开展武装斗争的成功范例。', related: ['百色起义纪念馆', '南昌起义'] },
      { re: /(九一八|918)(?!.*(?:博物馆|纪念馆))/, answer: '⚠️ <b>九一八事变</b>发生于1931年9月18日，日本关东军炸毁沈阳柳条湖附近南满铁路路轨，以此为借口发动侵华战争，是中国人民14年抗战的开端。', related: ['九一八历史博物馆', '抗日战争'] },
      { re: /(中共一大|一大)(?!.*(?:会址|纪念馆|南湖))/, answer: '🌟 <b>中共一大</b>于1921年7月23日在上海开幕，后转移至浙江嘉兴南湖的游船上闭幕，宣告中国共产党正式成立，是中国历史上开天辟地的大事变。', related: ['中共一大会址纪念馆', '嘉兴南湖红船', '红船精神'] },
      { re: /(南昌起义|八一起义)(?!.*(?:纪念馆))/, answer: '🔫 <b>南昌起义</b>于1927年8月1日在江西南昌举行，周恩来、贺龙、叶挺、朱德、刘伯承等领导，打响了武装反抗国民党反动派的第一枪，8月1日后来被定为建军节。', related: ['南昌八一起义纪念馆', '秋收起义', '井冈山'] },
      { re: /(秋收起义)(?!.*(?:纪念馆|会师))/, answer: '🌾 <b>秋收起义</b>于1927年9月由毛泽东在湘赣边界领导，起义受挫后率部上井冈山，创建了中国第一个农村革命根据地，开创"农村包围城市"的革命道路。', related: ['井冈山革命博物馆', '南昌起义'] },
      { re: /(广州起义)(?!.*(?:烈士|陵园|纪念馆))/, answer: '🏙️ <b>广州起义</b>于1927年12月11日在广州举行，张太雷、叶挺、叶剑英等领导，建立了中国第一个城市苏维埃政权——广州苏维埃政府。', related: ['广州起义烈士陵园', '南昌起义'] },
      { re: /(抗日战争|抗战)(?!.*(?:纪念馆|博物馆))/, answer: '⚔️ <b>抗日战争</b>（1931—1945）是中华民族全面抵抗日本侵略的民族解放战争。中国共产党领导八路军、新四军开辟敌后战场，是全民族抗战的中流砥柱。', related: ['九一八历史博物馆', '八路军太行纪念馆', '东北烈士纪念馆'] },
      { re: /(解放战争|三大战役)/, answer: '⚔️ <b>解放战争</b>（1946—1949）是推翻国民党统治的决定性阶段。辽沈、淮海、平津三大战役奠定胜局，1949年10月1日中华人民共和国成立。', related: ['西柏坡纪念馆', '孟良崮战役纪念馆', '开国大典'] },
      { re: /开国大典/, answer: '🎉 <b>开国大典</b>于1949年10月1日在北京天安门广场举行，毛泽东同志庄严宣告中华人民共和国中央人民政府成立，标志着中国新民主主义革命的伟大胜利。', related: ['中国共产党历史展览馆', '西柏坡纪念馆'] },
      { re: /(长征胜利|会宁会师)/, answer: '🎯 <b>长征胜利</b>以1936年10月红军三大主力在甘肃会宁会师为标志。长征的胜利是中国革命转危为安的关键，铸就了长征精神。', related: ['会宁红军长征胜利纪念馆', '六盘山红军长征纪念馆', '遵义会议'] },
      { re: /(湘江战役)/, answer: '💧 <b>湘江战役</b>（1934.11—12）是中央红军长征中突破国民党第四道封锁线的关键战役，红军付出巨大牺牲突破湘江，为遵义会议的召开创造了条件。', related: ['遵义会议', '长征'] },
      { re: /(飞夺泸定桥)/, answer: '🌉 <b>飞夺泸定桥</b>（1935.5.29）是长征中的关键战斗。红四团22名勇士冒着枪林弹雨攀爬13根铁索夺取泸定桥，为红军北上打开了通道。', related: ['泸定桥景区', '长征', '大渡河'] },
      { re: /红船精神/, answer: '🚢 <b>红船精神</b>来源于中共一大在南湖红船上闭幕的历史事件，内涵：开天辟地敢为人先的首创精神、坚定理想百折不挠的奋斗精神、立党为公忠诚为民的奉献精神。', related: ['嘉兴南湖红船', '中共一大会址'] },
      { re: /苏区精神/, answer: '🏛️ <b>苏区精神</b>：坚定信念、求真务实、一心为民、清正廉洁、艰苦奋斗、争创一流、无私奉献。中央苏区（1929—1934）以瑞金为中心，是共和国的摇篮。', related: ['井冈山革命博物馆', '南昌八一起义纪念馆'] },
      { re: /长征精神/, answer: '🚩 <b>长征精神</b>：把全国人民和中华民族的根本利益看得高于一切，坚定革命的理想和信念，坚信正义事业必然胜利；不怕任何艰难险阻、不惜付出一切牺牲；坚持独立自主、实事求是、一切从实际出发；顾全大局、严守纪律、紧密团结；紧紧依靠人民群众，生死相依、艰苦奋斗。', related: ['长征', '遵义会议', '会宁会师', '泸定桥'] },
      { re: /(红旗渠|红旗渠精神)/, answer: '💪 <b>红旗渠精神</b>：自力更生、艰苦创业、团结协作、无私奉献。20世纪60年代，河南林县人民在太行山悬崖峭壁上历时10年开凿出1500公里的"人工天河"红旗渠。', related: ['红旗渠纪念馆', '南泥湾精神'] },
      { re: /(两弹一星|两弹精神|邓稼先|钱学森)/, answer: '🚀 <b>"两弹一星"精神</b>：热爱祖国、无私奉献、自力更生、艰苦奋斗、大力协同、勇于攀登。1964年中国第一颗原子弹爆炸成功，1967年氢弹成功，1970年东方红卫星发射。', related: ['青海原子城纪念馆', '延安精神'] },
      { re: /(红岩精神)/, answer: '🔥 <b>红岩精神</b>诞生于抗日战争时期的重庆红岩村，内涵：崇高思想境界、坚定理想信念、巨大人格力量和浩然革命正气。以周恩来为代表的南方局在险恶环境中坚持斗争。', related: ['红岩革命纪念馆', '重庆'] },
      { re: /(大别山精神|金寨)/, answer: '⛰️ <b>大别山精神</b>：坚守信念、胸怀大局、团结奋斗、勇当前锋。大别山是全国第二大革命根据地——鄂豫皖苏区的核心区域。金寨县走出了59位开国将军。', related: ['金寨县革命烈士纪念塔', '黄麻起义和鄂豫皖苏区纪念园'] },
      { re: /(东北抗联|杨靖宇|赵尚志|赵一曼)/, answer: '🌲 <b>东北抗联</b>是中国共产党领导下在东北坚持抗日游击战争的英雄部队。在零下40度的严寒中，杨靖宇、赵尚志、赵一曼等英雄与日寇进行了长达14年的艰苦斗争。', related: ['东北烈士纪念馆', '九一八历史博物馆'] },
      { re: /(一二九运动|一二九)/, answer: '📢 <b>一二·九运动</b>爆发于1935年12月9日，北平大中学生数千人举行了抗日救国示威游行，掀起了全国抗日救国的新高潮。', related: ['抗日战争', '延安'] },
      { re: /(南泥湾|大生产|屯垦)/, answer: '🌾 <b>南泥湾精神</b>：自力更生、艰苦奋斗。1941年八路军三五九旅开进南泥湾开展大生产运动，将荒山野岭变成"陕北好江南"。后来三五九旅转战新疆，继续屯垦戍边。', related: ['三五九旅屯垦纪念馆', '延安革命纪念馆'] },
      { re: /(琼崖|琼崖纵队|二十三年红旗不倒|冯白驹)/, answer: '🌴 <b>琼崖革命</b>创造了"二十三年红旗不倒"的奇迹（1927—1950）。冯白驹领导琼崖纵队在孤岛环境下坚持武装斗争，直至配合渡海大军解放海南岛。', related: ['母瑞山革命根据地纪念园', '梅山老区革命烈士陵园'] },
    ];

    // ===== 第一层匹配：历史知识库 =====
    for (var ki = 0; ki < knowledge.length; ki++) {
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
      { re: /谢谢|感谢|多谢|thank/, handler: () => '不客气！😊 随时为你解答红色文旅相关问题。有什么想了解的可以继续问我～' },
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
      return formatVenueDetail(fuzzyVenue) + '<br><i>💡 输入「推荐路线」可获取主题游览建议</i>';
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
      return `🔍 在简介中搜索「${q.slice(0, 6)}」找到 <b>${summaryMatch.length}</b> 个相关场馆：<br>` +
        summaryMatch.slice(0, 5).map(v => `• <b>${v.name}</b> — ${v.province} ${v.city||''}<br><small>${(v.summary||'').slice(0,60)}…</small>`).join('<br><br>') +
        `<br><i>💡 点击场馆名可在导览页查看详情</i>`;
    }

    // 真正的智能降级：给出有帮助的建议
    return `🤔 关于「<b>${q.slice(0, 30)}</b>」，我还在学习中。试试这些：<br><br>
      🗺️ <b>查场馆</b>：「延安有什么场馆」「介绍井冈山革命博物馆」<br>
      📖 <b>学历史</b>：「长征」「遵义会议」「九一八事变」<br>
      🚩 <b>悟精神</b>：「红船精神」「长征精神」「红旗渠精神」<br>
      📊 <b>看数据</b>：「有多少场馆」「哪些省份最多」「场馆类别」<br>
      🛤️ <b>找路线</b>：「推荐红色旅游路线」「长征路线怎么走」<br><br>
      <i>或者到<a href="/pages/guide.html">全国导览</a>页面浏览全部 ${venues.length} 个场馆</i>`;
  }

  /* ===== 智能搜索函数 ===== */

  function searchByRegion(region) {
    const venues = venuesCache;
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
      return `暂未收录「${region}」的场馆信息。目前已覆盖 <b>${getProvinceCount()}</b> 个省区市。试试输入省份全称如「陕西省」「湖南省」？`;
    }
    const cats = [...new Set(found.map(v => v.category).filter(Boolean))];
    return `📍 <b>${region}</b> 共有 <b>${found.length}</b> 个红色场馆<br><br>` +
      found.map(v => `• <b>${v.name}</b> — ${v.category||'红色场馆'}｜${v.city||''}${v.district||''}<br><small>${(v.summary||'').slice(0,50)}…</small>`).join('<br>') +
      `<br>🏷️ 类别分布：${cats.map(c => c).join(' · ')}` +
      `<br><i>💡 输入场馆名称可查看详细信息</i>`;
  }

  function searchVenue(name) {
    const v = findVenue(name.replace(/[的了吗呢]$/, '').trim());
    if (!v) return `没找到「<b>${name.slice(0,15)}</b>」的详细信息。<br><br>🔍 试试：<br>• 输入完整场馆名称<br>• 输入省份名称查看当地全部场馆<br>• 到<a href="/pages/guide.html">全国导览</a>搜索`;
    return formatVenueDetail(v) + '<br><i>💡 问「' + v.name.slice(0, 4) + '附近有什么」查看周边场馆</i>';
  }

  function searchVenueLocation(name) {
    const v = findVenue(name.replace(/[在哪里怎么去地址位置交通]$/, '').trim());
    if (!v) return searchVenue(name);
    const coord = v.coordinates;
    return `🏛️ <b>${v.name}</b><br>
      📍 <b>详细地址</b>：${v.province||''}${v.city||''}${v.district||''}<br>
      ${coord ? `🌐 <b>经纬度</b>：${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}<br>` : ''}
      ${v.officialUrl ? `🔗 <a href="${v.officialUrl}" target="_blank">官方网站（含交通指引）</a><br>` : ''}
      <br><i>💡 建议出行前通过官网或电话确认开放时间和预约方式</i>`;
  }

  function searchByCategory(cat) {
    const found = venuesCache.filter(v => v.category && v.category.includes(cat));
    if (found.length === 0) {
      const allCats = getCategoriesRaw();
      return `没找到「${cat}」类别。当前场馆类别有：${allCats.join('、')}<br><br><i>💡 输入类别名查看该类别下的场馆</i>`;
    }
    return `🏷️ <b>${cat}</b> 类场馆共 <b>${found.length}</b> 个：<br><br>` +
      found.map(v => `• <b>${v.name}</b> — ${v.province} ${v.city||''}`).join('<br>') +
      `<br><i>💡 输入场馆名了解详情</i>`;
  }

  function compareVenues(a, b) {
    const va = findVenue(a.trim());
    const vb = findVenue(b.trim());
    if (!va || !vb) return `需要两个有效场馆名才能对比哦。试试如「比较井冈山和延安」`;
    return `⚖️ <b>场馆对比</b><br><br>
      <table style="width:100%;font-size:13px;">
      <tr><td></td><td><b>${va.name}</b></td><td><b>${vb.name}</b></td></tr>
      <tr><td>📍 地区</td><td>${va.province} ${va.city||''}</td><td>${vb.province} ${vb.city||''}</td></tr>
      <tr><td>🏷️ 类别</td><td>${va.category||'—'}</td><td>${vb.category||'—'}</td></tr>
      <tr><td>📝 简介</td><td>${(va.summary||'').slice(0,40)}…</td><td>${(vb.summary||'').slice(0,40)}…</td></tr>
      </table><br><i>💡 输入场馆名查看完整详情</i>`;
  }

  function searchNearby(name) {
    const v = findVenue(name.replace(/[附近周边周围旁边临近]$/, '').trim());
    if (!v) return searchVenue(name);
    const sameProv = venuesCache.filter(x => x.province === v.province && x.name !== v.name);
    const sameCity = sameProv.filter(x => x.city === v.city);
    const nearby = sameCity.length > 0 ? sameCity : sameProv;
    return `📍 <b>${v.name}</b> 位于 <b>${v.province}${v.city||''}</b><br><br>` +
      (nearby.length > 0
        ? `同地区的其他场馆（${nearby.length}个）：<br>` + nearby.slice(0, 6).map(x => `• <b>${x.name}</b> — ${x.category||''}`).join('<br>')
        : `该地区目前仅收录了这一个场馆`) +
      `<br><i>💡 输入「${v.province.replace(/省|市|自治区/g,'')}有哪些场馆」查看全部</i>`;
  }

  function getStats() {
    const v = venuesCache;
    const provinces = getProvinceCount();
    const cats = getCategoriesRaw();
    return `📊 <b>红色场馆数据统计</b><br><br>
      🏛️ 场馆总数：<b>${v.length}</b> 个<br>
      🗺️ 覆盖省区市：<b>${provinces}</b> 个<br>
      🏷️ 场馆类别：<b>${cats.length}</b> 种（${cats.join('、')}）<br>
      📅 数据更新：2026年7月<br><br>
      <i>💡 输入省份名查看该地区的场馆</i>`;
  }

  function getProvinceRanking() {
    const count = {};
    venuesCache.forEach(v => {
      const p = v.province.replace(/省|市|自治区|壮族|回族|维吾尔/g, '');
      count[p] = (count[p] || 0) + 1;
    });
    const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
    return `📊 <b>各省区市场馆数量排名</b><br><br>` +
      sorted.slice(0, 10).map(([p, c], i) => `${['🥇','🥈','🥉'][i]||(i+1)} <b>${p}</b>：${c} 个`).join('<br>') +
      `<br><i>💡 输入省份名查看该地区的具体场馆</i>`;
  }

  function getCategories() {
    return `🏷️ 当前场馆覆盖的类别：<br><br>` +
      getCategoriesRaw().map(c => `• <b>${c}</b>`).join('<br>') +
      `<br><i>💡 输入类别名查看该类别下的场馆，如「革命纪念馆有哪些」</i>`;
  }

  function getCategoriesRaw() {
    return [...new Set(venuesCache.map(v => v.category).filter(Boolean))].sort();
  }

  function getProvinceCount() {
    return new Set(venuesCache.map(v => v.province)).size;
  }

  function getHelp() {
    return `🤖 <b>红旅AI助手 使用指南</b><br><br>
      🗺️ <b>查场馆</b><br>「延安有哪些场馆」「介绍井冈山革命博物馆」「韶山在哪」<br><br>
      📖 <b>学历史</b><br>「长征」「遵义会议」「九一八事变」「飞夺泸定桥」<br><br>
      🚩 <b>悟精神</b><br>「红船精神」「长征精神」「延安精神」「红旗渠精神」<br><br>
      📊 <b>看数据</b><br>「有多少场馆」「哪些省份最多」「场馆类别有哪些」<br><br>
      🛤️ <b>找路线</b><br>「推荐红色旅游路线」「长征路线怎么走」<br><br>
      ⚖️ <b>对比</b><br>「比较井冈山和延安」「对比西柏坡和遵义」<br><br>
      <i>现在就开始提问吧！</i>`;
  }

  function getYearEvents(year) {
    const timeline = {
      '1921': '🌟 1921年7月23日，<b>中共一大</b>在上海开幕，后转移至嘉兴南湖闭幕，中国共产党正式成立。',
      '1927': '🔫 1927年8月1日<b>南昌起义</b>、9月<b>秋收起义</b>、12月<b>广州起义</b>，是我党独立领导武装斗争的开端。',
      '1929': '📜 1929年12月，<b>古田会议</b>在福建上杭召开，确立"思想建党、政治建军"原则。',
      '1931': '⚠️ 1931年9月18日<b>九一八事变</b>，日本侵占东北；11月<b>中华苏维埃共和国</b>在瑞金成立。',
      '1934': '🚶 1934年10月，中央红军从江西出发，开始<b>长征</b>。',
      '1935': '🏛️ 1935年1月<b>遵义会议</b>、5月<b>飞夺泸定桥</b>、10月中央红军到达陕北。',
      '1936': '🎯 1936年10月，红军三大主力在<b>甘肃会宁</b>胜利会师，长征结束。',
      '1937': '⚔️ 1937年7月7日<b>卢沟桥事变</b>，全面抗战爆发。',
      '1945': '🎉 1945年8月15日，<b>日本宣布无条件投降</b>，抗日战争胜利。',
      '1949': '🏛️ 1949年3月<b>七届二中全会</b>在西柏坡召开；10月1日<b>开国大典</b>。',
      '1964': '🚀 1964年10月16日，中国第一颗<b>原子弹</b>在青海原子城爆炸成功。',
    };
    if (timeline[year]) return `📅 <b>${year}年</b>${timeline[year]}`;
    return `📅 <b>${year}年</b>的具体红色历史事件我还在整理中。<br><br>目前已收录：${Object.keys(timeline).join('、')} 年的重要事件。<br><i>💡 输入具体事件名如「长征」「开国大典」了解更多</i>`;
  }

  function getSpiritList() {
    return `🚩 <b>红色精神谱系</b><br><br>
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
      <i>💡 输入精神名称了解详情，如「红旗渠精神」</i>`;
  }

  function findVenue(name) {
    if (window.RedData && window.RedData.findVenueByName) {
      const result = RedData.findVenueByName(venuesCache, name);
      if (result) return result;
    }
    name = name.replace(/[的了吗呢在哪怎么走]$/, '').trim();
    let found = venuesCache.find(v => (v.name || '') === name || (v.standardName || '') === name);
    if (found) return found;
    found = venuesCache.find(v => (v.name || '').includes(name) || (v.standardName || '').includes(name));
    if (found) return found;
    return venuesCache.find(v => (v.name || '').includes(name.slice(0, 4)));
  }
  function recommendRoute(q) {
    var isChangzheng = q.indexOf('长征') >= 0;
    var routes = [
      { name: '🌟 建党足迹之旅（2天）', desc: '上海一大会址 → 嘉兴南湖红船，追寻党的诞生足迹。', venues: ['中共一大会址纪念馆', '嘉兴南湖红船'], theme: '建党' },
      { name: '⭐ 长征精神之旅（5天）', desc: '井冈山 → 遵义 → 泸定桥 → 会宁，重走长征关键节点。', venues: ['井冈山革命博物馆', '遵义会议会址', '泸定桥', '会宁红军长征胜利纪念馆'], theme: '长征' },
      { name: '🏔️ 延安精神之旅（3天）', desc: '延安 → 西柏坡 → 北京，从延安到开国大典。', venues: ['延安革命纪念馆', '西柏坡纪念馆', '中国共产党历史展览馆'], theme: '延安' },
      { name: '🔥 抗战记忆之旅（4天）', desc: '沈阳 → 太行 → 重庆，重温全民族抗战史诗。', venues: ['九一八历史博物馆', '八路军太行纪念馆', '红岩革命纪念馆'], theme: '抗战' },
      { name: '⛰️ 革命摇篮之旅（3天）', desc: '南昌 → 井冈山 → 古田，探索人民军队创建之路。', venues: ['南昌八一起义纪念馆', '井冈山革命博物馆', '古田会议会址'], theme: '建军' },
      { name: '🌄 伟人故里之旅（2天）', desc: '韶山 → 天津，缅怀伟人风范。', venues: ['韶山毛泽东同志故居', '周恩来邓颖超纪念馆'], theme: '伟人' },
      { name: '💪 奋斗精神之旅（3天）', desc: '红旗渠 → 三五九旅 → 原子城，感受奋斗力量。', venues: ['红旗渠纪念馆', '三五九旅屯垦纪念馆', '青海原子城纪念馆'], theme: '奋斗' },
    ];
    var displayRoutes = isChangzheng ? routes.filter(function(r) { return r.theme === "长征"; }).concat(routes.filter(function(r) { return r.theme !== "长征"; })) : routes;
    var html = '<b style="font-size:15px;">🗺️ 红色旅游主题路线推荐</b><br><br>';
    displayRoutes.forEach(function(r) {
      html += '<div style="margin-bottom:12px;padding:10px;background:var(--white);border-radius:8px;border:1px solid var(--card-border);">';
      html += '<b>' + r.name + '</b><br>📌 ' + r.desc + '<br>';
      html += '🏛️ ' + r.venues.map(function(vn) {
        var v = venuesCache.find(function(x) { return x.name.indexOf(vn) >= 0; });
        return v ? '<a href="/pages/detail.html?id=' + v.id + '" style="color:var(--red);">' + vn + '</a>' : vn;
      }).join(' → ');
      html += '</div>';
    });
    html += '<br><i>💡 点击场馆名查看详情 | 输入「长征路线」查看长征专题</i>';
    return html;
  }
  /* ================================================================
     (2) 深色模式
     ================================================================ */
  function initDarkMode() {
    const toggle = document.createElement('button');
    toggle.className = 'dark-toggle';
    toggle.setAttribute('aria-label', '切换深色模式');
    toggle.innerHTML = '🌙';
    toggle.title = '切换深色/浅色模式';
    document.body.appendChild(toggle);

    try {
      const saved = localStorage.getItem('redguide_dark');
      if (saved === '1') {
        document.documentElement.classList.add('dark');
        toggle.innerHTML = '☀️';
      }
    } catch (e) { }

    toggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      toggle.innerHTML = isDark ? '☀️' : '🌙';
      try { localStorage.setItem('redguide_dark', isDark ? '1' : '0'); } catch (e) {}
    });
  }

  /* ================================================================
     (3) 红色知识问答挑战
     ================================================================ */
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
        <span>🧠</span>
      </button>
      <div class="quiz-modal-overlay" id="quiz-overlay">
        <div class="quiz-modal">
          <button class="quiz-close" aria-label="关闭">✕</button>
          <div class="quiz-body" id="quiz-body">
            <div class="quiz-start">
              <div class="quiz-logo">🧠</div>
              <h3>红色知识挑战赛</h3>
              <p>测测你对红色场馆和革命历史的了解程度！</p>
              <p style="font-size:13px;color:var(--muted);">共 ${quizData.length} 题 · 即时反馈 · 不限时间</p>
              <button class="btn primary" id="quiz-start-btn">开始挑战 →</button>
            </div>
          </div>
          <div class="quiz-result" id="quiz-result" style="display:none;"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    const fab = $('.quiz-fab');
    const overlay = $('#quiz-overlay');
    const closeBtn = $('.quiz-close');
    const startBtn = $('#quiz-start-btn');
    const body = $('#quiz-body');
    const result = $('#quiz-result');

    fab.addEventListener('click', () => overlay.classList.add('open'));
    closeBtn.addEventListener('click', () => { overlay.classList.remove('open'); resetQuiz(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.classList.remove('open'); resetQuiz(); } });

    let currentQ = 0;
    let score = 0;
    let answered = [];

    startBtn.addEventListener('click', startQuiz);

    function startQuiz() {
      currentQ = 0;
      score = 0;
      answered = [];
      result.style.display = 'none';
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

      body.querySelectorAll('.quiz-opt').forEach(btn => {
        btn.addEventListener('click', function () {
          if (answered.includes(currentQ)) return;
          answered.push(currentQ);
          const idx = parseInt(this.dataset.idx);
          const correct = idx === item.a;

          body.querySelectorAll('.quiz-opt').forEach((b, i) => {
            b.style.pointerEvents = 'none';
            if (i === item.a) b.classList.add('correct');
            if (i === idx && !correct) b.classList.add('wrong');
          });

          if (correct) score++;
          const fb = $('#quiz-feedback');
          fb.innerHTML = correct
            ? '✅ <b>回答正确！</b> ' + item.tip
            : '❌ <b>回答错误</b> ' + item.tip;
          fb.classList.add('show');

          setTimeout(() => { currentQ++; showQuestion(); }, 2500);
        });
      });
    }

    function showResult() {
      const pct = Math.round((score / quizData.length) * 100);
      let emoji, msg;
      if (pct >= 90) { emoji = '🏆'; msg = '太棒了！你是红色知识达人！'; }
      else if (pct >= 60) { emoji = '👍'; msg = '不错！继续学习红色文化！'; }
      else { emoji = '📚'; msg = '继续加油！多逛逛场馆页面学习吧~'; }

      body.innerHTML = '';
      result.style.display = 'block';
      result.innerHTML = `
        <div style="text-align:center;padding:28px;">
          <div style="font-size:56px;margin-bottom:10px;">${emoji}</div>
          <h3>挑战完成！</h3>
          <div style="font-size:42px;font-weight:800;color:var(--red);margin:12px 0;">${score}/${quizData.length}</div>
          <p style="color:var(--muted);">正确率 ${pct}%</p>
          <p style="margin:12px 0;font-weight:600;">${msg}</p>
          <button class="btn primary" id="quiz-retry-btn" style="margin:10px 4px;">🔄 再来一次</button>
          <button class="btn secondary" id="quiz-close-btn" style="margin:10px 4px;">关闭</button>
        </div>
      `;
      $('#quiz-retry-btn').addEventListener('click', startQuiz);
      $('#quiz-close-btn').addEventListener('click', () => { overlay.classList.remove('open'); resetQuiz(); });
    }

    function resetQuiz() {
      currentQ = 0; score = 0; answered = [];
      body.innerHTML = `
        <div class="quiz-start">
          <div class="quiz-logo">🧠</div>
          <h3>红色知识挑战赛</h3>
          <p>测测你对红色场馆和革命历史的了解程度！</p>
          <p style="font-size:13px;color:var(--muted);">共 ${quizData.length} 题 · 即时反馈 · 不限时间</p>
          <button class="btn primary" id="quiz-start-btn">开始挑战 →</button>
        </div>
      `;
      result.style.display = 'none';
      $('#quiz-start-btn').addEventListener('click', startQuiz);
    }
  }

  /* ================================================================
     (4) 场馆收藏
     ================================================================ */
  function isFavorite(id) {
    try {
      const favs = JSON.parse(localStorage.getItem('redguide_favs') || '[]');
      return favs.includes(String(id));
    } catch (e) { return false; }
  }

  function toggleFavorite(id) {
    try {
      let favs = JSON.parse(localStorage.getItem('redguide_favs') || '[]');
      id = String(id);
      if (favs.includes(id)) favs = favs.filter(f => f !== id);
      else favs.push(id);
      localStorage.setItem('redguide_favs', JSON.stringify(favs));
    } catch (e) { }
  }

  /* ================================================================
     (5) 移动端底部导航栏
     ================================================================ */
  function initMobileNav() {
    if ($('.mobile-nav')) return;

    const bp = (location.pathname.includes('/pages/')) ? '../' : '';
    const current = location.pathname.replace(/\/$/, '');

    function isActive(page) {
      if (page === 'index' && (current.endsWith('/') || current.endsWith('index.html'))) return 'active';
      if (current.includes(page + '.html')) return 'active';
      if (page === 'guide' && current.includes('detail.html')) return 'active';
      return '';
    }

    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.setAttribute('aria-label', '移动端导航');
    nav.innerHTML = `
      <a href="${bp}index.html" class="${isActive('index')}">🏠<span>首页</span></a>
      <a href="${bp}pages/guide.html" class="${isActive('guide')}">📍<span>导览</span></a>
      <a href="${bp}pages/practice.html" class="${isActive('practice')}">🏆<span>实践</span></a>
      <a href="${bp}pages/message.html" class="${isActive('message')}">💬<span>留言</span></a>
      <a href="${bp}pages/policy.html" class="${isActive('policy')}">📰<span>政策</span></a>
    `;
    document.body.appendChild(nav);
  }

  /* ================================================================
     (6) 页面级创新功能入口（首页特色区块）
     ================================================================ */
  /* ================================================================
     (7) 红色记忆时间线
     ================================================================ */
  function initTimeline() {
    if (!(location.pathname.endsWith('/') || location.pathname.endsWith('index.html'))) return;

    const nodes = document.querySelectorAll('.tl-node');
    const detail = document.getElementById('timeline-detail');
    if (!nodes.length || !detail) return;

    const events = {
      '1921': { title: '🌟 中国共产党成立', desc: '1921年7月23日，中共一大在上海开幕，后转移至嘉兴南湖闭幕。中国共产党的成立，是中国历史上开天辟地的大事变。', venues: ['中共一大会址纪念馆', '嘉兴南湖红船'] },
      '1927': { title: '🔫 三大武装起义', desc: '1927年8月1日南昌起义打响第一枪，9月秋收起义创建井冈山根据地，12月广州起义建立城市苏维埃。中国共产党开始独立领导武装斗争。', venues: ['南昌八一起义纪念馆', '井冈山革命博物馆', '广州起义烈士陵园'] },
      '1929': { title: '📜 古田会议', desc: '1929年12月，红四军在福建上杭古田召开第九次党代会，确立"思想建党、政治建军"原则，是人民军队建设史上的里程碑。', venues: ['古田会议会址'] },
      '1931': { title: '⚠️ 九一八事变', desc: '1931年9月18日，日本关东军炸毁南满铁路路轨并嫁祸中国军队，以此为借口发动侵华战争，中国人民14年抗战由此开始。', venues: ['九一八历史博物馆'] },
      '1934': { title: '🚶 长征出发', desc: '1934年10月，中央红军从江西瑞金出发开始长征。湘江战役中红军付出巨大牺牲突破封锁线，为遵义会议的召开创造了条件。', venues: ['井冈山革命博物馆'] },
      '1935': { title: '🏛️ 遵义会议', desc: '1935年1月遵义会议确立了毛泽东的领导地位，挽救了党和红军。5月飞夺泸定桥，10月中央红军到达陕北。', venues: ['遵义会议会址', '泸定桥革命文物陈列馆（泸定桥景区）', '延安革命纪念馆'] },
      '1936': { title: '🎯 长征胜利', desc: '1936年10月，红军三大主力在甘肃会宁胜利会师，历时两年的长征胜利结束，中国革命转危为安。', venues: ['会宁红军长征胜利纪念馆', '六盘山红军长征纪念馆'] },
      '1937': { title: '⚔️ 全面抗战爆发', desc: '1937年7月7日卢沟桥事变，全国抗战开始。八路军深入敌后，以太行山等为根据地开展游击战争。', venues: ['八路军太行纪念馆', '东北烈士纪念馆'] },
      '1945': { title: '🎉 抗战胜利', desc: '1945年8月15日，日本宣布无条件投降，中国人民取得抗日战争的伟大胜利。重庆红岩村见证了南方局的艰苦斗争。', venues: ['红岩革命纪念馆'] },
      '1947': { title: '⚡ 战略反攻', desc: '1947年5月孟良崮战役全歼国民党整编74师，6月刘邓大军挺进大别山，解放战争从战略防御转入战略进攻。', venues: ['孟良崮战役纪念馆', '西柏坡纪念馆'] },
      '1949': { title: '🏛️ 开国大典', desc: '1949年3月七届二中全会在西柏坡召开，10月1日毛泽东在天安门宣告中华人民共和国成立。', venues: ['西柏坡纪念馆', '中国共产党历史展览馆'] },
      '1960': { title: '💪 红旗渠', desc: '20世纪60年代，河南林县人民在太行山悬崖峭壁上历时10年开凿出1500公里的"人工天河"，铸就红旗渠精神。', venues: ['红旗渠纪念馆'] },
      '1964': { title: '🚀 第一颗原子弹', desc: '1964年10月16日，中国第一颗原子弹在青海金银滩爆炸成功，铸就"两弹一星"精神。', venues: ['青海原子城纪念馆'] },
    };

    function showEvent(year) {
      const ev = events[year];
      if (!ev) { detail.style.display = 'none'; return; }

      nodes.forEach(function(n) { n.classList.toggle('active', n.dataset.year === year); });

      var bp = (location.pathname.includes('/pages/')) ? '../' : '';
      var venueLinks = ev.venues.map(function(vn) {
        var v = venuesCache.find(function(x) { return x.name.indexOf(vn) >= 0; });
        var id = v ? v.id : vn;
        return '<a class="tl-venue-link" href="' + bp + 'pages/detail.html?id=' + encodeURIComponent(id) + '">🏛️ ' + vn + '</a>';
      }).join('');

      detail.innerHTML = '<h3>' + ev.title + '</h3><p>' + ev.desc + '</p><div class="tl-venues">' + venueLinks + '</div>';
      detail.style.display = 'block';
    }

    nodes.forEach(function(node) {
      node.addEventListener('click', function() { showEvent(node.dataset.year); });
    });

    // 自动激活第一个
    setTimeout(function() { showEvent('1921'); }, 400);
  }

  function initHomepageInnovation() {
    if (!(location.pathname.endsWith('/') || location.pathname.endsWith('index.html'))) return;

    initTimeline();

    setTimeout(() => {
      const modulesSection = $('#modules');
      if (!modulesSection) return;

      const innovationHTML = `
        <section class="section">
          <div class="section-heading">
            <p class="eyebrow">Innovation</p>
            <h2>创新功能</h2>
            <p>AI赋能红色文旅，打造沉浸式数字学习体验</p>
          </div>
          <div class="feature-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
            <div class="feature-card" style="cursor:pointer;" onclick="document.querySelector('.chat-fab')?.click()">
              <div class="card-icon">🤖</div>
              <span class="card-num">AI</span>
              <h3>AI智能导览助手</h3>
              <p>基于场馆知识库的对话式问答系统，支持场馆搜索、路线推荐、知识问答。</p>
              <span style="color:var(--red);font-size:13px;font-weight:600;">点击体验 →</span>
            </div>
            <div class="feature-card" style="cursor:pointer;" onclick="document.querySelector('.quiz-fab')?.click()">
              <div class="card-icon">🧠</div>
              <span class="card-num">Quiz</span>
              <h3>红色知识挑战赛</h3>
              <p>12道红色历史与场馆知识题，测测你对革命文化的了解程度。</p>
              <span style="color:var(--red);font-size:13px;font-weight:600;">开始挑战 →</span>
            </div>
            <div class="feature-card" style="cursor:pointer;" onclick="document.querySelector('.dark-toggle')?.click()">
              <div class="card-icon">🌓</div>
              <span class="card-num">UI</span>
              <h3>深色/浅色模式</h3>
              <p>一键切换深色模式，保护视力，适配不同阅读环境偏好。</p>
              <span style="color:var(--red);font-size:13px;font-weight:600;">切换模式 →</span>
            </div>
          </div>
        </section>
      `;
      modulesSection.insertAdjacentHTML('afterend', innovationHTML);
    }, 100);
  }

  /* ================================================================
     初始化
     ================================================================ */
  async function initAll() {
    if (window.RedData) {
      venuesCache = await RedData.loadAllVenues();
    } else {
      try {
        const bp = (location.pathname.includes('/pages/')) ? '../' : '';
        const core = await fetch(bp + 'data/venues.json').then(r => r.json()).catch(() => []);
        venuesCache = core;
      } catch (e) {}
    }

    initChatWidget();
    initDarkMode();
    initQuiz();
    initMobileNav();
    initHomepageInnovation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  return { isFavorite, toggleFavorite };
})();