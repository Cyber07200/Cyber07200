// Общий набор для генерации SVG: шрифты -> контуры, палитра, рамки карточек.
// Текст переводится в <path>, поэтому картинки выглядят одинаково на любом
// устройстве: GitHub показывает SVG через <img>, и внешние шрифты там не грузятся.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const root = (...p) => path.join(ROOT, ...p);

// ---------- дизайн-токены ----------
export const C = {
  ink: '#07070C',
  surface: '#0C0D14',
  surface2: '#12131C',
  line: '#1F2133',
  line2: '#2A2D45',
  text: '#F2F2F7',
  text2: '#B4B7C9',
  muted: '#6E7290',
  cyan: '#00E5FF',
  magenta: '#FF2E88',
  lime: '#D7FF3A',
  violet: '#8B5CFF',
};

// ---------- шрифты ----------
const cache = new Map();
export function font(name) {
  if (!cache.has(name)) {
    const b = fs.readFileSync(root('fonts', `${name}.ttf`));
    cache.set(name, opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));
  }
  return cache.get(name);
}

export const F = {
  display: 'Unbounded-ExtraBold',
  displayMid: 'Unbounded-Medium',
  body: 'Manrope-Medium',
  bodyBold: 'Manrope-Bold',
  mono: 'JetBrainsMono-Medium',
  monoBold: 'JetBrainsMono-ExtraBold',
};

const r2 = (n) => Math.round(n * 100) / 100;

// Компактная запись контура: относительные команды, 1 знак после запятой,
// без нулевых отрезков. В 2–3 раза короче стандартного toPathData().
const num = (n) => {
  const v = Math.round(n * 10) / 10;
  return (Object.is(v, -0) ? 0 : v).toString().replace(/^(-?)0\./, '$1.');
};
const join = (arr) => arr.map(num).join(' ').replace(/ -/g, '-');
export function pathData(cmds) {
  let out = '';
  let cx = 0, cy = 0, sx = 0, sy = 0; // округлённая текущая точка — ошибки не накапливаются
  const R = (n) => Math.round(n * 10) / 10;
  for (const c of cmds) {
    if (c.type === 'M') {
      const x = R(c.x), y = R(c.y);
      out += 'm' + join([x - cx, y - cy]);
      cx = sx = x; cy = sy = y;
    } else if (c.type === 'L') {
      const x = R(c.x), y = R(c.y);
      if (x === cx && y === cy) continue;
      if (x === cx) out += 'v' + join([y - cy]);
      else if (y === cy) out += 'h' + join([x - cx]);
      else out += 'l' + join([x - cx, y - cy]);
      cx = x; cy = y;
    } else if (c.type === 'Q') {
      const x = R(c.x), y = R(c.y);
      out += 'q' + join([R(c.x1) - cx, R(c.y1) - cy, x - cx, y - cy]);
      cx = x; cy = y;
    } else if (c.type === 'C') {
      const x = R(c.x), y = R(c.y);
      out += 'c' + join([R(c.x1) - cx, R(c.y1) - cy, R(c.x2) - cx, R(c.y2) - cy, x - cx, y - cy]);
      cx = x; cy = y;
    } else if (c.type === 'Z') {
      out += 'z';
      cx = sx; cy = sy;
    }
  }
  return out;
}

/** Раскладывает строку в глифы: [{glyph, x}] + итоговая ширина. */
export function layout(str, fontName, size, { tracking = 0 } = {}) {
  const f = font(fontName);
  const scale = size / f.unitsPerEm;
  const glyphs = f.stringToGlyphs(str);
  const out = [];
  let x = 0;
  glyphs.forEach((g, i) => {
    out.push({ glyph: g, x, ch: str[i] });
    x += (g.advanceWidth || 0) * scale;
    if (i < glyphs.length - 1) x += f.getKerningValue(g, glyphs[i + 1]) * scale + tracking;
  });
  return { items: out, width: x, font: f, scale };
}

export const measure = (str, fontName, size, opts) => layout(str, fontName, size, opts).width;

/** Путь для строки. anchor: start | middle | end. Возвращает {d, width, x0}. */
export function textPath(str, fontName, size, x, y, { anchor = 'start', tracking = 0 } = {}) {
  const L = layout(str, fontName, size, { tracking });
  const x0 = anchor === 'middle' ? x - L.width / 2 : anchor === 'end' ? x - L.width : x;
  const d = pathData(L.items.flatMap((it) => it.glyph.getPath(x0 + it.x, y, size).commands));
  return { d, width: L.width, x0 };
}

