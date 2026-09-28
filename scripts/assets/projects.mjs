// Карточки проектов: у каждой своя анимированная иллюстрация, нарисованная кодом.
import { C, F, text, textPath, paragraph, measure, doc, frame, chips, r2 } from '../lib/kit.mjs';

const W = 480;
const H = 350;
const IW = W - 24; // область иллюстрации
const IH = 188;

const n1 = (v) => Math.round(v * 10) / 10;

// ---------- 1. DIMENSION: тессеракт, двойное вращение в 4D ----------
function tesseract() {
  const V = [];
  for (let i = 0; i < 16; i++) V.push([0, 1, 2, 3].map((b) => ((i >> b) & 1 ? 1 : -1)));
  const E = [];
  for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) if (!((i >> b) & 1)) E.push([i, i | (1 << b), b]);

  const cx = IW / 2;
  const cy = IH / 2 + 4;
  let S = 36;
  const project = (v, t) => {
    let [x, y, z, w] = v;
    // XW и YZ — одновременное (двойное) вращение
    const a = t;
    const b = t * 2;
    [x, w] = [x * Math.cos(a) - w * Math.sin(a), x * Math.sin(a) + w * Math.cos(a)];
    [y, z] = [y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b)];
    const k4 = 2.6 / (2.6 - w * 0.9);
    x *= k4; y *= k4; z *= k4;
    // фиксированный наклон камеры
    const rx = 0.45;
    const ry = 0.6;
    [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
    const k3 = 6 / (6 - z);
    return [cx + x * k3 * S, cy + y * k3 * S];
  };

  // подгоняем масштаб так, чтобы фигура целиком помещалась во всех кадрах
  let ext = 0;
  for (let f = 0; f < 72; f++) for (const v of V) {
    const [px, py] = project(v, (f / 72) * Math.PI * 2);
    ext = Math.max(ext, Math.abs(px - cx) / (IW / 2 - 60), Math.abs(py - cy) / (IH / 2 - 12));
  }
  S /= ext;
  const FR = 72;
  const framesA = [];
  const framesB = [];
  const dots = [];
  for (let f = 0; f <= FR; f++) {
    const t = (f / FR) * Math.PI * 2;
    const P = V.map((v) => project(v, t));
    const seg = (e) => `M${n1(P[e[0]][0])} ${n1(P[e[0]][1])}L${n1(P[e[1]][0])} ${n1(P[e[1]][1])}`;
    framesA.push(E.filter((e) => e[2] !== 3).map(seg).join(''));
    framesB.push(E.filter((e) => e[2] === 3).map(seg).join(''));
    dots.push(P);
  }
  const DUR = '16s';
  const anim = (vals) => `<animate attributeName="d" dur="${DUR}" repeatCount="indefinite" values="${vals.join(';')}"/>`;
  const vertexDots = [0, 5, 10, 15]
    .map(
      (i) =>
        `<circle r="3" fill="${C.text}"><animate attributeName="cx" dur="${DUR}" repeatCount="indefinite" values="${dots.map((P) => n1(P[i][0])).join(';')}"/><animate attributeName="cy" dur="${DUR}" repeatCount="indefinite" values="${dots.map((P) => n1(P[i][1])).join(';')}"/></circle>`,
    )
    .join('');

  return {
    defs: `<filter id="tglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="tbg" cx=".5" cy=".5" r=".6"><stop stop-color="${C.violet}" stop-opacity=".22"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>`,
    svg: `<rect width="${IW}" height="${IH}" fill="url(#tbg)"/>
<g filter="url(#tglow)" stroke-linecap="round">
<path d="${framesA[0]}" stroke="${C.cyan}" stroke-width="1.4">${anim(framesA)}</path>
<path d="${framesB[0]}" stroke="${C.magenta}" stroke-width="1.4" stroke-opacity=".9">${anim(framesB)}</path>
${vertexDots}
</g>
${text('SO(4) · XW + YZ', { font: F.mono, size: 10, x: 16, y: IH - 16, fill: C.muted, tracking: 1 })}
${text('x  y  z  w', { font: F.mono, size: 10, x: IW - 16, y: IH - 16, fill: C.muted, anchor: 'end', tracking: 1 })}`,
  };
}

