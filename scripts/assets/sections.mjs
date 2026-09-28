// Заголовки секций, bento «Обо мне», кнопки связи, подвал.
import { C, F, text, textPath, paragraph, measure, doc, frame, grid, chips, r2 } from '../lib/kit.mjs';

// ---------- заголовок секции: тёмная и светлая версии ----------
const THEMES = {
  dark: { title: C.text, muted: C.muted, line: C.line2, accent: C.cyan },
  light: { title: '#0B0C12', muted: '#6B6F86', line: '#D5D7E2', accent: '#0098B3' },
};

export function sectionHeader(num, title, kicker, theme = 'dark') {
  const t = THEMES[theme];
  const W = 1000;
  const H = 96;
  const numP = textPath(num, F.display, 44, 0, 70);
  const tx = numP.width + 22;
  const titleW = measure(title, F.display, 28);
  const lineX = tx + titleW + 28;
  const body = `
<path d="${numP.d}" fill="none" stroke="${t.accent}" stroke-width="1.2"/>
${text(kicker, { font: F.mono, size: 12, x: tx, y: 36, fill: t.muted, tracking: 1.5 })}
${text(title, { font: F.display, size: 28, x: tx, y: 70, fill: t.title })}
<rect x="${r2(lineX)}" y="60" width="${r2(W - lineX - 8)}" height="1" fill="${t.line}"/>
<rect class="run" x="${r2(lineX)}" y="59" width="56" height="3" rx="1.5" fill="url(#run)"/>
<rect x="${W - 8}" y="56" width="8" height="8" fill="${t.accent}"/>`;
  return doc({
    w: W,
    h: H,
    title: `${num} — ${title}`,
    style: `.run{animation:run 3.2s cubic-bezier(.6,0,.2,1) infinite}@keyframes run{from{transform:translateX(0);opacity:0}15%{opacity:1}85%{opacity:1}to{transform:translateX(${r2(W - lineX - 72)}px);opacity:0}}`,
    defs: `<linearGradient id="run" x1="0" x2="1"><stop stop-color="${t.accent}" stop-opacity="0"/><stop offset="1" stop-color="${t.accent}"/></linearGradient>`,
    body,
  });
}

