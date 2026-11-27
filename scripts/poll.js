// Скачивает веб-превью канала, разбирает посты и передаёт их в облачный
// endpoints/poll. Из облака Telegram t.me недоступен, поэтому скачивание здесь.
//   node scripts/poll.js            — переслать новые анонсы
//   node scripts/poll.js --dry-run  — только показать, что было бы переслано
// Нужен TGCLOUD_TOKEN в окружении или `tgcloud login` в этой папке.
import { spawnSync } from 'node:child_process';
import { parsePreview } from '../tgcloud/lib/preview.js';
import { SOURCE_CHANNEL } from '../tgcloud/lib/config.js';

const dryRun = process.argv.includes('--dry-run');

const res = await fetch(`https://t.me/s/${SOURCE_CHANNEL}`, {
  headers: { 'user-agent': 'Mozilla/5.0 (compatible; automobile-bot)' },
});
if (!res.ok) {
  console.error(`t.me ответил ${res.status}`);
  process.exit(1);
}

const posts = parsePreview(await res.text(), SOURCE_CHANNEL);
if (posts.length === 0) {
  console.error('На странице превью не нашлось ни одного поста — похоже, поменялась вёрстка');
  process.exit(1);
}
console.log(`Постов на странице: ${posts.length} (#${posts[0].id}…#${posts.at(-1).id})`);

const args = JSON.stringify({ posts, dryRun });
const run = spawnSync('npx', ['tgcloud', 'run', 'endpoints/poll', args], { stdio: 'inherit' });
process.exit(run.status ?? 1);
