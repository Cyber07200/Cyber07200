// Живая статистика профиля: берёт данные из GitHub API и рисует SVG-карточки
// в дизайн-системе профиля. Запускается в GitHub Actions (см. .github/workflows/profile.yml).
//
//   node scripts/build-stats.mjs            — GraphQL API, нужен GITHUB_TOKEN
//   node scripts/build-stats.mjs --demo     — без токена: публичный календарь + REST (для превью)
//   --out <dir>                             — куда сохранить (по умолчанию dist/)
import fs from 'node:fs';
import path from 'node:path';
import { C, F, text, measure, doc, frame, root, r2 } from './lib/kit.mjs';

const args = process.argv.slice(2);
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist';
const DEMO = args.includes('--demo');
const USER = process.env.GH_USER || 'Cyber07200';
const TOKEN = process.env.GITHUB_TOKEN;

const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);

// ---------- сбор данных ----------
async function gql(query, variables) {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-stats' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(`GraphQL: ${r.status} ${JSON.stringify(j.errors || j)}`);
  return j.data;
}

async function fromGraphQL() {
  const { user } = await gql(
    `query($login:String!){ user(login:$login){
      createdAt
      repositories(ownerAffiliations:OWNER, isFork:false, first:100){
        totalCount
        nodes{ stargazerCount isPrivate languages(first:12, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{ name } } } }
      }
    } }`,
    { login: USER },
  );
  // календарь запрашивается окнами не длиннее года — от регистрации до сегодня
  const days = [];
  const now = new Date();
  let from = new Date(user.createdAt);
  while (from < now) {
    const to = new Date(Math.min(from.getTime() + 364 * DAY, now.getTime()));
    const d = await gql(
      `query($login:String!,$from:DateTime!,$to:DateTime!){ user(login:$login){ contributionsCollection(from:$from,to:$to){
        contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } } } }`,
      { login: USER, from: from.toISOString(), to: to.toISOString() },
    );
    for (const w of d.user.contributionsCollection.contributionCalendar.weeks) for (const x of w.contributionDays) days.push({ date: x.date, count: x.contributionCount });
    from = new Date(to.getTime() + DAY);
  }
  const repos = user.repositories.nodes;
  return {
    days,
    repoCount: repos.filter((r) => !r.isPrivate).length,
    stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    languages: mergeLangs(repos.map((r) => Object.fromEntries(r.languages.edges.map((e) => [e.node.name, e.size])))),
  };
}