// ---------- 2. NOVA PHOTO: ирисовая диафрагма ----------
function aperture() {
  const cx = IW / 2;
  const cy = IH / 2;
  const R = 66;
  const N = 7;
  const blades = (a) => {
    const rot = (1 - a) * 1.1;
    const r = R * a;
    const P = [...Array(N)].map((_, i) => {
      const ang = (i / N) * Math.PI * 2 + rot;
      return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    });
    return P.map((p, i) => {
      const q = P[(i + 1) % N];
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const far = [q[0] + ux * R * 2.2, q[1] + uy * R * 2.2];
      const out = (pt) => {
        const vx = pt[0] - cx;
        const vy = pt[1] - cy;
        const l = Math.hypot(vx, vy) || 1;
        return [pt[0] + (vx / l) * R * 2, pt[1] + (vy / l) * R * 2];
      };
      const pts = [p, far, out(far), out(p)];
      return `M${pts.map((v) => `${n1(v[0])} ${n1(v[1])}`).join('L')}Z`;
    }).join('');
  };
  const FR = 36;
  const vals = [];
  for (let f = 0; f <= FR; f++) {
    const t = f / FR;
    const e = 0.5 - 0.5 * Math.cos(t * Math.PI * 2); // 0→1→0
    vals.push(blades(0.82 - e * 0.62));
  }
  let ticks = '';
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r1 = R + 20;
    const r2_ = R + (i % 6 === 0 ? 29 : 25);
    ticks += `M${n1(cx + r1 * Math.cos(a))} ${n1(cy + r1 * Math.sin(a))}L${n1(cx + r2_ * Math.cos(a))} ${n1(cy + r2_ * Math.sin(a))}`;
  }
  const fstops = ['1.4', '2', '2.8', '4', '5.6', '8', '11', '16'];
  return {
    defs: `<clipPath id="lens"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
<radialGradient id="light" cx=".5" cy=".5" r=".5"><stop stop-color="#FFFFFF"/><stop offset=".35" stop-color="${C.cyan}"/><stop offset=".75" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.ink}"/></radialGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
    css: `.ring{transform-origin:${cx}px ${cy}px;animation:ringr 20s linear infinite}@keyframes ringr{to{transform:rotate(360deg)}}`,
    svg: `<circle cx="${cx}" cy="${cy}" r="${R + 36}" fill="${C.surface}" stroke="${C.line2}"/>
<g class="ring"><path d="${ticks}" stroke="${C.muted}" stroke-width="1"/></g>
<circle cx="${cx}" cy="${cy}" r="${R + 14}" fill="#0A0A10" stroke="${C.line2}"/>
<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#light)"/>
<g clip-path="url(#lens)"><path d="${vals[0]}" fill="#15161F" stroke="#2E3150" stroke-width="1"><animate attributeName="d" dur="7s" repeatCount="indefinite" values="${vals.join(';')}"/></path>
<ellipse cx="${cx - 22}" cy="${cy - 26}" rx="30" ry="14" fill="url(#glass)" transform="rotate(-30 ${cx - 22} ${cy - 26})"/></g>
${fstops.map((s, i) => text(`f/${s}`, { font: F.mono, size: 10, x: 22, y: 30 + i * 18, fill: i === 0 ? C.text : C.muted })).join('')}
${text('35 mm', { font: 'PlayfairDisplay-BlackItalic', size: 26, x: IW - 20, y: 44, fill: C.text, anchor: 'end' })}
${text('ISO 100 · 1/250', { font: F.mono, size: 10, x: IW - 20, y: IH - 18, fill: C.muted, anchor: 'end', tracking: 1 })}`,
  };
}

// ---------- 3. POCKET FILM: бегущая плёнка с разными «плёночными» грейдами ----------
function film() {
  const fw = 118;
  const fh = 80;
  const gap = 14;
  const y0 = 50;
  const stripH = fh + 44;
  const looks = [
    ['#FF9E5E', '#FFD27A', '#3A1E2E', '#5B2A3B'], // тёплая
    ['#1FB5C9', '#F6B26B', '#0F2A33', '#1D4A55'], // teal & orange
    ['#E9E9EE', '#9A9AA8', '#26262E', '#3C3C46'], // ч/б
    ['#C9A8FF', '#FFC4E1', '#2B2346', '#43346A'], // пастель
    ['#00E5FF', '#D7FF3A', '#062A2F', '#0C4A40'], // кросс-процесс
    ['#FF2E88', '#FF9E5E', '#2A0B1E', '#4A1231'], // закат
  ];
  let defs = '';
  let frames = '';
  looks.forEach(([sky1, sky2, m1, m2], i) => {
    const x = i * (fw + gap);
    defs += `<linearGradient id="sky${i}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient>`;
    const sunX = x + 26 + ((i * 37) % 60);
    frames += `<g><rect x="${x}" y="${y0}" width="${fw}" height="${fh}" rx="3" fill="url(#sky${i})"/>
<circle cx="${sunX}" cy="${y0 + 30}" r="11" fill="#FFF7E6" opacity=".85"/>
<path d="M${x} ${y0 + fh}L${x} ${y0 + 52}L${x + 30} ${y0 + 36}L${x + 58} ${y0 + 56}L${x + 84} ${y0 + 40}L${x + fw} ${y0 + 58}V${y0 + fh}Z" fill="${m2}"/>
<path d="M${x} ${y0 + fh}V${y0 + 64}L${x + 40} ${y0 + 54}L${x + 76} ${y0 + 66}L${x + fw} ${y0 + 60}V${y0 + fh}Z" fill="${m1}"/>
${text(`${12 + i}`, { font: F.mono, size: 8.5, x: x + 4, y: y0 - 7, fill: '#F2B45A' })}
${text(`▸ ${12 + i}A`, { font: F.mono, size: 8.5, x: x + fw - 4, y: y0 + fh + 15, fill: '#F2B45A', anchor: 'end' })}</g>`;
  });
  const loopW = looks.length * (fw + gap);
  let holes = '';
  for (let x = 4; x < loopW; x += 16) {
    holes += `<rect x="${x}" y="${y0 - 34}" width="8" height="10" rx="2" fill="${C.ink}"/><rect x="${x}" y="${y0 + fh + 24}" width="8" height="10" rx="2" fill="${C.ink}"/>`;
  }
  const strip = `<g id="strip"><rect x="-4" y="${y0 - 40}" width="${loopW + 8}" height="${stripH + 36}" fill="#1B130B"/>${holes}${frames}
${text('POCKET 400', { font: F.monoBold, size: 8.5, x: 140, y: y0 + fh + 15, fill: '#F2B45A', tracking: 2 })}</g>`;
  return {
    defs: `${defs}<linearGradient id="leak" x1="0" x2="1"><stop stop-color="#FF6A3D" stop-opacity="0"/><stop offset="1" stop-color="#FF6A3D" stop-opacity=".35"/></linearGradient>
<linearGradient id="fedge" x1="0" x2="1"><stop stop-color="${C.surface}"/><stop offset=".12" stop-color="${C.surface}" stop-opacity="0"/><stop offset=".88" stop-color="${C.surface}" stop-opacity="0"/><stop offset="1" stop-color="${C.surface}"/></linearGradient>`,
    css: `.roll{animation:roll 22s linear infinite}@keyframes roll{to{transform:translateX(-${loopW}px)}}`,
    svg: `<rect width="${IW}" height="${IH}" fill="${C.surface}"/>
<g transform="rotate(-4 ${IW / 2} ${IH / 2})"><g class="roll">${strip}<use href="#strip" x="${loopW}"/></g></g>
<rect x="${IW - 120}" width="120" height="${IH}" fill="url(#leak)"/>
<rect width="${IW}" height="${IH}" fill="url(#fedge)"/>`,
  };
}

