/* ============================================================
   赓续血脉・数绘红旅 — 首页热力图 (Home Heatmap)
   职责：ECharts 中国地图热力图，加载失败自动降级 SVG
   数据：全国红色旅游经典景区名录(发改社会〔2016〕2662号，共300处)分省统计
   约束：依赖 utils(getBasePath) / version(ASSET_VERSION)；被 pages.initHomePage 引用
   ============================================================ */

import { getBasePath } from './utils.js?v=2026081307';
import { OFFICIAL_ATTRACTIONS, PROVINCE_NAMES } from './heatmap-data.js?v=2026081307';
import { ASSET_VERSION } from './version.js?v=2026081307';

/* 读取 CSS 令牌（含深色覆盖后的计算值），供 ECharts/SVG 主题适配 */
function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch (e) { return fallback; }
}
function isDark() {
  return document.documentElement.classList.contains('dark');
}
/* 主题适配色：从令牌读取，深色模式下不再渲染成整块白板 */
function heatmapTheme() {
  const dark = isDark();
  return {
    dark,
    areaColor: dark ? cssVar('--card-bg', '#1e293b') : '#f8fafc',
    labelColor: cssVar('--muted', '#64748b'),
    borderColor: cssVar('--line', '#e5e7eb'),
    accent: cssVar('--red', '#b91c1c'),
    tooltipBg: dark ? cssVar('--card-bg', '#1e293b') : 'rgba(255,255,255,0.95)',
    tooltipText: dark ? cssVar('--ink', '#f1f5f9') : '#374151',
    shapeFill: dark ? cssVar('--line', '#334155') : '#ffffff',
    legendBg: dark ? cssVar('--line', '#334155') : '#f1f5f9',
  };
}
let _chinaMapPromise = null;
function loadChinaMap() {
  if (!_chinaMapPromise) {
    _chinaMapPromise = fetch(getBasePath() + 'data/china.json?v=' + ASSET_VERSION)
      .then(function (r) { return r.json(); })
      .catch(function (e) { _chinaMapPromise = null; throw e; });
  }
  return _chinaMapPromise;
}


// 首页热力图 - ECharts中国地图，加载失败自动降级SVG
async function initHomeHeatmap() {
  const container = document.getElementById('home-heatmap');
  if (!container) return;

  // 用官方名录分省数据构建(港澳台补 0)，ECharts 完整地图与内联 SVG 降级两条渲染路径共用同一份数据
  const provinceData = { ...OFFICIAL_ATTRACTIONS, '香港特别行政区': 0, '澳门特别行政区': 0, '台湾省': 0 };

  // 等待ECharts加载后初始化（最多约15秒，超时降级SVG，避免无限轮询）
  let echartsRetries = 0;
  const ECHARTS_MAX_RETRIES = 50; // 50 × 300ms ≈ 15s
  function tryInit() {
    if (window.echarts) {
      initECharts(container, provinceData);
    } else if (echartsRetries < ECHARTS_MAX_RETRIES) {
      echartsRetries++;
      setTimeout(tryInit, 300);
    } else {
      createSimpleHeatmap(container, provinceData);
    }
  }
  setTimeout(tryInit, 200);
}