// ---------- bento «Обо мне» ----------
export function about() {
  const W = 1000;
  const H = 600;
  const G = 14;
  let defs = '';
  let body = '';

  const tile = (id, x, y, w, h, opts = {}) => {
    const f = frame(w, h, { id, r: 20, ticks: false, ...opts });
    defs += f.defs;
    return (inner) => `<g transform="translate(${x} ${y})">${f.back}${inner}${f.front}</g>`;
  };
  const kicker = (s, x, y, color = C.muted) => text(s, { font: F.mono, size: 11, x, y, fill: color, tracking: 1.5 });

  // A — манифест
  const aW = 590;
  const aH = 330;
  const A = tile('ta', 0, 0, aW, aH, { glow: C.cyan, glow2: C.magenta });
  const head = ['Проектирую', 'и программирую', 'интерфейсы,'];
  let headSvg = head.map((l, i) => text(l, { font: F.display, size: 30, x: 32, y: 96 + i * 40, fill: C.text })).join('');
  headSvg += `<path d="${textPath('которые ощущаются', F.display, 30, 32, 216).d}" fill="url(#hl)"/>`;
  defs += `<linearGradient id="hl" x1="32" x2="${32 + measure('которые ощущаются', F.display, 30)}" gradientUnits="userSpaceOnUse"><stop stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.magenta}"/></linearGradient>`;
  const par = paragraph(
    'Frontend- и creative-разработчик с глазом дизайнера. Сам собираю макет в Figma, выношу его в токены, верстаю на React и оживляю моушеном, 3D и шейдерами.',
    { x: 32, y: 262, width: aW - 64, size: 15, lineHeight: 1.55 },
  );
  body += A(kicker('// ОБО МНЕ', 32, 46) + headSvg + par.svg);

  // B — процесс Figma → код
  const bX = aW + G;
  const bW = W - bX;
  const B = tile('tb', bX, 0, bW, aH, { glow: C.violet, glow2: C.cyan });
  const steps = [
    ['Figma', 'макет и прототип', C.magenta],
    ['Tokens', 'цвет, шрифт, отступы', C.violet],
    ['React', 'компоненты + TS', C.cyan],
    ['Motion', 'GSAP, 3D, шейдеры', C.lime],
  ];
  const nx = 32;
  const ny0 = 74;
  const step = 58;
  let flow = `<path id="flowPath" d="M${nx + 18} ${ny0 + 18}V${ny0 + 18 + step * 3}" stroke="${C.line2}" stroke-dasharray="3 5"/>`;
  flow += `<circle r="12" fill="${C.cyan}" opacity=".18"><animateMotion dur="3.6s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.85;1" calcMode="linear"><mpath href="#flowPath"/></animateMotion></circle>`;
  flow += `<circle r="4" fill="${C.cyan}"><animateMotion dur="3.6s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.85;1" calcMode="linear"><mpath href="#flowPath"/></animateMotion></circle>`;
  steps.forEach(([name, sub, col], i) => {
    const y = ny0 + i * step;
    flow +=
      `<rect x="${nx}" y="${y}" width="36" height="36" rx="10" fill="${C.surface2}" stroke="${col}" stroke-opacity=".6"/>` +
      text(String(i + 1), { font: F.monoBold, size: 14, x: nx + 18, y: y + 23, fill: col, anchor: 'middle' }) +
      text(name, { font: F.bodyBold, size: 17, x: nx + 54, y: y + 16, fill: C.text }) +
      text(sub, { font: F.body, size: 13, x: nx + 54, y: y + 34, fill: C.muted });
  });
  body += B(kicker('// ПРОЦЕСС', 32, 46) + flow + text('от макета до 60 fps', { font: F.mono, size: 11, x: bW - 28, y: 46, fill: C.muted, anchor: 'end', tracking: 1 }));

  // C, D, E — факты из проектов
  const rowY = aH + G;
  const cH = 176;
  const cW = (W - G * 2) / 3;
  const facts = [
    ['4D', 'Настоящее SO(4)-вращение тессеракта и 4D-лабиринт в браузере', 'DIMENSION'],
    ['76', 'автотестов в камере-приложении: от SQLite до GPU-шейдера плёнки', 'POCKET FILM'],
    ['14+', 'инструментов в одном умном поле: JSON, JWT, URL, цвет, время', 'INSTRUMENTUM'],
  ];
  facts.forEach(([big, cap, src], i) => {
    const x = i * (cW + G);
    const T = tile(`tf${i}`, r2(x), rowY, r2(cW), cH, { glow: [C.cyan, C.magenta, C.lime][i], glow2: C.violet });
    const bigP = textPath(big, F.display, 52, 26, 92);
    const p = paragraph(cap, { x: 26, y: 126, width: cW - 52, size: 13.5, lineHeight: 1.5 });
    body += T(
      text(src, { font: F.mono, size: 10.5, x: cW - 24, y: 36, fill: C.muted, anchor: 'end', tracking: 1.5 }) +
        `<path d="${bigP.d}" fill="url(#big${i})"/>` +
        p.svg,
    );
    defs += `<linearGradient id="big${i}" x1="26" x2="${26 + bigP.width}" gradientUnits="userSpaceOnUse"><stop stop-color="${C.text}"/><stop offset="1" stop-color="${[C.cyan, C.magenta, C.lime][i]}"/></linearGradient>`;
  });

  // F — «сейчас»
  const nY = rowY + cH + G;
  const nH = H - nY;
  const N = tile('tn', 0, nY, W, nH, { glow: C.lime, glow2: C.cyan });
  const nowText = 'Мобильная разработка на React Native + Expo: плёночные шейдеры на Skia и приложение на Supabase';
  body += N(
    `<circle class="pulse" cx="34" cy="${nH / 2}" r="5" fill="${C.lime}"/><circle class="ring" cx="34" cy="${nH / 2}" r="5" stroke="${C.lime}"/>` +
      text('СЕЙЧАС', { font: F.monoBold, size: 12, x: 52, y: nH / 2 + 4.5, fill: C.text, tracking: 2 }) +
      text(nowText, { font: F.body, size: 14.5, x: 136, y: nH / 2 + 5, fill: C.text2 }),
  );

  return doc({
    w: W,
    h: H,
    title: 'Обо мне',
    desc: 'Проектирую и программирую интерфейсы, которые ощущаются. Процесс: Figma → токены → React → моушен.',
    style: `.pulse{animation:pulse 2s ease-in-out infinite}@keyframes pulse{50%{opacity:.35}}
.ring{transform-box:fill-box;transform-origin:center;animation:ring 2s ease-out infinite}@keyframes ring{from{transform:scale(1);opacity:.8}to{transform:scale(3.2);opacity:0}}`,
    defs,
    body,
  });
}

