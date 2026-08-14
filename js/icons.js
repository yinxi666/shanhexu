/* ============================================================
   红旅单色图标库（SVG 线稿风，24×24，currentColor 跟随主题）
   职责：为 JS 模板提供统一图标；替代 emoji，避免跨平台渲染差异
   用法：icon('pin') → '<svg class="icon" ...>'
   约束：零依赖；被 chat/pages/quiz/mobile-nav 等模板引用
   ============================================================ */

const PATHS = {
  /* 首页 */
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  /* 地图钉：导览/地址/位置 */
  pin: '<path d="M12 21s-6.5-5-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 16 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.4"/>',
  /* 旗帜：长征/红色精神 */
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 3.2L17 10.4H5"/>',
  /* 对话：留言/AI 助手 */
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
  /* 报纸：政策 */
  news: '<path d="M4 5h13v14H4z"/><path d="M17 8h3v11H8"/><path d="M7 9h7M7 13h7M7 17h5"/>',
  /* 奖杯：实践成果 */
  trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4a5 5 0 0 0 4 4.9M17 6h3a5 5 0 0 1-4 4.9"/>',
  /* 书本：历史/知识 */
  book: '<path d="M4 5a2 2 0 0 1 2-2h14v17H6a2 2 0 0 0-2 2z"/><path d="M20 20H6a2 2 0 0 1 0-4"/>',
  /* 卷轴：历史背景 */
  scroll: '<path d="M6 4h13v13a2 2 0 0 1-2 2H6z"/><path d="M6 4v13a2 2 0 0 0 2 2"/><path d="M6 8H4v11a2 2 0 0 0 2 2h13"/>',
  /* 星：成就/亮点 */
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  /* 目标：教育意义 */
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>',
  /* 清单：场馆信息 */
  clipboard: '<path d="M9 4h6v3H9z"/><path d="M7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M9 12h6M9 16h4"/>',
  /* 列表：列表视图 */
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  /* 链接 */
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4.4l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5"/><path d="M14 10a4.5 4.5 0 0 0-6.4-.4L5 12.2a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/>',
  /* 地图：位置信息/地图视图 */
  map: '<path d="M9 4l6 2.5L20 5v15l-5 1.5L9 19l-5 1.5v-15z"/><path d="M9 4v15M14 6.5v15"/>',
  /* 地球：经纬度 */
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5S9.5 5.8 12 3.5z"/>',
  /* 搜索 */
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.4-4.4"/>',
  /* 帮助 */
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.2a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1 .8-1 1.8"/><path d="M12 17h.01"/>',
  /* 心形：点赞（收藏态由 .fav-btn.active 的 CSS fill 区分，无需单独的 outline 图标） */
  heart: '<path d="M12 20s-7-4.6-7-10a4.2 4.2 0 0 1 7-3.2A4.2 4.2 0 0 1 19 10c0 5.4-7 10-7 10z"/>',
  /* 月亮：深色模式 */
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  /* 太阳：浅色模式 */
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19"/>',
  /* 卡片：纪念卡 */
  card: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.5 10h17"/><path d="M7.5 14.5h4"/>',
  /* 笔：留言 */
  pen: '<path d="M4 20l.8-4.5L16 4.3a2 2 0 0 1 2.8 0l.9.9a2 2 0 0 1 0 2.8L8.5 19.2z"/><path d="M14.5 6.5l3 3"/>',
  /* 分享/提交 */
  share: '<path d="M12 3v11"/><path d="M8 6.5L12 3l4 3.5"/><path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/>',
  /* 下载 */
  download: '<path d="M12 4v11"/><path d="M7.5 11L12 15.5 16.5 11"/><path d="M4 19h16"/>',
  /* 星光：生成 */
  sparkle: '<path d="M12 4v16M4 12h16"/><path d="M12 4l1.8 6.2L20 12l-6.2 1.8L12 20l-1.8-6.2L4 12l6.2-1.8z"/>',
  /* 灯泡：提示 */
  bulb: '<path d="M9.5 17.5h5"/><path d="M9 20h6"/><path d="M12 3a6 6 0 0 1 3.5 10.8c-.8.6-1.5 1.2-1.5 2.2h-4c0-1-.7-1.6-1.5-2.2A6 6 0 0 1 12 3z"/>',
  /* 人群：实践团队 */
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.5a3.5 3.5 0 0 1 0 6M18 14.7c1.9.8 3 2.2 3 4.3"/>',
  /* 日历：日期 */
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  /* 打印 */
  print: '<path d="M7 8V3.5h10V8"/><path d="M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="7" y="13.5" width="10" height="7" rx="1"/>',
  /* 音符：音乐开关 */
  note: '<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  'note-off': '<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path d="M4 4l16 16"/>',
  /* 喇叭：环境音 */
  speaker: '<path d="M4 10v4h3l5 4V6l-5 4z"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"/>',
  'speaker-off': '<path d="M4 10v4h3l5 4V6l-5 4z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/>',
  /* 数据：统计 */
  chart: '<path d="M4 20h16"/><path d="M7 20v-6M12 20V6M17 20v-9"/>',
  /* 路线 */
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
  /* 对勾：正确 */
  check: '<path d="M4.5 12.5l5 5L19.5 7"/>',
  /* 循环：重试 */
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 3.5V8h-4.5"/>',
  /* 播放 */
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  /* 场馆建筑 */
  building: '<path d="M4 20h16"/><path d="M6 20V5h9v15"/><path d="M15 9h3v11"/><path d="M8.5 8.5h2M8.5 12h2M8.5 15.5h2M13 12h.01M13 15.5h.01"/>',
  /* 暂停 */
  pause: '<path d="M9 5.5v13M15 5.5v13"/>',
  /* 叉：错误 */
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  /* 左箭头：上一题/返回 */
  'arrow-left': '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  /* 右箭头：下一题/前进 */
  'arrow-right': '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>',
  'arrow-up': '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
};

export function icon(name, cls) {
  const body = PATHS[name] || PATHS.star;
  const clsAttr = ` class="icon${cls ? ' ' + cls : ''}"`;
  return `<svg${clsAttr} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