async function initECharts(container, provinceData) {
  const chartData = PROVINCE_NAMES.map(name => ({
    name: name,
    value: provinceData[name] || 0
  }));

  try {
    const mapData = await loadChinaMap();
    if (!echarts.getMap('china')) echarts.registerMap('china', mapData);

    const exist = echarts.getInstanceByDom(container);
    if (exist) exist.dispose();
    const chart = echarts.init(container);
    applyHeatmapOption(chart, chartData, provinceData);

    // 缩放按钮（实例无关：点击时按当前实例操作，dispose 后不残留旧 chart 引用）
    bindHeatmapZoomBar();

    window.addEventListener('resize', function () {
      const c = echarts.getInstanceByDom(container);
      if (c) c.resize();
    });

    // 深色/浅色切换时重渲染（ECharts 不会自动响应 html.dark 类）
    const mo = new MutationObserver(function () {
      const c = echarts.getInstanceByDom(container);
      if (c) applyHeatmapOption(c, chartData, provinceData);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  } catch (error) {
    createSimpleHeatmap(container, provinceData);
  }
}

function applyHeatmapOption(chart, chartData, provinceData) {
  const t = heatmapTheme();
  const option = {
    backgroundColor: 'transparent',  // 交给页面背景（--bg），深色下不再硬编码白底
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        return `<div class="map-tooltip-name">${params.name}</div>
                  <div class="map-tooltip-count">景区数量：<span class="map-tooltip-value">${params.value}</span></div>`;
      },
      backgroundColor: t.tooltipBg,
      borderColor: t.borderColor,
      borderWidth: 1,
      textStyle: { color: t.tooltipText }
    },
    visualMap: {
      min: 0,
      max: Math.max(...Object.values(provinceData)),
      left: 'left',
      top: 'bottom',
      text: ['多', '少'],
      inRange: {
        color: ['#fef3c7', '#fde68a', '#fca5a5', '#f87171', '#ef4444', '#b91c1c']
      },
      textStyle: { color: t.labelColor }
    },
    series: [{
      name: '红色旅游景区数量',
      type: 'map',
      map: 'china',
      // 触屏设备允许双指缩放（roam:'move' 只允许拖拽，手机上无法手势缩放）；
      // 桌面保持 move-only，避免滚轮误缩放
      roam: ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) ? true : 'move',
      zoom: 1.7,
      center: [105, 36],
      scaleLimit: { min: 1, max: 5 },
      label: {
        show: true,
        fontSize: window.innerWidth < 768 ? 7 : 10,
        color: t.labelColor
      },
      emphasis: {
        label: {
          show: true,
          fontSize: window.innerWidth < 768 ? 10 : 12,
          fontWeight: 'bold',
          color: t.accent
        },
        focus: 'none'
      },
      data: chartData,
      itemStyle: {
        borderColor: t.borderColor,
        borderWidth: 0.5,
        areaColor: t.areaColor
      }
    }]
  };
  chart.setOption(option);
}

function bindHeatmapZoomBar() {
  const bar = document.getElementById('heatmap-zoom-bar');
  if (!bar || bar.dataset.bound) return;
  bar.dataset.bound = '1';
  bar.addEventListener('click', function (e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const container = document.getElementById('home-heatmap');
    const chart = container && echarts.getInstanceByDom(container);
    if (!chart) return;
    const a = btn.dataset.zoom;
    if (a === 'reset') { chart.setOption({ series: [{ zoom: 1.7, center: [105, 36] }] }); return; }
    const opt = chart.getOption();
    const cz = opt.series[0].zoom || 1.7;
    const cc = opt.series[0].center || [105, 36];
    // 钳制与 scaleLimit {min:1, max:5} 一致（此前 8x/0.5x 超出声明范围）
    const nz = a === 'in' ? Math.min(5, cz + 1) : Math.max(1, cz - 1);
    chart.setOption({ series: [{ zoom: nz, center: cc }] });
  });
}

