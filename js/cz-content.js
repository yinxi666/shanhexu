/* ============================================================
   长征页 — 内容数据(文物详情/诗词时刻/纪念卡背景，与 longmarch.js 逻辑解耦)
   ============================================================ */

export const RELIC_MAP = {
  1: {
    name: '竹扁担',
    story: '出发前夜，瑞金百姓用竹扁担挑着粮食和草鞋塞到红军战士手里，目送这支队伍踏上漫漫征程。一根扁担，挑起的是苏区人民的全部心意。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M6 20 Q32 12 58 20" stroke="#8a6a38" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M6 20 L2 26 M58 20 L62 26" stroke="#5a3a1a" stroke-width="2.5" stroke-linecap="round"/><path d="M16 22 Q16 30 18 36" stroke="#8a6a38" stroke-width="3" fill="none"/><path d="M48 22 Q48 30 46 36" stroke="#8a6a38" stroke-width="3" fill="none"/><path d="M12 36 Q16 40 20 36 M44 36 Q48 40 52 36" stroke="#6a4a1e" stroke-width="2" fill="none"/><path d="M14 42 L18 44 L14 46 Z" fill="#a8793c"/><path d="M46 42 L50 44 L46 46 Z" fill="#a8793c"/><path d="M20 42 L24 44 L20 46 Z" fill="#a8793c"/><path d="M40 42 L44 44 L40 46 Z" fill="#a8793c"/></svg>`
  },
  2: {
    name: '粗陶粗碗',
    story: '于都百姓把家中仅有的粗瓷碗盛满热茶，塞在红军口袋里，叮嘱一路平安。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M8 22 L56 22 C54 46 44 54 32 54 C20 54 10 46 8 22 Z" fill="#a8793c" stroke="#6a4818" stroke-width="2"/><path d="M8 22 Q32 16 56 22" stroke="#3a2410" stroke-width="2.5" fill="none"/><ellipse cx="32" cy="58" rx="14" ry="3" fill="#6a4818" opacity="0.55"/><path d="M14 28 Q32 24 50 28" stroke="#8b5e20" stroke-width="1.5" fill="none" opacity="0.7"/></svg>`
  },
  3: {
    name: '子弹壳',
    story: '湘江两岸散落着无数弹壳，每一壳都是一次生死的对撞。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="26" y="12" width="12" height="26" rx="6" fill="#d4af37" stroke="#7a5a10" stroke-width="1.8"/><path d="M26 38 L38 38 L40 56 L24 56 Z" fill="#c0392b" stroke="#6e1818" stroke-width="1.8"/><path d="M28 42 L36 42" stroke="#fff3c2" stroke-width="1.2" opacity="0.6"/></svg>`
  },
  4: {
    name: '火把',
    story: '湘江战后士气低沉，通道会议上毛泽东力主转兵西进。会后红军举着火把连夜行军，火光映亮了湘桂边界的山道。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="29" y="32" width="6" height="22" rx="3" fill="#6a4015" stroke="#3a2410" stroke-width="1.5"/><path d="M32 28 Q22 24 26 12 Q28 4 32 2 Q36 4 38 12 Q42 24 32 28 Z" fill="#ffd76e" stroke="#c89a2c" stroke-width="1.5"/><path d="M32 24 Q28 16 32 8 Q34 16 32 24" fill="#ff8c2a"/></svg>`
  },
  5: {
    name: '油印决议',
    story: '黎平会议通过了改变战略方针的正式决议，油印机一张张把它印了出来。这纸薄薄的决议，稳住了彷徨中的红军。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="10" width="40" height="46" rx="3" fill="#f2e6cc" stroke="#8a6a3a" stroke-width="1.8"/><path d="M20 22 L44 22 M20 29 L44 29 M20 36 L36 36" stroke="#6a5a3a" stroke-width="2.4" opacity="0.75" stroke-linecap="round"/><circle cx="44" cy="46" r="7" fill="#c0392b" opacity="0.88"/><path d="M44 41.5 L45.3 44.5 L48.5 44.8 L46 46.8 L46.7 50 L44 48.3 L41.3 50 L42 46.8 L39.5 44.8 L42.7 44.5 Z" fill="#f3d9a4"/></svg>`
  },
  6: {
    name: '竹筏',
    story: '竹筏是乌江天险上唯一的渡具。战士们拼扎竹筏、冒着弹雨抢渡，才撞开了这道被称"固若金汤"的防线。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M6 34 Q32 26 58 34" stroke="#8a6a38" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M6 40 Q32 32 58 40" stroke="#a8793c" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M8 46 Q32 38 56 46" stroke="#8a6a38" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M18 28 L18 50 M40 26 L40 48" stroke="#5a3a1a" stroke-width="3"/><path d="M14 20 Q10 14 8 8" stroke="#5a3a1a" stroke-width="3" stroke-linecap="round" fill="none"/><rect x="4" y="4" width="7" height="14" rx="2.5" fill="#6a4a1e"/></svg>`
  },
  7: {
    name: '老油灯',
    story: '遵义会议的阁楼里，一盏桐油灯彻夜不熄，照亮了生死攸关的抉择。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="56" rx="20" ry="4" fill="#4a2a10" opacity="0.5"/><path d="M20 48 L44 48 L40 32 L24 32 Z" fill="#8b5a20" stroke="#3a2410" stroke-width="2"/><rect x="28" y="20" width="8" height="14" fill="#6a4015" stroke="#3a2410" stroke-width="1.5"/><circle cx="32" cy="14" r="6" fill="#ffd76e" stroke="#c89a2c" stroke-width="1.5"/><path d="M32 8 Q28 2 32 0 Q36 2 32 8" fill="#ff8c2a"/></svg>`
  },
  8: {
    name: '草鞋',
    story: '一双草鞋，走过四渡赤水的千里迂回。红军就是穿着这样的草鞋，牵着数十万敌军在川黔滇的群山间打转。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 Q10 20 28 18 Q46 16 54 26 Q60 34 56 42 Q50 50 32 50 Q16 50 10 40 Z" fill="#c4a26a" stroke="#6a4a1e" stroke-width="2"/><path d="M22 24 L26 44 M32 22 L32 46 M42 24 L38 44 M48 30 L43 40" stroke="#8a6a38" stroke-width="2" opacity="0.7"/><path d="M22 48 L26 54 L32 56 L36 52" stroke="#5a3a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
  },
  9: {
    name: '木船桨',
    story: '皎平渡的船工们撑着木桨，七天七夜用七只小船把三万红军渡过金沙江。桨声里，数十万追兵被甩在了身后。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M18 6 L40 30" stroke="#8a5a2e" stroke-width="5" stroke-linecap="round"/><path d="M40 30 Q46 28 50 32 Q52 38 46 42 Q40 44 36 38 L34 32 Q36 28 40 30 Z" fill="#a8793c" stroke="#5a3a1a" stroke-width="1.8"/><path d="M18 6 L18 16" stroke="#6a4015" stroke-width="2" opacity="0.6"/></svg>`
  },
  10: {
    name: '渡河木船',
    story: '安顺场渡口的木船小得只能载十几人。十七名勇士就是划着这样的船，在惊涛骇浪中强渡大渡河。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M8 40 Q32 28 56 40 L48 52 L16 52 Z" fill="#a8793c" stroke="#5a3a1a" stroke-width="2" stroke-linejoin="round"/><path d="M8 40 Q32 34 56 40" stroke="#6a4015" stroke-width="1.5" fill="none"/><path d="M16 50 L48 50" stroke="#7a4a1e" stroke-width="1.5" opacity="0.5"/><path d="M14 42 L4 28 M50 42 L60 28" stroke="#8a5a2e" stroke-width="3" stroke-linecap="round"/><path d="M8 22 Q4 16 8 12 Q12 16 8 22 Z" fill="#ffd76e" opacity="0.85"/></svg>`
  },
  11: {
    name: '铁链扣',
    story: '泸定桥十三根铁索，每一环都被勇士的鲜血浸过。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="20" r="8" fill="none" stroke="#444" stroke-width="6"/><circle cx="32" cy="44" r="8" fill="none" stroke="#444" stroke-width="6"/><rect x="28" y="12" width="8" height="16" fill="#555"/><rect x="28" y="36" width="8" height="16" fill="#555"/><circle cx="32" cy="20" r="5" fill="none" stroke="#8b5a20" stroke-width="2" opacity="0.8"/><circle cx="32" cy="44" r="5" fill="none" stroke="#8b5a20" stroke-width="2" opacity="0.8"/></svg>`
  },
  12: {
    name: '半条皮带',
    story: '翻过夹金山时，战士们把皮带切条煮食，半条皮带就是三天的口粮。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M10 30 Q10 16 30 16 Q50 16 56 32 Q60 48 36 50 Q22 51 18 44 L22 40 Q26 45 36 44 Q52 42 50 30 Q46 20 30 20 Q18 20 16 32" fill="#5a3a1a" stroke="#2a1808" stroke-width="2"/><circle cx="44" cy="28" r="2.5" fill="#2a1808"/><circle cx="40" cy="26" r="2" fill="#2a1808"/></svg>`
  },
  13: {
    name: '会师军号',
    story: '会师的号角在懋功达维桥畔吹响，红一方面军与红四方面军的指战员紧紧握手。号声中，两大主力从此并肩作战。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M10 32 Q28 22 44 26 L54 16 L54 40 L44 30 Q28 36 10 32 Z" fill="#d4af37" stroke="#7a5a10" stroke-width="2" stroke-linejoin="round"/><circle cx="10" cy="32" r="4.5" fill="#c0392b" stroke="#6e1818" stroke-width="1.5"/><path d="M8 30 L2 28 M8 34 L2 36" stroke="#7a5a10" stroke-width="1.8" stroke-linecap="round"/><path d="M54 16 L60 14 M54 40 L60 42" stroke="#7a5a10" stroke-width="2"/></svg>`
  },
  14: {
    name: '野菜囊',
    story: '过草地七天，红军战士靠采食灰灰菜、野葱、牛皮充饥，走出死亡地带。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M18 22 L46 22 L48 54 Q32 62 16 54 Z" fill="#c4a26a" stroke="#5a4018" stroke-width="2"/><path d="M24 22 Q32 14 40 22 L40 26 Q32 20 24 26 Z" fill="#6a8b3a" stroke="#3a5018" stroke-width="1.8"/><path d="M22 30 L42 30 M20 38 L44 38 M22 46 L42 46" stroke="#6a4015" stroke-width="1" opacity="0.6"/></svg>`
  },
  15: {
    name: '苗族砍刀',
    story: '苗族小战士"云贵川"腰间别着砍刀，徒手攀上腊子口绝壁。正是这把刀劈开的天险，为红军打开了北上通道。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M36 8 L60 40 Q54 48 44 46 L20 18 Q28 8 36 8 Z" fill="#9aa5b1" stroke="#4a5560" stroke-width="2" stroke-linejoin="round"/><path d="M22 16 L12 12 L14 26 L26 20" fill="#5a3a1a" stroke="#3a2410" stroke-width="1.5" stroke-linejoin="round"/><path d="M42 18 L48 26" stroke="#d7dee4" stroke-width="1.6" opacity="0.8"/><path d="M14 26 L18 40" stroke="#3a2410" stroke-width="1.5" opacity="0.6"/></svg>`
  },
  16: {
    name: '会师红旗',
    story: '会宁城头红旗漫卷，红一、二、四方面军在这里胜利会师。这面旗，宣告了二万五千里长征的胜利结束。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M14 52 L14 8 L54 20 L14 32" fill="#c0392b" stroke="#6e1818" stroke-width="2" stroke-linejoin="round"/><path d="M28 11 L30.1 17.1 L36.6 17.2 L31.4 21.1 L33.3 27.3 L28 23.6 L22.7 27.3 L24.6 21.1 L19.4 17.2 L25.9 17.1 Z" fill="#ffd76e" stroke="#c89a2c" stroke-width="0.8"/><path d="M14 52 L54 52" stroke="#4a2a10" stroke-width="3" stroke-linecap="round"/></svg>`
  },
  17: {
    name: '八角帽',
    story: '延安的窑洞前，一顶顶红星八角帽下是一张张写满坚毅的脸。',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M10 44 Q10 24 32 20 Q54 24 54 44 L48 48 L16 48 Z" fill="#4a6b3a" stroke="#1e3218" stroke-width="2"/><path d="M20 44 L44 44 L44 48 L20 48 Z" fill="#2e4422" stroke="#1e3218" stroke-width="1.5"/><circle cx="32" cy="32" r="5" fill="#c0392b" stroke="#6e1818" stroke-width="1.5"/><path d="M32 27 L33.5 30.5 L37 30.8 L34.5 33.2 L35.3 36.5 L32 34.5 L28.7 36.5 L29.5 33.2 L27 30.8 L30.5 30.5 Z" fill="#ffd76e"/></svg>`
  }
};

