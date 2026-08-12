/* ============================================================
   cz-stamps — 长征手卷站台朱砂印章 SVG 生成（纯函数，零依赖）
   职责：输入站点 → 输出印章 SVG 字符串（站名按字数自适应竖排）
   ============================================================ */

/* 生成单站朱砂印章 SVG（站内文字竖排） */
export function stampSvg(s) {
  const ch = s.name;
  const len = ch.length;
  // 1字:一行；2字:两行各1；3字:左1右2；4字:2x2
  const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="cz-station-svg">
      <defs>
        <filter id="stampTex_${s.id}" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="${s.id * 7}"/>
          <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.04  0 0 0 0 0.04  0 0 0 0.5 0"/>
          <feComposite in2="SourceGraphic" operator="in"/>
          <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge>
        </filter>
      </defs>
      <rect x="5" y="5" width="90" height="90" rx="6" ry="6"
            fill="#b22222" stroke="#6b1111" stroke-width="3.2"
            filter="url(#stampTex_${s.id})" opacity="0.92"/>
      <rect x="11" y="11" width="78" height="78" rx="3" ry="3"
            fill="none" stroke="#fff3c2" stroke-width="1" opacity="0.45"/>
      <g font-family="'STKaiti','KaiTi','FangSong',serif" font-weight="800" fill="#fff3d2"
         text-anchor="middle" dominant-baseline="central">
        ${renderStampText(ch, len)}
      </g>
    </svg>`;
  return svg;
}

export function renderStampText(chars, len) {
  const arr = Array.from(chars);
  if (len === 1) {
    return `<text x="50" y="52" font-size="60">${arr[0]}</text>`;
  }
  if (len === 2) {
    return `<text x="50" y="30" font-size="38">${arr[0]}</text>
              <text x="50" y="72" font-size="38">${arr[1]}</text>`;
  }
  if (len === 3) {
    return `<text x="28" y="52" font-size="42" writing-mode="tb">${arr[0]}</text>
              <text x="68" y="30" font-size="34">${arr[1]}</text>
              <text x="68" y="70" font-size="34">${arr[2]}</text>`;
  }
  // 4字及以上：2列竖排，从左到右（左列先上后下，右列再上后下）
  const left = arr.slice(0, Math.ceil(len / 2));
  const right = arr.slice(Math.ceil(len / 2));
  const topY = 50 - ((left.length - 1) * 22) / 2;
  const fs = len >= 6 ? 26 : 30;
  let out = '';
  left.forEach((c, i) => { out += `<text x="34" y="${topY + i * 22}" font-size="${fs}">${c}</text>`; });
  const topY2 = 50 - ((right.length - 1) * 22) / 2;
  right.forEach((c, i) => { out += `<text x="66" y="${topY2 + i * 22}" font-size="${fs}">${c}</text>`; });
  return out;
}