// ---------- 4. INSTRUMENTUM: умное поле само определяет тип данных ----------
function smartInput() {
  const samples = [
    ['{"name":"Cyber","ok":true}', 'JSON', C.cyan, ['valid · без ошибок', '2 ключа · 26 B', 'pretty · minify']],
    ['eyJhbGciOiJIUzI1NiJ9.eyJzdWIi', 'JWT', C.magenta, ['alg: HS256', 'typ: JWT', 'payload: sub']],
    ['#FF2E88', 'COLOR', C.lime, ['rgb(255, 46, 136)', 'hsl(334, 100%, 59%)', '']],
    ['1790553600', 'UNIX', C.violet, ['2026-09-28 00:00 UTC', 'понедельник', 'ISO 8601']],
  ];
  const TYPE = 0.055;
  const HOLD = 2.2;
  const slotLen = (s) => s.length * TYPE + HOLD + 0.4;
  const T = samples.reduce((a, s) => a + slotLen(s[0]), 0);
  const pc = (t) => `${Math.min(100, Math.max(0, +((t / T) * 100).toFixed(3)))}%`;
  const bx = 18;
  const by = 30;
  const bw = IW - 36;
  const bh = 46;
  const tx = bx + 40;
  const size = 14;
  const adv = measure('M', F.mono, size);
  let css = `.sl{opacity:0;animation-duration:${r2(T)}s;animation-iteration-count:infinite;animation-timing-function:step-end}`;
  let svg = '';
  let t0 = 0;
  const defs = `<clipPath id="field"><rect x="${bx + 1}" y="${by + 1}" width="${bw - 2}" height="${bh - 2}" rx="11"/></clipPath>`;
  samples.forEach(([str, type, col, lines], i) => {
    const dur = slotLen(str);
    const typed = t0 + str.length * TYPE;
    const k = `s${i}`;
    css += `@keyframes ${k}{0%{opacity:0}${pc(t0)}{opacity:1}${pc(t0 + dur)}{opacity:0}}.${k}{animation-name:${k}}`;
    // «шторка», которая сдвигается посимвольно — эффект печати
    const cov = `v${i}`;
    let fr = `0%{transform:translateX(0)}`;
    for (let j = 0; j <= str.length; j++) fr += `${pc(t0 + j * TYPE)}{transform:translateX(${r2(j * adv)}px)}`;
    css += `@keyframes ${cov}{${fr}}.${cov}{animation:${cov} ${r2(T)}s infinite step-end}`;
    const r = `r${i}`;
    css += `@keyframes ${r}{0%{opacity:0}${pc(typed + 0.15)}{opacity:1}${pc(t0 + dur)}{opacity:0}}.${r}{animation-name:${r}}`;
    const chipW = measure(type, F.monoBold, 11, { tracking: 1 }) + 22;
    let read = lines
      .filter(Boolean)
      .map((l, j) => text(l, { font: F.mono, size: 12, x: bx + 16, y: by + bh + 38 + j * 22, fill: j ? C.muted : C.text2 }))
      .join('');
    if (type === 'COLOR') {
      read += ['#FFD0E4', '#FF8CBF', '#FF2E88', '#C4115F', '#7A0A3A']
        .map((c, j) => `<rect x="${bx + 16 + j * 34}" y="${by + bh + 76}" width="28" height="28" rx="7" fill="${c}"/>`)
        .join('');
    }
    svg += `<g class="sl ${k}">
${text(str.length > 30 ? str.slice(0, 30) : str, { font: F.mono, size, x: tx, y: by + bh / 2 + 5, fill: C.text })}
<g clip-path="url(#field)"><g class="${cov}"><rect x="${tx - 1}" y="${by + 8}" width="${bw}" height="${bh - 16}" fill="${C.surface2}"/><rect x="${tx - 1}" y="${by + 12}" width="2" height="${bh - 24}" fill="${col}"/></g></g>
<g class="sl ${r}"><rect x="${bx + bw - chipW - 10}" y="${by + 12}" width="${r2(chipW)}" height="22" rx="11" fill="${col}"/>
${text(type, { font: F.monoBold, size: 11, x: bx + bw - chipW - 10 + 11, y: by + 27, fill: C.ink, tracking: 1 })}${read}</g></g>`;
    t0 += dur;
  });
  const kbd = (label, x) => `<rect x="${x}" y="${IH - 34}" width="${measure(label, F.mono, 10) + 14}" height="20" rx="5" fill="${C.surface2}" stroke="${C.line2}"/>${text(label, { font: F.mono, size: 10, x: x + 7, y: IH - 20, fill: C.muted })}`;
  return {
    css,
    svg: `<rect width="${IW}" height="${IH}" fill="${C.surface}"/>
<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="12" fill="${C.surface2}" stroke="${C.line2}"/>
${text('›', { font: F.monoBold, size: 18, x: bx + 16, y: by + bh / 2 + 6, fill: C.cyan })}
${svg}
${kbd('Ctrl', IW - 150)}${text('+', { font: F.mono, size: 10, x: IW - 106, y: IH - 20, fill: C.muted })}${kbd('K', IW - 94)}
${text('14 tools', { font: F.mono, size: 10, x: IW - 18, y: IH - 20, fill: C.muted, anchor: 'end' })}`,
    defs,
  };
}

