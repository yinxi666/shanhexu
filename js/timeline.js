/* ============================================================
   赓续血脉・数绘红旅 — 红色记忆时间线 (Homepage Timeline)
   职责：首页年份时间线 + 事件详情面板（场馆链接）
   约束：依赖 utils(getBasePath) / venue-store(getVenues)；被 homepage.js 引用
   ============================================================ */

import { getBasePath } from './utils.js?v=2026081005';
import { icon } from './icons.js?v=2026081005';
import { getVenues } from './venue-store.js?v=2026081005';

function initTimeline() {
  if (!(location.pathname.endsWith('/') || location.pathname.endsWith('index.html'))) return;

  const nodes = document.querySelectorAll('.tl-node');
  const detail = document.getElementById('timeline-detail');
  if (!nodes.length || !detail) return;

  const events = {
    '1921': { title: '中国共产党成立', desc: '1921年7月23日，中共一大在上海开幕，后转移至嘉兴南湖闭幕。中国共产党的成立，是中国历史上开天辟地的大事变。', venues: ['中共一大会址纪念馆', '嘉兴南湖红船'] },
    '1927': { title: '三大武装起义', desc: '1927年8月1日南昌起义打响第一枪，9月秋收起义创建井冈山根据地，12月广州起义建立城市苏维埃。中国共产党开始独立领导武装斗争。', venues: ['南昌八一起义纪念馆', '井冈山革命博物馆', '广州起义烈士陵园'] },
    '1929': { title: '古田会议', desc: '1929年12月，红四军在福建上杭古田召开第九次党代会，确立"思想建党、政治建军"原则，是人民军队建设史上的里程碑。', venues: ['古田会议会址'] },
    '1931': { title: '九一八事变', desc: '1931年9月18日，日本关东军炸毁南满铁路路轨并嫁祸中国军队，以此为借口发动侵华战争，中国人民14年抗战由此开始。', venues: ['九一八历史博物馆'] },
    '1934': { title: '长征出发', desc: '1934年10月，中央红军从江西瑞金出发开始长征。湘江战役中红军付出巨大牺牲突破封锁线，为遵义会议的召开创造了条件。', venues: ['井冈山革命博物馆'] },
    '1935': { title: '遵义会议', desc: '1935年1月遵义会议确立了毛泽东的领导地位，挽救了党和红军。5月飞夺泸定桥，10月中央红军到达陕北。', venues: ['遵义会议会址', '泸定桥革命文物陈列馆（泸定桥景区）', '延安革命纪念馆'] },
    '1936': { title: '长征胜利', desc: '1936年10月，红军三大主力在甘肃会宁胜利会师，历时两年的长征胜利结束，中国革命转危为安。', venues: ['会宁红军长征胜利纪念馆', '六盘山红军长征纪念馆'] },
    '1937': { title: '全面抗战爆发', desc: '1937年7月7日卢沟桥事变，全国抗战开始。八路军深入敌后，以太行山等为根据地开展游击战争。', venues: ['八路军太行纪念馆', '东北烈士纪念馆'] },
    '1945': { title: '抗战胜利', desc: '1945年8月15日，日本宣布无条件投降，中国人民取得抗日战争的伟大胜利。重庆红岩村见证了南方局的艰苦斗争。', venues: ['红岩革命纪念馆'] },
    '1947': { title: '战略反攻', desc: '1947年5月孟良崮战役全歼国民党整编74师，6月刘邓大军挺进大别山，解放战争从战略防御转入战略进攻。', venues: ['孟良崮战役纪念馆', '西柏坡纪念馆'] },
    '1949': { title: '开国大典', desc: '1949年3月七届二中全会在西柏坡召开，10月1日毛泽东在天安门宣告中华人民共和国成立。', venues: ['西柏坡纪念馆', '中国共产党历史展览馆'] },
    '1960': { title: '红旗渠', desc: '20世纪60年代，河南林县人民在太行山悬崖峭壁上历时10年开凿出1500公里的"人工天河"，铸就红旗渠精神。', venues: ['红旗渠纪念馆'] },
    '1964': { title: '第一颗原子弹', desc: '1964年10月16日，中国第一颗原子弹在青海金银滩爆炸成功，铸就"两弹一星"精神。', venues: ['青海原子城纪念馆'] },
  };

  function showEvent(year) {
    const ev = events[year];
    if (!ev) { detail.classList.add('is-hidden'); return; }

    nodes.forEach(function (n) { n.classList.toggle('active', n.dataset.year === year); });

    const bp = getBasePath();
    const venues = getVenues();
    const venueLinks = ev.venues.map(function (vn) {
      const v = venues.find(function (x) { return (x.name || '').indexOf(vn) >= 0; });
      if (!v) return '<span class="tl-venue-link is-muted">' + icon('building') + ' ' + vn + '</span>';
      return '<a class="tl-venue-link" href="' + bp + 'pages/detail.html?id=' + encodeURIComponent(v.id) + '">' + icon('building') + ' ' + vn + '</a>';
    }).join('');

    detail.innerHTML = '<h3>' + ev.title + '</h3><p>' + ev.desc + '</p><div class="tl-venues">' + venueLinks + '</div>';
    detail.classList.remove('is-hidden');
  }

  nodes.forEach(function (node) {
    node.addEventListener('click', function () { showEvent(node.dataset.year); });
  });

  // 自动激活第一个
  setTimeout(function () { showEvent('1921'); }, 400);
}

export { initTimeline };
