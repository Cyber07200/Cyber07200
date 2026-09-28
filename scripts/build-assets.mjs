// Генерирует статичные дизайн-ассеты в assets/. Запуск: npm run build
import { write, C } from './lib/kit.mjs';
import { hero } from './assets/hero.mjs';
import { sectionHeader, about, button, footer } from './assets/sections.mjs';

console.log('Сборка ассетов:');
write('assets/hero.svg', hero());
write('assets/about.svg', about());
write('assets/footer.svg', footer());

const SECTIONS = [
  ['01', 'Обо мне', '// ABOUT'],
  ['02', 'Избранные проекты', '// SELECTED WORK'],
  ['03', 'Стек и инструменты', '// TOOLKIT'],
  ['04', 'Статистика', '// LIVE STATS · ОБНОВЛЯЕТСЯ АВТОМАТИЧЕСКИ'],
  ['05', 'Змейка ест коммиты', '// CONTRIBUTION SNAKE'],
  ['06', 'Связь', '// CONTACT'],
];
for (const [n, title, kicker] of SECTIONS) {
  write(`assets/sections/${n}-dark.svg`, sectionHeader(n, title, kicker, 'dark'));
  write(`assets/sections/${n}-light.svg`, sectionHeader(n, title, kicker, 'light'));
}

write('assets/buttons/telegram.svg', button('Telegram', '@MaimysAbrosimv', 'telegram', C.cyan));
write('assets/buttons/email.svg', button('Email', 'abrosimov20062022@gmail.com', 'mail', C.magenta));
write('assets/buttons/github.svg', button('GitHub', 'github.com/Cyber07200', 'code', C.lime));

import { projectCards } from './assets/projects.mjs';
for (const c of projectCards()) write(`assets/projects/${c.slug}.svg`, c.svg);