async function fromPublic() {
  const html = await (await fetch(`https://github.com/users/${USER}/contributions`)).text();
  const ids = {};
  for (const m of html.matchAll(/data-date="([^"]+)" id="(contribution-day-component-[\d-]+)"/g)) ids[m[2]] = { date: m[1], count: 0 };
  for (const m of html.matchAll(/for="(contribution-day-component-[\d-]+)"[^>]*>(\d+) contribution/g)) if (ids[m[1]]) ids[m[1]].count = +m[2];
  const h = { 'User-Agent': 'profile-stats', ...(TOKEN ? { Authorization: `bearer ${TOKEN}` } : {}) };
  const repos = (await (await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner`, { headers: h })).json()).filter((r) => !r.fork);
  const langs = await Promise.all(repos.map(async (r) => (await fetch(r.languages_url, { headers: h })).json()));
  return {
    days: Object.values(ids),
    repoCount: repos.length,
    stars: repos.reduce((s, r) => s + r.stargazers_count, 0),
    languages: mergeLangs(langs),
  };
}

function mergeLangs(list) {
  const t = {};
  for (const l of list) for (const [k, v] of Object.entries(l || {})) t[k] = (t[k] || 0) + v;
  return t;
}

// ---------- метрики ----------
function metrics(raw) {
  const byDate = new Map();
  for (const d of raw.days) byDate.set(d.date, (byDate.get(d.date) || 0) + d.count);
  const today = new Date(iso(new Date()));
  const dates = [...byDate.keys()].sort();

  // серии
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const ds of dates) {
    const c = byDate.get(ds);
    const t = new Date(ds).getTime();
    if (c > 0) {
      run = prev !== null && t - prev === DAY && run > 0 ? run + 1 : 1;
      longest = Math.max(longest, run);
    } else run = 0;
    prev = t;
  }
  let current = 0;
  let cur = new Date(today);
  if (!(byDate.get(iso(cur)) > 0)) cur = new Date(cur.getTime() - DAY); // сегодня ещё можно успеть
  while (byDate.get(iso(cur)) > 0) {
    current++;
    cur = new Date(cur.getTime() - DAY);
  }

  const yearAgo = today.getTime() - 365 * DAY;
  const lastYear = dates.filter((d) => new Date(d).getTime() > yearAgo);
  const yearTotal = lastYear.reduce((s, d) => s + byDate.get(d), 0);
  const activeDays = lastYear.filter((d) => byDate.get(d) > 0).length;
  const allTotal = dates.reduce((s, d) => s + byDate.get(d), 0);

  // по месяцам — последние 12
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    months.push({ key: iso(m).slice(0, 7), date: m, count: 0 });
  }
  for (const d of dates) {
    const mo = months.find((m) => m.key === d.slice(0, 7));
    if (mo) mo.count += byDate.get(d);
  }

  // любимый день недели
  const wd = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dates) wd[new Date(d).getUTCDay()] += byDate.get(d);
  const favDay = wd.indexOf(Math.max(...wd));
  const bestDay = Math.max(0, ...byDate.values());

  const langs = Object.entries(raw.languages).sort((a, b) => b[1] - a[1]);
  const bytes = langs.reduce((s, [, v]) => s + v, 0);

  return { yearTotal, allTotal, activeDays, longest, current, bestDay, months, favDay, langs, bytes, repoCount: raw.repoCount, stars: raw.stars };
}

// ---------- форматирование ----------
const plural = (n, [one, few, many]) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
const fmt = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ');
const fmtBytes = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1).replace('.', ',')} МБ` : `${Math.round(b / 1e3)} КБ`);
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

// ---------- карточка «обзор + языки» ----------
function overviewCard(m) {
  const W = 1000;
  const H = 384;
  const f = frame(W, H, { id: 'st', r: 24, glow: C.cyan, glow2: C.violet });
  const stamp = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  const tiles = [
    [fmt(m.yearTotal), plural(m.yearTotal, ['контрибуция за год', 'контрибуции за год', 'контрибуций за год'])],
    [fmt(m.activeDays), plural(m.activeDays, ['активный день', 'активных дня', 'активных дней'])],
    [fmt(m.longest), `${plural(m.longest, ['день', 'дня', 'дней'])} — самая длинная серия`],
    // короткая текущая серия не мотивирует — тогда показываем рекорд за день
    m.current >= 2
      ? [fmt(m.current), `${plural(m.current, ['день', 'дня', 'дней'])} — текущая серия`]
      : [fmt(m.bestDay), `${plural(m.bestDay, ['контрибуция', 'контрибуции', 'контрибуций'])} — рекорд за один день`],
    [fmt(m.repoCount), plural(m.repoCount, ['публичный репозиторий', 'публичных репозитория', 'публичных репозиториев'])],
    [fmtBytes(m.bytes), 'кода в репозиториях'],
  ];
  const tx = 32;
  const ty = 92;
  const tw = 176;
  const th = 106;
  const gap = 12;
  let tilesSvg = '';
  tiles.forEach(([v, label], i) => {
    const x = tx + (i % 3) * (tw + gap);
    const y = ty + Math.floor(i / 3) * (th + gap);
    const lines = wrapLabel(label, tw - 32);
    tilesSvg +=
      `<rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="14" fill="${C.surface2}" stroke="${C.line}"/>` +
      text(v, { font: F.bodyBold, size: 34, x: x + 16, y: y + 48, fill: C.text }) +
      lines.map((l, j) => text(l, { font: F.body, size: 12.5, x: x + 16, y: y + 72 + j * 17, fill: C.text2 })).join('');
  });

  // языки: горизонтальные бары, подписи слева, доля справа
  const top = m.langs.slice(0, 6);
  const rest = m.langs.slice(6).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) top.push(['Другие', rest]);
  const lx = 624;
  const lw = W - lx - 32;
  const max = Math.max(...top.map(([, v]) => v));
  let langSvg = text('Языки по объёму кода', { font: F.bodyBold, size: 15, x: lx, y: 74, fill: C.text });
  top.forEach(([name, v], i) => {
    const y = 104 + i * 32;
    const share = v / m.bytes;
    const bw = Math.max(6, (v / max) * lw);
    langSvg +=
      text(name, { font: F.body, size: 13, x: lx, y, fill: C.text2 }) +
      text(`${(share * 100).toFixed(1).replace('.', ',')}%`, { font: F.mono, size: 12, x: W - 32, y, fill: C.text2, anchor: 'end' }) +
      `<rect x="${lx}" y="${y + 7}" width="${lw}" height="6" rx="3" fill="${C.line}"/>` +
      `<rect x="${lx}" y="${y + 7}" width="${r2(bw)}" height="6" rx="3" fill="${i === top.length - 1 && name === 'Другие' ? C.muted : C.cyan}"/>`;
  });

  const body = `${f.back}
${text('// LIVE STATS', { font: F.mono, size: 11, x: 32, y: 46, fill: C.muted, tracking: 1.5 })}
${text('Последние 12 месяцев', { font: F.bodyBold, size: 15, x: 32, y: 74, fill: C.text })}
${text(`обновлено ${stamp}`, { font: F.mono, size: 11, x: W - 32, y: 46, fill: C.muted, anchor: 'end', tracking: 0.5 })}
<rect x="600" y="70" width="1" height="${H - 110}" fill="${C.line}"/>
${tilesSvg}
${langSvg}
${text(`Чаще всего коммичу в ${WEEKDAYS[m.favDay]}`, { font: F.mono, size: 11.5, x: 32, y: H - 34, fill: C.muted })}
${text(`всего за всё время: ${fmt(m.allTotal)}`, { font: F.mono, size: 11.5, x: 600 - 24, y: H - 34, fill: C.muted, anchor: 'end' })}
${f.front}`;
  return doc({
    w: W,
    h: H,
    title: 'Статистика GitHub',
    desc: `${m.yearTotal} контрибуций за год, ${m.activeDays} активных дней, самая длинная серия ${m.longest}, репозиториев ${m.repoCount}. Языки: ${top.map(([n, v]) => `${n} ${((v / m.bytes) * 100).toFixed(1)}%`).join(', ')}.`,
    defs: f.defs,
    body,
  });
}

function wrapLabel(s, width) {
  const words = s.split(' ');
  const lines = [''];
  for (const w of words) {
    const next = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w;
    if (lines[lines.length - 1] && measure(next, F.body, 12.5) > width) lines.push(w);
    else lines[lines.length - 1] = next;
  }
  return lines;
}

// ---------- карточка «активность по месяцам» ----------
function activityCard(m) {
  const W = 1000;
  const H = 300;
  const f = frame(W, H, { id: 'ac', r: 24, glow: C.magenta, glow2: C.cyan });
  const px = 64;
  const py = 92;
  const pw = W - px - 32;
  const ph = 150;
  const base = py + ph;
  const maxV = Math.max(1, ...m.months.map((x) => x.count));
  const step = maxV <= 5 ? 1 : maxV <= 10 ? 2 : maxV <= 25 ? 5 : maxV <= 50 ? 10 : Math.ceil(maxV / 5 / 10) * 10;
  const top = Math.ceil(maxV / step) * step;
  const y = (v) => base - (v / top) * ph;

  let grid = '';
  for (let v = 0; v <= top; v += step) {
    grid +=
      `<rect x="${px}" y="${r2(y(v))}" width="${pw}" height="1" fill="${v === 0 ? C.line2 : C.line}"/>` +
      text(fmt(v), { font: F.mono, size: 10.5, x: px - 12, y: y(v) + 4, fill: C.muted, anchor: 'end' });
  }

  const slot = pw / 12;
  const bw = Math.min(24, slot * 0.46);
  const peak = m.months.reduce((a, b) => (b.count > a.count ? b : a), m.months[0]);
  let bars = '';
  m.months.forEach((mo, i) => {
    const cx = px + slot * i + slot / 2;
    const h = (mo.count / top) * ph;
    const isNow = i === 11;
    if (mo.count > 0) {
      // скругление 4px только на конце данных, основание прямое
      const x0 = cx - bw / 2;
      const r = Math.min(4, h);
      bars += `<path class="bar" style="animation-delay:${r2(i * 0.05)}s" d="M${r2(x0)} ${base}V${r2(base - h + r)}Q${r2(x0)} ${r2(base - h)} ${r2(x0 + r)} ${r2(base - h)}H${r2(x0 + bw - r)}Q${r2(x0 + bw)} ${r2(base - h)} ${r2(x0 + bw)} ${r2(base - h + r)}V${base}Z" fill="${C.cyan}" fill-opacity="${isNow ? 1 : 0.78}"/>`;
    }
    if (mo === peak && mo.count > 0) bars += text(fmt(mo.count), { font: F.bodyBold, size: 13, x: cx, y: base - h - 10, fill: C.text, anchor: 'middle' });
    else if (isNow && mo.count > 0) bars += text(fmt(mo.count), { font: F.bodyBold, size: 13, x: cx, y: base - h - 10, fill: C.text2, anchor: 'middle' });
    bars += text(MONTHS[mo.date.getUTCMonth()], { font: F.mono, size: 11, x: cx, y: base + 22, fill: isNow ? C.text : C.muted, anchor: 'middle' });
  });

  const total = m.months.reduce((s, x) => s + x.count, 0);
  const peakTxt = peak.count > 0 ? `пик — ${MONTHS_FULL[peak.date.getUTCMonth()]} ${peak.date.getUTCFullYear()}: ${fmt(peak.count)}` : 'пока тихо — всё впереди';
  const body = `${f.back}
${text('// ACTIVITY', { font: F.mono, size: 11, x: 32, y: 46, fill: C.muted, tracking: 1.5 })}
${text('Контрибуции по месяцам', { font: F.bodyBold, size: 15, x: 32, y: 70, fill: C.text })}
${text(`${fmt(total)} за 12 месяцев · ${peakTxt}`, { font: F.mono, size: 11, x: W - 32, y: 70, fill: C.muted, anchor: 'end' })}
${grid}${bars}
${f.front}`;
  return doc({
    w: W,
    h: H,
    title: 'Контрибуции по месяцам',
    desc: m.months.map((x) => `${MONTHS_FULL[x.date.getUTCMonth()]} ${x.date.getUTCFullYear()}: ${x.count}`).join('; '),
    style: `.bar{transform-box:fill-box;transform-origin:bottom;animation:grow .9s cubic-bezier(.2,.8,.2,1) both}@keyframes grow{from{transform:scaleY(0)}}`,
    defs: f.defs,
    body,
  });
}

// ---------- запуск ----------
const raw = !DEMO && TOKEN ? await fromGraphQL() : await fromPublic();
const m = metrics(raw);
console.log(`Статистика ${USER}: ${m.yearTotal} за год, ${m.activeDays} активных дней, серия ${m.current}/${m.longest}, ${m.repoCount} репо, ${fmtBytes(m.bytes)}`);
const out = path.isAbsolute(OUT) ? OUT : root(OUT);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'stats.svg'), overviewCard(m));
fs.writeFileSync(path.join(out, 'activity.svg'), activityCard(m));
console.log(`  ✓ ${path.join(OUT, 'stats.svg')}\n  ✓ ${path.join(OUT, 'activity.svg')}`);