// ---------- кнопки связи ----------
const ICONS = {
  telegram: `<path d="M3 11.5 21 4l-3 16-5.5-4.5L9 19l-.5-5.5L18 7 7.5 12.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  mail: `<rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  code: `<path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
};

export function button(label, sub, icon, color) {
  const W = 320;
  const H = 76;
  const f = frame(W, H, { id: 'b', r: 38, ticks: false, glow: color, glow2: color });
  const body = `${f.back}
<circle cx="38" cy="38" r="22" fill="${C.surface2}" stroke="${color}" stroke-opacity=".5"/>
<g transform="translate(26 26)" color="${color}">${ICONS[icon]}</g>
${text(label, { font: F.bodyBold, size: 17, x: 74, y: 35, fill: C.text })}
${text(sub, { font: F.mono, size: 11.5, x: 74, y: 54, fill: C.muted })}
<g class="arr"><path d="M${W - 46} 43l10-10m0 0h-8m8 0v8" stroke="${C.text2}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>
${f.front}`;
  return doc({
    w: W,
    h: H,
    title: `${label}: ${sub}`,
    style: `.arr{animation:arr 2.4s ease-in-out infinite}@keyframes arr{50%{transform:translate(3px,-3px)}}`,
    defs: f.defs,
    body,
  });
}

// ---------- подвал ----------
export function footer() {
  const W = 1000;
  const H = 250;
  const f = frame(W, H, { id: 'ft', r: 28, glow: C.magenta, glow2: C.cyan });
  const g = grid(W, H, 32, 'fg', { opacity: 0.05, cy: 0.5 });
  const l1 = 'Давайте сделаем интерфейс,';
  const l2 = 'который запомнят';
  const p2 = textPath(l2, F.display, 34, W / 2, 146, { anchor: 'middle' });
  const body = `${f.back}${g.svg}
${text('// ОТКРЫТ К ПРЕДЛОЖЕНИЯМ', { font: F.mono, size: 12, x: W / 2, y: 52, fill: C.muted, anchor: 'middle', tracking: 2 })}
${text(l1, { font: F.display, size: 34, x: W / 2, y: 102, fill: C.text, anchor: 'middle' })}
<path d="${p2.d}" fill="url(#fgrad)"/>
<rect x="${W / 2 - 160}" y="176" width="320" height="1" fill="${C.line2}"/>
<rect class="sweep" x="${W / 2 - 160}" y="175" width="80" height="3" rx="1.5" fill="url(#sw)"/>
${text('Cyber2077  ·  2026  ·  нарисовано в SVG вручную, обновляется GitHub Actions', { font: F.mono, size: 11.5, x: W / 2, y: 214, fill: C.muted, anchor: 'middle', tracking: 0.5 })}
${f.front}`;
  return doc({
    w: W,
    h: H,
    title: 'Давайте сделаем интерфейс, который запомнят',
    style: `.sweep{animation:sw 3s ease-in-out infinite alternate}@keyframes sw{to{transform:translateX(240px)}}`,
    defs: `${f.defs}${g.defs}
<linearGradient id="fgrad" x1="${p2.x0}" x2="${p2.x0 + p2.width}" gradientUnits="userSpaceOnUse"><stop stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}"/></linearGradient>
<linearGradient id="sw" x1="0" x2="1"><stop stop-color="${C.cyan}" stop-opacity="0"/><stop offset=".5" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.magenta}" stop-opacity="0"/></linearGradient>`,
    body,
  });
}

export { chips };
