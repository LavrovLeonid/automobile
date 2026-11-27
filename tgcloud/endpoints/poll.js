// Опрос канала. Вызывается по расписанию из GitHub Actions:
//   npx tgcloud run endpoints/poll
// Аргументы (необязательные): { dryRun: true } — только показать, что было бы переслано.
import { db, api, fetch } from 'sdk';
import { eq } from 'sdk/db';
import { state, forwarded } from '../schema.js';
import { SOURCE_CHANNEL, TARGET_CHAT_ID } from '../lib/config.js';
import { parsePreview } from '../lib/preview.js';
import { selectPosts } from '../lib/select.js';

const BASELINE_KEY = 'baseline';

export default async function (input = {}) {
  if (!TARGET_CHAT_ID) throw new Error('TARGET_CHAT_ID не задан в tgcloud/lib/config.js');

  const res = await fetch(`https://t.me/s/${SOURCE_CHANNEL}`);
  if (!res.ok) throw new Error(`t.me ответил ${res.status}`);
  const posts = parsePreview(await res.text(), SOURCE_CHANNEL);
  // Пустая страница — скорее всего поменялась вёрстка. Падаем громко, чтобы
  // красный запуск в Actions было видно, а не молча ничего не пересылаем.
  if (posts.length === 0) throw new Error('На странице превью не нашлось ни одного поста');

  const baselineRow = await db.select().from(state).where(eq(state.key, BASELINE_KEY)).get();
  const baseline = baselineRow ? Number(baselineRow.value) : null;
  const sentIds = new Set((await db.select().from(forwarded).all()).map((r) => r.postId));

  const { toForward, baseline: newBaseline } = selectPosts(posts, baseline, sentIds);

  if (input.dryRun) {
    return { posts: posts.length, baseline, wouldForward: toForward.map((p) => ({ id: p.id, text: p.text.slice(0, 100) })) };
  }

  if (baseline === null && newBaseline !== null) {
    await db.insert(state).values({ key: BASELINE_KEY, value: String(newBaseline) }).run();
    console.log(`Первый запуск: baseline = ${newBaseline}, старые посты не пересылаются`);
  }

  for (const post of toForward) {
    await forward(post.id);
    await db.insert(forwarded).values({ postId: post.id }).run();
    console.log(`Переслан пост #${post.id}: ${post.text.slice(0, 80)}`);
  }

  return { posts: posts.length, lastPostId: posts.at(-1).id, forwarded: toForward.map((p) => p.id) };
}

async function forward(postId) {
  try {
    await api.forwardMessage({ chat_id: TARGET_CHAT_ID, from_chat_id: `@${SOURCE_CHANNEL}`, message_id: postId });
  } catch (err) {
    // Если переслать из канала нельзя, шлём ссылку на пост — Telegram покажет его превью.
    console.warn(`forwardMessage #${postId} не удался: ${err.description ?? err.message}; шлю ссылку`);
    await api.sendMessage({ chat_id: TARGET_CHAT_ID, text: `🎟 Старт продажи билетов\nhttps://t.me/${SOURCE_CHANNEL}/${postId}` });
  }
}
