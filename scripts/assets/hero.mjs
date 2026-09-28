// Hero: никнейм печатается и стирается разными шрифтами, курсор идёт по реальной ширине глифов.
import { C, F, layout, text, doc, grid, measure, pathData, r2 } from '../lib/kit.mjs';

const W = 1000;
const H = 440;
const NICK = 'Cyber2077';

const FONTS = [
  { file: 'Unbounded-ExtraBold', label: 'Unbounded ExtraBold' },
  { file: 'Monoton', label: 'Monoton' },
  { file: 'PlayfairDisplay-BlackItalic', label: 'Playfair Display Black Italic' },
  { file: 'PressStart2P', label: 'Press Start 2P' },
  { file: 'RubikGlitch', label: 'Rubik Glitch' },
  { file: 'PermanentMarker', label: 'Permanent Marker' },
  { file: 'Orbitron-Black', label: 'Orbitron Black' },
  { file: 'MajorMonoDisplay', label: 'Major Mono Display' },
  { file: 'BungeeShade', label: 'Bungee Shade' },
  { file: 'JetBrainsMono-ExtraBold', label: 'JetBrains Mono ExtraBold' },
];

// тайминги, секунды
const TYPE = 0.085;
const HOLD = 1.5;
const DEL = 0.035;
const GAP = 0.3;
const BASE = 248; // базовая линия ника
const CAP = 92; // целевая высота заглавных
const MAXW = 820;