/** Готовый <path> с текстом. */
export function text(str, { font: fn = F.body, size = 16, x = 0, y = 0, anchor, tracking, fill = C.text, attrs = '' } = {}) {
  const { d } = textPath(str, fn, size, x, y, { anchor, tracking });
  return `<path d="${d}" fill="${fill}" ${attrs}/>`;
}

/** Перенос строк по ширине. */
export function wrap(str, fontName, size, maxWidth) {
  const words = str.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next, fontName, size) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Многострочный текст: возвращает {svg, height}. */
export function paragraph(str, { font: fn = F.body, size = 15, x, y, width, lineHeight = 1.5, fill = C.text2 }) {
  const lines = wrap(str, fn, size, width);
  const svg = lines.map((l, i) => text(l, { font: fn, size, x, y: y + i * size * lineHeight, fill })).join('');
  return { svg, height: lines.length * size * lineHeight, lines: lines.length };
}

/** Капсула-тег. Возвращает {svg, width}. */
export function chip(label, x, y, { color = C.text2, border = C.line2, bg = 'none', size = 11, h = 24 } = {}) {
  const w = measure(label, F.mono, size, { tracking: 0.4 }) + 20;
  return {
    width: w,
    svg:
      `<rect x="${r2(x)}" y="${y}" width="${r2(w)}" height="${h}" rx="${h / 2}" fill="${bg}" stroke="${border}"/>` +
      text(label, { font: F.mono, size, x: x + 10, y: y + h / 2 + size * 0.36, fill: color, tracking: 0.4 }),
  };
}

/** Ряд тегов. */
export function chips(labels, x, y, opts = {}) {
  let cx = x;
  return labels
    .map((l) => {
      const c = chip(l, cx, y, opts);
      cx += c.width + 8;
      return c.svg;
    })
    .join('');
}

/** Оболочка SVG-документа. */
export function doc({ w, h, title, desc = '', body, style = '', defs = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>
<style>${style}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>
<defs>${defs}</defs>
${body}
</svg>
`;
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Фон карточки: скруглённая поверхность, волосяная рамка, угловые метки. */
export function frame(w, h, { r = 22, id = 'f', glow = C.cyan, glow2 = C.violet, ticks = true } = {}) {
  const t = 14;
  const tick = (x, y, dx, dy) => `<path d="M${x} ${y + dy * t}V${y}H${x + dx * t}" stroke="${C.muted}" stroke-width="1.2" opacity=".7"/>`;
  return {
    defs: `
<clipPath id="${id}-clip"><rect width="${w}" height="${h}" rx="${r}"/></clipPath>
<radialGradient id="${id}-g1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${w * 0.12} ${h * 0.05}) scale(${w * 0.6} ${h * 0.9})"><stop stop-color="${glow}" stop-opacity=".16"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-g2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${w * 0.95} ${h}) scale(${w * 0.55} ${h * 0.8})"><stop stop-color="${glow2}" stop-opacity=".14"/><stop offset="1" stop-color="${glow2}" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}-stroke" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop stop-color="${C.line2}"/><stop offset=".5" stop-color="${C.line}"/><stop offset="1" stop-color="${C.line2}"/></linearGradient>`,
    back: `<rect width="${w}" height="${h}" rx="${r}" fill="${C.surface}"/>
<g clip-path="url(#${id}-clip)"><rect width="${w}" height="${h}" fill="url(#${id}-g1)"/><rect width="${w}" height="${h}" fill="url(#${id}-g2)"/></g>`,
    front:
      `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${r - 0.5}" stroke="url(#${id}-stroke)"/>` +
      (ticks ? tick(12, 12, 1, 1) + tick(w - 12, 12, -1, 1) + tick(12, h - 12, 1, -1) + tick(w - 12, h - 12, -1, -1) : ''),
  };
}

/** Фоновая сетка с затуханием к краям. */
export function grid(w, h, step, id, { color = '#FFFFFF', opacity = 0.05, cx = 0.5, cy = 0.45 } = {}) {
  return {
    defs: `<pattern id="${id}-p" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><path d="M${step} 0H0V${step}" stroke="${color}" stroke-opacity="${opacity}"/></pattern>
<radialGradient id="${id}-m" cx="${cx}" cy="${cy}" r=".65"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="${id}-mask"><rect width="${w}" height="${h}" fill="url(#${id}-m)"/></mask>`,
    svg: `<rect width="${w}" height="${h}" fill="url(#${id}-p)" mask="url(#${id}-mask)"/>`,
  };
}

export function write(rel, content) {
  const p = root(rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  console.log(`  ✓ ${rel}  ${(Buffer.byteLength(content) / 1024).toFixed(1)} KB`);
}

export const pct = (n) => `${r2(n * 100)}%`;
export { r2 };