function createSimpleHeatmap(container, provinceData) {
  // SVG 降级路径无缩放能力：隐藏缩放条，避免"点了没反应"的僵尸控件
  const zoomBar = document.getElementById('heatmap-zoom-bar');
  if (zoomBar) zoomBar.classList.add('is-hidden');
  const t = heatmapTheme();  // 深色模式下 SVG 也用令牌色，不再硬编码浅色
  const provinceMap = {
    '黑龙江': { x: 85, y: 55 }, '吉林': { x: 105, y: 65 }, '辽宁': { x: 125, y: 70 },
    '内蒙古': { x: 95, y: 90 }, '北京': { x: 135, y: 85 }, '天津': { x: 142, y: 90 },
    '河北': { x: 138, y: 95 }, '山西': { x: 128, y: 100 }, '山东': { x: 150, y: 105 },
    '河南': { x: 142, y: 115 }, '江苏': { x: 155, y: 105 }, '安徽': { x: 148, y: 115 },
    '浙江': { x: 165, y: 100 }, '福建': { x: 175, y: 110 }, '江西': { x: 158, y: 120 },
    '上海': { x: 162, y: 100 }, '湖北': { x: 145, y: 125 }, '湖南': { x: 152, y: 135 },
    '广东': { x: 172, y: 135 }, '广西': { x: 162, y: 145 }, '海南': { x: 175, y: 160 },
    '重庆': { x: 135, y: 130 }, '四川': { x: 120, y: 130 }, '贵州': { x: 140, y: 135 },
    '云南': { x: 138, y: 150 }, '西藏': { x: 85, y: 135 }, '陕西': { x: 115, y: 105 },
    '甘肃': { x: 95, y: 115 }, '青海': { x: 100, y: 130 }, '宁夏': { x: 105, y: 110 },
    '新疆': { x: 45, y: 100 }
  };

  const fullNameMap = {
    '北京': ['北京市'], '天津': ['天津市'], '河北': ['河北省'], '山西': ['山西省'],
    '内蒙古': ['内蒙古自治区'], '辽宁': ['辽宁省'], '吉林': ['吉林省'], '黑龙江': ['黑龙江省'],
    '上海': ['上海市'], '江苏': ['江苏省'], '浙江': ['浙江省'], '安徽': ['安徽省'],
    '福建': ['福建省'], '江西': ['江西省'], '山东': ['山东省'], '河南': ['河南省'],
    '湖北': ['湖北省'], '湖南': ['湖南省'], '广东': ['广东省'], '广西': ['广西壮族自治区'],
    '海南': ['海南省'], '重庆': ['重庆市'], '四川': ['四川省'], '贵州': ['贵州省'],
    '云南': ['云南省'], '西藏': ['西藏自治区'], '陕西': ['陕西省'], '甘肃': ['甘肃省'],
    '青海': ['青海省'], '宁夏': ['宁夏回族自治区'], '新疆': ['新疆维吾尔自治区']
  };

  const maxVenues = Math.max(...Object.values(provinceData), 1);
  let svgContent = '';

  for (const [shortName, pos] of Object.entries(provinceMap)) {
    let count = 0;
    if (provinceData[shortName]) count = provinceData[shortName];
    else if (fullNameMap[shortName]) {
      fullNameMap[shortName].forEach(fn => {
        if (provinceData[fn]) count += provinceData[fn];
      });
    }
    const intensity = count / maxVenues;
    const radius = Math.max(10, count * 4 + 10);
    let color = '#e5e7eb';
    if (intensity > 0.6) color = '#b91c1c';
    else if (intensity > 0.4) color = '#ef4444';
    else if (intensity > 0.2) color = '#f87171';
    else if (intensity > 0) color = '#fca5a5';

    svgContent += `
        <g transform="translate(${pos.x}, ${pos.y})">
          <circle cx="0" cy="0" r="${radius}" fill="${color}" opacity="0.8" />
          <text x="0" y="-${radius + 8}" text-anchor="middle" font-size="7" fill="${t.labelColor}">${shortName}</text>
          <text x="0" y="4" text-anchor="middle" font-size="10" font-weight="bold" fill="${count > 0 ? t.shapeFill : t.labelColor}">${count}</text>
        </g>
      `;
  }

  container.innerHTML = `
      <svg viewBox="0 0 200 180" class="mini-map-svg">
        <rect x="0" y="0" width="200" height="180" fill="${t.areaColor}" rx="8" />
        <path d="M40,80 L60,60 L70,80 L60,100 L40,80" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M70,50 L95,40 L105,55 L95,70 L70,60" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M105,50 L125,45 L135,55 L125,70 L105,65" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M125,55 L145,50 L155,60 L145,75 L125,70" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M70,80 L95,70 L105,85 L95,100 L70,90" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M105,80 L130,75 L140,85 L130,100 L105,95" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M130,80 L155,75 L165,85 L155,100 L130,95" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M95,95 L120,90 L130,100 L120,115 L95,110" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M120,95 L145,90 L155,100 L145,115 L120,110" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M145,95 L165,90 L175,100 L165,115 L145,110" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M115,110 L140,105 L150,115 L140,130 L115,125" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M140,110 L165,105 L175,115 L165,130 L140,125" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M125,125 L150,120 L160,130 L150,145 L125,140" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M65,105 L90,100 L100,110 L90,125 L65,120" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M90,115 L115,110 L125,120 L115,135 L90,130" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        <path d="M115,125 L140,120 L150,130 L140,145 L115,140" fill="${t.shapeFill}" stroke="${t.borderColor}" stroke-width="1" opacity="0.5" />
        ${svgContent}
        <rect x="10" y="155" width="180" height="18" rx="4" fill="${t.legendBg}" stroke="${t.borderColor}" />
        <text x="18" y="167" font-size="9" fill="${t.labelColor}">景区数量：</text>
        <rect x="65" y="159" width="100" height="10" rx="2" fill="url(#legendGradient)" />
        <text x="65" y="176" font-size="7" fill="${t.labelColor}">少</text>
        <text x="158" y="176" font-size="7" fill="${t.labelColor}">多</text>
        <defs>
          <linearGradient id="legendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#fef3c7" />
            <stop offset="50%" stop-color="#f87171" />
            <stop offset="100%" stop-color="#b91c1c" />
          </linearGradient>
        </defs>
      </svg>
    `;
}

export { initHomeHeatmap };