export function hero() {
  const N = NICK.length;
  const slot = N * TYPE + HOLD + N * DEL + GAP;
  const T = slot * FONTS.length;
  const pc = (t) => `${Math.min(100, Math.max(0, +((t / T) * 100).toFixed(3)))}%`;

  let css = '';
  let words = '';
  let glitches = '';
  let glyphDefs = '';
  let labels = '';
  const cursorFrames = [];

  FONTS.forEach((fdef, i) => {
    const s = i * slot;
    // размер: одинаковая высота заглавных, но не шире MAXW
    const f = layout(NICK, fdef.file, 100).font;
    const capRatio = (f.tables.os2.sCapHeight || f.ascender * 0.7) / f.unitsPerEm;
    let size = CAP / capRatio;
    const w100 = measure(NICK, fdef.file, 100);
    size = Math.min(size, (MAXW / w100) * 100);
    const L = layout(NICK, fdef.file, size);
    const x0 = (W - L.width) / 2;
    const advAfter = (j) => (j + 1 < N ? L.items[j + 1].x : L.width);

    const typedEnd = s + N * TYPE;
    const holdEnd = typedEnd + HOLD;

    cursorFrames.push([s, x0]);
    L.items.forEach((it, j) => {
      const on = s + (j + 1) * TYPE;
      const off = holdEnd + (N - 1 - j) * DEL;
      const d = pathData(it.glyph.getPath(x0 + it.x, BASE, size).commands);
      const k = `c${i}_${j}`;
      css += `@keyframes ${k}{0%{opacity:0}${pc(on)}{opacity:1}${pc(off)}{opacity:0}}.${k}{animation-name:${k}}`;
      glyphDefs += `<path id="${k}" d="${d}"/>`;
      words += `<use class="ch ${k}" href="#${k}"/>`;
      cursorFrames.push([on, x0 + advAfter(j)]);
      cursorFrames.push([off, x0 + it.x]);
    });

    // глитч-вспышка в момент, когда слово допечатано
    const full = L.items.map((_, j) => `<use href="#c${i}_${j}"/>`).join('');
    const g = `g${i}`;
    const g1 = typedEnd + 0.02;
    const g2 = typedEnd + HOLD * 0.55;
    css += `@keyframes ${g}{0%{opacity:0}${pc(g1)}{opacity:.9}${pc(g1 + 0.09)}{opacity:0}${pc(g2)}{opacity:.7}${pc(g2 + 0.06)}{opacity:0}}.${g}{animation-name:${g}}`;
    glitches += `<g class="ch ${g}"><g fill="${C.cyan}" transform="translate(-5 0)">${full}</g><g fill="${C.magenta}" transform="translate(5 1)">${full}</g></g>`;

    // подпись со шрифтом
    const lk = `l${i}`;
    css += `@keyframes ${lk}{0%{opacity:0}${pc(s)}{opacity:1}${pc(s + slot)}{opacity:0}}.${lk}{animation-name:${lk}}`;
    const idx = `${String(i + 1).padStart(2, '0')} / ${String(FONTS.length).padStart(2, '0')}`;
    const pre = 'font-family: ';
    const name = `"${fdef.label}"`;
    const wPre = measure(pre, F.mono, 13);
    const wName = measure(name, F.mono, 13);
    const wIdx = measure(idx, F.mono, 13);
    const total = wIdx + 24 + wPre + wName;
    const lx = (W - total) / 2;
    labels +=
      `<g class="ch ${lk}">` +
      text(idx, { font: F.mono, size: 13, x: lx, y: 300, fill: C.muted }) +
      `<rect x="${r2(lx + wIdx + 11)}" y="290" width="1" height="13" fill="${C.line2}"/>` +
      text(pre, { font: F.mono, size: 13, x: lx + wIdx + 24, y: 300, fill: C.muted }) +
      text(name, { font: F.mono, size: 13, x: lx + wIdx + 24 + wPre, y: 300, fill: C.cyan }) +
      `</g>`;
  });

  cursorFrames.sort((a, b) => a[0] - b[0]);
  css += `@keyframes cur{${cursorFrames.map(([t, x]) => `${pc(t)}{transform:translateX(${r2(x)}px)}`).join('')}}`;

  const ch = `.ch{opacity:0;animation-duration:${r2(T)}s;animation-iteration-count:infinite;animation-timing-function:step-end}`;

  // бегущая строка внизу
  const ticker = 'REACT  ◆  TYPESCRIPT  ◆  THREE.JS  ◆  GSAP  ◆  REACT NATIVE  ◆  EXPO  ◆  FIGMA  ◆  MOTION DESIGN  ◆  WEBGL  ◆  C# / .NET  ◆  ';
  const tw = measure(ticker.replace(/◆/g, '*'), F.mono, 12, { tracking: 1.5 });
  const tickerRow = (x) => text(ticker.replace(/◆/g, '•'), { font: F.mono, size: 12, x, y: 419, fill: C.muted, tracking: 1.5 });

  const g = grid(W, H, 40, 'hg', { opacity: 0.06, cy: 0.5 });

  const style = `${ch}${css}
.cursor{animation:cur ${r2(T)}s infinite step-end}
.blink{animation:blink 1s infinite step-end}
@keyframes blink{50%{opacity:0}}
.orb1{animation:orb1 14s ease-in-out infinite alternate}
.orb2{animation:orb2 18s ease-in-out infinite alternate}
@keyframes orb1{to{transform:translate(160px,60px)}}
@keyframes orb2{to{transform:translate(-180px,-40px)}}
.scan{animation:scan 7s linear infinite}
@keyframes scan{from{transform:translateY(-40px)}to{transform:translateY(${H}px)}}
.tick{animation:tick 40s linear infinite}
@keyframes tick{to{transform:translateX(-${r2(tw)}px)}}
.pulse{animation:pulse 2s ease-in-out infinite}
@keyframes pulse{50%{opacity:.25}}`;

  const defs = `${g.defs}${glyphDefs}
<clipPath id="hc"><rect width="${W}" height="${H}" rx="28"/></clipPath>
<clipPath id="tc"><rect x="0" y="396" width="${W}" height="44"/></clipPath>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
<filter id="glow" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="8"/><feComponentTransfer result="b"><feFuncA type="linear" slope=".75"/></feComponentTransfer><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0"/></filter>
<linearGradient id="word" x1="110" y1="0" x2="890" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="${C.cyan}"/><stop offset=".5" stop-color="#F2F2F7"/><stop offset="1" stop-color="${C.magenta}"/></linearGradient>
<linearGradient id="scanG" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse"><stop stop-color="${C.cyan}" stop-opacity="0"/><stop offset="1" stop-color="${C.cyan}" stop-opacity=".07"/></linearGradient>
<linearGradient id="fadeX" x1="0" x2="1"><stop stop-color="${C.ink}"/><stop offset=".08" stop-color="${C.ink}" stop-opacity="0"/><stop offset=".92" stop-color="${C.ink}" stop-opacity="0"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>`;

  const bracket = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 22}V${y}H${x + sx * 22}" stroke="${C.cyan}" stroke-width="2"/>`;

  const body = `<g clip-path="url(#hc)">
<rect width="${W}" height="${H}" fill="${C.ink}"/>
<g filter="url(#blur)" opacity=".55">
  <circle class="orb1" cx="220" cy="120" r="170" fill="${C.cyan}" opacity=".35"/>
  <circle class="orb2" cx="800" cy="330" r="190" fill="${C.magenta}" opacity=".32"/>
  <circle cx="560" cy="60" r="120" fill="${C.violet}" opacity=".3"/>
</g>
${g.svg}
<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".07"/>
<rect class="scan" width="${W}" height="40" fill="url(#scanG)"/>

${text('CYBER07200', { font: F.monoBold, size: 12, x: 48, y: 58, fill: C.text, tracking: 2 })}
${text('/ PORTFOLIO · 2026', { font: F.mono, size: 12, x: 48 + measure('CYBER07200', F.monoBold, 12, { tracking: 2 }) + 10, y: 58, fill: C.muted, tracking: 2 })}
<circle class="pulse" cx="${W - 48 - measure('SYSTEM ONLINE', F.mono, 12, { tracking: 2 }) - 14}" cy="54" r="4" fill="${C.lime}"/>
${text('SYSTEM ONLINE', { font: F.mono, size: 12, x: W - 48, y: 58, fill: C.text2, tracking: 2, anchor: 'end' })}

<g filter="url(#glow)">
  <g style="mix-blend-mode:screen" opacity=".85">${glitches}</g>
  <g fill="url(#word)">${words}</g>
</g>
<g class="cursor"><rect class="blink" x="6" y="${BASE - CAP - 8}" width="6" height="${CAP + 16}" fill="${C.cyan}"/></g>
${labels}

${text('Frontend & Creative Developer  ·  UI/UX Designer', { font: F.bodyBold, size: 21, x: W / 2, y: 356, fill: C.text2, anchor: 'middle' })}

<rect y="396" width="${W}" height="1" fill="${C.line}"/>
<g clip-path="url(#tc)"><g class="tick"><g id="tk">${tickerRow(0)}</g><use href="#tk" x="${r2(tw)}"/><use href="#tk" x="${r2(tw * 2)}"/></g></g>
<rect y="396" width="${W}" height="44" fill="url(#fadeX)"/>
</g>
${bracket(20, 20, 1, 1)}${bracket(W - 20, 20, -1, 1)}${bracket(20, H - 20, 1, -1)}${bracket(W - 20, H - 20, -1, -1)}
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="27.5" stroke="${C.line2}"/>`;

  return doc({
    w: W,
    h: H,
    title: 'Cyber2077 — Frontend & Creative Developer, UI/UX Designer',
    desc: 'Никнейм Cyber2077 печатается и стирается десятью разными шрифтами.',
    style,
    defs,
    body,
  });
}
