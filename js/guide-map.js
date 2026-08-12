/* ============================================================
   guide-map — 全国导览页 Leaflet 地图子系统（自包含工厂）
   职责：高德瓦片地图初始化、五角星 marker 绘制、卡片 hover 高亮联动
   依赖：utils(escapeHtml/escapeAttr/getBasePath)；Leaflet 由 guide.html
         以 <script defer> 静态加载（window.L）
   ============================================================ */

import { escapeHtml, escapeAttr, getBasePath } from './utils.js?v=2026081016';

export function createGuideMap(mapContainer) {
  let leafletMap = null;
  let venueMarkerMap = {}; // venue.id → marker 映射

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
  }

  function isReady() {
    return !!leafletMap;
  }

  // 默认五角星 marker
  function makeDefaultIcon() {
    return L.divIcon({
      className: 'red-star-marker',
      html: '<div class="rsm-inner"><svg width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 20,12 31,13 23,20 25,30 16,24 7,30 9,20 1,13 12,12" fill="#b91c1c" stroke="#7f1d1d" stroke-width="0.5"/></svg><div class="rsm-shadow"></div></div>',
      iconSize: [32, 38],
      iconAnchor: [16, 36],
      popupAnchor: [0, -38]
    });
  }

  // 金色高亮 marker
  function makeHighlightIcon() {
    return L.divIcon({
      className: 'red-star-marker marker-highlight',
      html: '<div class="rsm-inner"><svg width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 20,12 31,13 23,20 25,30 16,24 7,30 9,20 1,13 12,12" fill="#e8a820" stroke="#b91c1c" stroke-width="0.8"/></svg><div class="rsm-shadow"></div></div>',
      iconSize: [38, 45],
      iconAnchor: [19, 43],
      popupAnchor: [0, -43]
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

    const defIcon = makeDefaultIcon();
    const hlIcon = makeHighlightIcon();

    withCoords.forEach(function (v) {
      const marker = L.marker([v.coordinates.lat, v.coordinates.lng], { icon: defIcon })
        .bindPopup('<b>' + escapeHtml(v.name) + '</b><br>' + escapeHtml(v.province) + ' ' + escapeHtml(v.city || '') + '<br><a href="' + escapeAttr(getBasePath() + 'pages/detail.html?id=' + encodeURIComponent(v.id)) + '">查看详情 →</a>');
      marker.addTo(leafletMap);
      venueMarkerMap[String(v.id)] = { marker: marker, def: defIcon, hl: hlIcon };
    });

    const allMarkers = Object.values(venueMarkerMap).map(function (m) { return m.marker; });
    if (allMarkers.length > 0) {
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

  return { initMap, isReady, plotVenuesOnMap, highlightMarker };
}
