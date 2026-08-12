/* ============================================================
   guide-map — 全国导览页 Leaflet 地图子系统（自包含工厂）
   职责：高德瓦片地图初始化、五角星 marker 绘制、卡片 hover 高亮联动
   依赖：utils(escapeHtml/escapeAttr/getBasePath)；Leaflet 由 guide.html
         以 <script defer> 静态加载（自托管 assets/leaflet/，window.L）
   ============================================================ */

import { escapeHtml, escapeAttr, getBasePath } from './utils.js?v=2026081309';

export function createGuideMap(mapContainer) {
  let leafletMap = null;
  let venueMarkerMap = {}; // venue.id → marker 映射
  let userMoved = false;   // 用户手动缩放/平移后，筛选不再强制 fitBounds 重置视口

  async function initMap() {
    if (leafletMap) return;
    // guide.html 已通过 <script defer> 静态加载 Leaflet（同一 CDN），此处无需再动态注入兜底
    if (!window.L || !mapContainer) return;
    leafletMap = L.map(mapContainer, {
      center: [35, 110],
      zoom: 3.4,
      minZoom: 3.4,
      maxBounds: [[10, 60], [55, 155]],
      maxBoundsViscosity: 0.8
    });
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
      attribution: '© 高德地图'
    }).addTo(leafletMap);
    // 用户主动缩放/平移后不再自动复位视口
    leafletMap.on('zoomstart dragstart', () => { userMoved = true; });
  }

  // 容器尺寸变化（窗口 resize / 移动端切换显隐）后纠正 Leaflet 视口，防瓦片错位或空白
  function invalidateSize() {
    if (leafletMap) leafletMap.invalidateSize();
  }
  window.addEventListener('resize', () => invalidateSize());

  function isReady() {
    return !!leafletMap;
  }

  // 五角星 marker（highlight 切换金色高亮态，其余参数一致）
  function makeIcon(highlight) {
    return L.divIcon({
      className: highlight ? 'red-star-marker marker-highlight' : 'red-star-marker',
      html: '<div class="rsm-inner"><svg width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 20,12 31,13 23,20 25,30 16,24 7,30 9,20 1,13 12,12" fill="' + (highlight ? '#e8a820' : '#b91c1c') + '" stroke="' + (highlight ? '#b91c1c' : '#7f1d1d') + '" stroke-width="' + (highlight ? '0.8' : '0.5') + '"/></svg><div class="rsm-shadow"></div></div>',
      iconSize: highlight ? [38, 45] : [32, 38],
      iconAnchor: highlight ? [19, 43] : [16, 36],
      popupAnchor: highlight ? [0, -43] : [0, -38]
    });
  }

  function plotVenuesOnMap(filteredVenues) {
    if (!leafletMap) return;
    // 先收集再移除，避免在 eachLayer 迭代过程中修改 _layers 集合导致部分 marker 残留
    const staleMarkers = [];
    leafletMap.eachLayer(layer => {
      if (layer instanceof L.Marker) staleMarkers.push(layer);
    });
    staleMarkers.forEach(layer => leafletMap.removeLayer(layer));
    venueMarkerMap = {};
    const withCoords = filteredVenues.filter(function (v) { return v.coordinates && v.coordinates.lat && v.coordinates.lng; });
    if (withCoords.length === 0) return;

    const defIcon = makeIcon(false);
    const hlIcon = makeIcon(true);

    withCoords.forEach(function (v) {
      const marker = L.marker([v.coordinates.lat, v.coordinates.lng], { icon: defIcon })
        .bindPopup('<b>' + escapeHtml(v.name) + '</b><br>' + escapeHtml(v.province) + ' ' + escapeHtml(v.city || '') + '<br><a href="' + escapeAttr(getBasePath() + 'pages/detail.html?id=' + encodeURIComponent(v.id)) + '">查看详情 →</a>');
      marker.addTo(leafletMap);
      venueMarkerMap[String(v.id)] = { marker: marker, def: defIcon, hl: hlIcon };
    });

    const allMarkers = Object.values(venueMarkerMap).map(function (m) { return m.marker; });
    if (allMarkers.length > 0 && !userMoved) {
      const group = L.featureGroup(allMarkers);
      leafletMap.fitBounds(group.getBounds().pad(0.15), { maxZoom: 6 });
    }
  }

  function highlightMarker(venueId) {
    Object.keys(venueMarkerMap).forEach(function (k) {
      venueMarkerMap[k].marker.setIcon(venueMarkerMap[k].def);
      venueMarkerMap[k].marker.setZIndexOffset(0);
    });
    const entry = venueMarkerMap[String(venueId)];
    if (entry) {
      entry.marker.setIcon(entry.hl);
      entry.marker.setZIndexOffset(1000);
    }
  }

  return { initMap, isReady, plotVenuesOnMap, highlightMarker, invalidateSize };
}