export const POEM_MOMENTS = {
  3: { text: '苍山如海，残阳如血', src: '《忆秦娥·娄山关》' },
  7: { text: '雄关漫道真如铁，\n而今迈步从头越', src: '《忆秦娥·娄山关》' },
  8: { text: '乌蒙磅礴走泥丸', src: '《七律·长征》' },
  9: { text: '金沙水拍云崖暖', src: '《七律·长征》' },
  11: { text: '大渡桥横铁索寒', src: '《七律·长征》' },
  12: { text: '更喜岷山千里雪', src: '《七律·长征》' },
  14: { text: '万水千山只等闲', src: '《七律·长征》' },
  16: { text: '今日长缨在手，\n何时缚住苍龙？', src: '《清平乐·六盘山》' },
  17: { text: '星星之火，可以燎原', src: '毛泽东语录' },
};

export const CZ_CARD_BGS = [
  { label: '延安', src: 'images/longmarch/yanan.jpg' },
  { label: '瑞金', src: 'images/longmarch/ruijin.jpg' },
  { label: '遵义', src: 'images/longmarch/zunyi.jpg' },
  { label: '泸定桥', src: 'images/longmarch/luding.jpg' },
  { label: '雪山', src: 'images/longmarch/jiajinshan.jpg' },
  { label: '草地', src: 'images/longmarch/caodi.jpg' },
  { label: '湘江', src: 'images/longmarch/xiangjiang.jpg' },
  { label: '会宁', src: 'images/longmarch/huining.jpg' },
];