// ---------- 5. AvoraLab: холст Figma, выделение, инспектор ----------
function figma() {
  const fx = 20;
  const fy = 34;
  const fw = 272;
  const fh = 138;
  // элементы макета: [x, y, w, h, fill, rx, name]
  const els = [
    [fx + 14, fy + 12, 44, 8, '#16172A', 2, 'Logo'],
    [fx + 18, fy + 38, 132, 14, '#16172A', 3, 'Heading'],
    [fx + 18, fy + 58, 104, 14, '#16172A', 3, 'Heading'],
    [fx + 18, fy + 82, 118, 6, '#9A9CB0', 3, 'Text'],
    [fx + 18, fy + 104, 70, 20, C.magenta, 10, 'Button'],
    [fx + 178, fy + 30, 64, 100, '#16172A', 12, 'Phone'],
  ];
  const nav = [0, 1, 2].map((i) => `<rect x="${fx + 150 + i * 34}" y="${fy + 13}" width="24" height="5" rx="2.5" fill="#B9BBCB"/>`).join('');
  const shapes = els.map(([x, y, w, h, fill, rx]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`).join('');
  const phoneInner = `<rect x="${fx + 184}" y="${fy + 40}" width="52" height="30" rx="6" fill="${C.violet}"/><rect x="${fx + 184}" y="${fy + 76}" width="40" height="5" rx="2.5" fill="#3A3C58"/><rect x="${fx + 184}" y="${fy + 86}" width="30" height="5" rx="2.5" fill="#3A3C58"/><rect x="${fx + 184}" y="${fy + 108}" width="52" height="14" rx="7" fill="${C.cyan}"/>`;

  // последовательность выделений
  const seq = [4, 1, 5, 3];
  const pad = 3;
  const kt = seq.map((_, i) => r2(i / seq.length)).concat(1).join(';');
  const val = (fn) => seq.map((i) => fn(els[i])).concat(fn(els[seq[0]])).join(';');
  const DUR = '8s';
  const disc = (attr, fn) => `<animate attributeName="${attr}" dur="${DUR}" repeatCount="indefinite" calcMode="discrete" keyTimes="${kt}" values="${val(fn)}"/>`;
  const sel = `<rect fill="none" stroke="${C.cyan}" stroke-width="1.2">${disc('x', (e) => e[0] - pad)}${disc('y', (e) => e[1] - pad)}${disc('width', (e) => e[2] + pad * 2)}${disc('height', (e) => e[3] + pad * 2)}</rect>`;
  const handle = (fx_, fy_) => `<rect width="5" height="5" fill="#fff" stroke="${C.cyan}">${disc('x', (e) => fx_(e) - 2.5)}${disc('y', (e) => fy_(e) - 2.5)}</rect>`;
  const L = (e) => e[0] - pad;
  const R = (e) => e[0] + e[2] + pad;
  const T = (e) => e[1] - pad;
  const B = (e) => e[1] + e[3] + pad;
  const handles = handle(L, T) + handle(R, T) + handle(L, B) + handle(R, B);

  // курсор приезжает к элементу чуть раньше смены выделения
  const cur = seq.map((i) => `${els[i][0] + els[i][2] * 0.6} ${els[i][1] + els[i][3] * 0.6}`);
  const curVals = [];
  const curKT = [];
  seq.forEach((_, i) => {
    const a = i / seq.length;
    curVals.push(cur[i], cur[i]);
    curKT.push(r2(a), r2(a + 0.7 / seq.length));
  });
  curVals.push(cur[0]);
  curKT.push(1);
  const cursor = `<g><animateTransform attributeName="transform" type="translate" dur="${DUR}" repeatCount="indefinite" calcMode="spline" keyTimes="${curKT.join(';')}" values="${curVals.join(';')}" keySplines="${curKT.slice(1).map(() => '.6 0 .2 1').join(';')}"/>
<path d="M0 0v13l3.5-3.2 2.4 5.2 2.2-1-2.4-5.1H10z" fill="#fff" stroke="${C.ink}" stroke-width="1"/></g>`;

  // инспектор справа
  const px = fx + fw + 14;
  const pw = IW - px - 14;
  const names = seq.map((i) => els[i][6]);
  const nameAnim = names
    .map((n, i) => {
      const a = (i / seq.length) * 100;
      const b = ((i + 1) / seq.length) * 100;
      return `<g class="nm" style="animation-name:nm${i}">${text(n, { font: F.bodyBold, size: 12, x: px + 12, y: fy + 26, fill: C.text })}</g><style>@keyframes nm${i}{0%{opacity:0}${r2(a)}%{opacity:1}${r2(b)}%{opacity:0}}</style>`;
    })
    .join('');
  const row = (k, v, y, sw) =>
    text(k, { font: F.mono, size: 9.5, x: px + 12, y, fill: C.muted }) +
    (sw ? `<rect x="${px + pw - 60}" y="${y - 9}" width="10" height="10" rx="2" fill="${sw}"/>` : '') +
    text(v, { font: F.mono, size: 9.5, x: px + pw - 12, y, fill: C.text2, anchor: 'end' });
  const panel = `<rect x="${px}" y="${fy}" width="${pw}" height="${fh}" rx="10" fill="${C.surface2}" stroke="${C.line2}"/>
${nameAnim}
<rect x="${px}" y="${fy + 38}" width="${pw}" height="1" fill="${C.line2}"/>
${row('Fill', 'FF2E88', fy + 58, C.magenta)}${row('Radius', '12', fy + 78)}${row('Gap', '24', fy + 98)}${row('Font', 'DM Sans', fy + 118)}`;

  return {
    defs: `<pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#fff" fill-opacity=".08"/></pattern>`,
    css: `.nm{opacity:0;animation-duration:8s;animation-iteration-count:infinite;animation-timing-function:step-end}`,
    svg: `<rect width="${IW}" height="${IH}" fill="#0B0C12"/><rect width="${IW}" height="${IH}" fill="url(#dots)"/>
${text('Home — 1440', { font: F.mono, size: 9.5, x: fx, y: fy - 8, fill: C.muted })}
${text('Figma → React', { font: F.mono, size: 9.5, x: fx + fw, y: fy - 8, fill: C.muted, anchor: 'end' })}
<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="4" fill="#F4F4F8"/>
${nav}${shapes}${phoneInner}
<path d="M${fx + 18} ${fy + 88}V${fy + 104}" stroke="${C.magenta}" stroke-width="1"/>
${text('16', { font: F.mono, size: 8.5, x: fx + 22, y: fy + 99, fill: C.magenta })}
${sel}${handles}${cursor}${panel}`,
  };
}

// ---------- 6. Дети на планете: телефон с планетой ----------
function planet() {
  const cx = IW / 2;
  const cy = IH / 2 + 2;
  const pw = 108;
  const ph = 170;
  let stars = '';
  const rnd = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  for (let i = 0; i < 26; i++) {
    const x = rnd(i) * IW;
    const y = rnd(i + 99) * IH;
    stars += `<circle class="tw" style="animation-delay:-${r2(rnd(i + 7) * 3)}s" cx="${n1(x)}" cy="${n1(y)}" r="${n1(0.6 + rnd(i + 3) * 1.2)}" fill="#fff"/>`;
  }
  const pill = (label, x, y, col, delay) => {
    const w = measure(label, F.bodyBold, 11) + 30;
    return `<g class="fl" style="animation-delay:${delay}s"><rect x="${x}" y="${y}" width="${r2(w)}" height="26" rx="13" fill="${C.surface2}" stroke="${C.line2}"/><circle cx="${x + 13}" cy="${y + 13}" r="4" fill="${col}"/>${text(label, { font: F.bodyBold, size: 11, x: x + 22, y: y + 17, fill: C.text2 })}</g>`;
  };
  return {
    defs: `<radialGradient id="pl" cx=".35" cy=".3" r=".8"><stop stop-color="${C.lime}"/><stop offset=".55" stop-color="#2FD6A8"/><stop offset="1" stop-color="#0B4F6C"/></radialGradient>
<clipPath id="scr"><rect x="${cx - pw / 2 + 6}" y="${cy - ph / 2 + 6}" width="${pw - 12}" height="${ph - 12}" rx="18"/></clipPath>`,
    css: `.tw{animation:tw 3s ease-in-out infinite}@keyframes tw{50%{opacity:.15}}
.orb{transform-origin:${cx}px ${cy - 10}px;animation:orb 6s linear infinite}@keyframes orb{to{transform:rotate(360deg)}}
.fl{animation:fl 4s ease-in-out infinite}@keyframes fl{50%{transform:translateY(-5px)}}`,
    svg: `<rect width="${IW}" height="${IH}" fill="#090A12"/>${stars}
<rect x="${cx - pw / 2}" y="${cy - ph / 2}" width="${pw}" height="${ph}" rx="24" fill="#0E1020" stroke="${C.line2}" stroke-width="1.5"/>
<g clip-path="url(#scr)">
<rect x="${cx - pw / 2}" y="${cy - ph / 2}" width="${pw}" height="${ph}" fill="#101530"/>
<ellipse cx="${cx}" cy="${cy - 10}" rx="46" ry="12" stroke="${C.cyan}" stroke-opacity=".5" transform="rotate(-18 ${cx} ${cy - 10})"/>
<circle cx="${cx}" cy="${cy - 10}" r="28" fill="url(#pl)"/>
<g class="orb"><circle cx="${cx + 44}" cy="${cy - 10}" r="5" fill="${C.magenta}"/></g>
<rect x="${cx - 36}" y="${cy + 40}" width="72" height="8" rx="4" fill="#F2F2F7" opacity=".9"/>
<rect x="${cx - 26}" y="${cy + 54}" width="52" height="6" rx="3" fill="#6E7290"/>
</g>
<rect x="${cx - 16}" y="${cy - ph / 2 + 10}" width="32" height="6" rx="3" fill="#07070C"/>
${pill('Расписание', 26, 40, C.cyan, 0)}${pill('Кружки', 44, 118, C.lime, -1.3)}${pill('Профиль ребёнка', IW - 150, 56, C.magenta, -2.1)}${pill('Роли и доступ', IW - 134, 128, C.violet, -0.7)}`,
  };
}

const PROJECTS = [
  {
    slug: 'dimension',
    title: 'DIMENSION',
    desc: 'Интерактивный музей измерений: от точки до тессеракта, чёрные дыры и фракталы на настоящей математике.',
    tags: ['TypeScript', 'Canvas', 'Three.js'],
    art: tesseract,
    accent: C.violet,
  },
  {
    slug: 'nova-photo',
    title: 'NOVA PHOTO',
    desc: 'Магазин фототехники как фильм на скролле: 3D-камера, 9 лабораторий и плёночные симуляции.',
    tags: ['React', 'R3F', 'GSAP'],
    art: aperture,
    accent: C.cyan,
  },
  {
    slug: 'pocket-film',
    title: 'POCKET FILM',
    desc: 'Аналоговая камера для iOS и Android: выбери плёнку, сними, дождись проявки. Local-first.',
    tags: ['React Native', 'Expo', 'Skia'],
    art: film,
    accent: '#FF6A3D',
  },
  {
    slug: 'instrumentum',
    title: 'INSTRUMENTUM',
    desc: 'Хаб из 14+ инструментов: вставь что угодно — поле само распознает JSON, JWT, URL, цвет или время.',
    tags: ['React', 'Tailwind', 'Framer Motion'],
    art: smartInput,
    accent: C.lime,
  },
  {
    slug: 'avora',
    title: 'AVORALAB',
    desc: 'Сайт студии, собранный из Figma пиксель в пиксель: дизайн-токены, калькулятор цены, две страницы.',
    tags: ['React', 'CSS Modules', 'Figma'],
    art: figma,
    accent: C.magenta,
  },
  {
    slug: 'planet-kids',
    title: 'ДЕТИ НА ПЛАНЕТЕ',
    desc: 'Мобильное приложение детского центра по Figma-макету: роли, расписание, данные из Supabase.',
    tags: ['React Native', 'Expo', 'Supabase'],
    art: planet,
    accent: C.lime,
  },
];

export function projectCards() {
  return PROJECTS.map((p, i) => {
    const art = p.art();
    const f = frame(W, H, { id: 'pc', r: 22, ticks: false, glow: p.accent, glow2: C.violet });
    const num = String(i + 1).padStart(2, '0');
    const tY = IH + 12 + 44;
    const par = paragraph(p.desc, { x: 22, y: tY + 26, width: W - 44, size: 13.5, lineHeight: 1.5 });
    const body = `${f.back}
<g transform="translate(12 12)"><g clip-path="url(#art)">${art.svg}</g><rect x=".5" y=".5" width="${IW - 1}" height="${IH - 1}" rx="13.5" stroke="${C.line}"/></g>
${text(num, { font: F.mono, size: 11, x: 22, y: tY - 22, fill: C.muted, tracking: 1.5 })}
${text(p.title, { font: F.display, size: 21, x: 22, y: tY + 2, fill: C.text })}
<g class="go"><circle cx="${W - 38}" cy="${tY - 6}" r="16" fill="${C.surface2}" stroke="${C.line2}"/><path d="M${W - 43} ${tY - 1}l10-10m0 0h-7m7 0v7" stroke="${C.text}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g>
${par.svg}
${chips(p.tags, 22, H - 46)}
${f.front}`;
    return {
      slug: p.slug,
      svg: doc({
        w: W,
        h: H,
        title: `${p.title} — ${p.desc}`,
        style: art.css || '',
        defs: `${f.defs}<clipPath id="art"><rect width="${IW}" height="${IH}" rx="14"/></clipPath>${art.defs || ''}`,
        body,
      }),
    };
  });
}
