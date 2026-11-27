// Обработка свежих постов канала. Из облака Telegram сайт t.me недоступен
// (fetch падает), поэтому страницу превью скачивает и разбирает scripts/poll.js
// на раннере GitHub Actions, а сюда передаёт готовые посты:
//   npx tgcloud run endpoints/poll '{ posts: [{ id, text }, …], dryRun?: true }'
// dryRun — только показать, что было бы переслано.
import { db, api } from 'sdk';
import { eq } from 'sdk/db';
import { state, forwarded } from '../schema.js';
import { SOURCE_CHANNEL, TARGET_CHAT_ID } from '../lib/config.js';
import { selectPosts } from '../lib/select.js';

const BASELINE_KEY = 'baseline';

export default async function (input = {}, ctx = {}) {
  // Вызов из Mini App пришёл бы с initData. Опрос запускается только через
  // `tgcloud run`, поэтому чужие вызовы с подставными постами отклоняем.
  if (ctx.initData) throw new Error('poll вызывается только через tgcloud run');
  if (!TARGET_CHAT_ID) throw new Error('TARGET_CHAT_ID не задан в tgcloud/lib/config.js');

  const posts = validatePosts(input.posts);

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

function validatePosts(posts) {
  // Пустой список — скорее всего поменялась вёрстка превью. Падаем громко,
  // чтобы красный запуск в Actions было видно.
  if (!Array.isArray(posts) || posts.length === 0) throw new Error('Не передано ни одного поста');
  for (const p of posts) {
    if (!Number.isInteger(p?.id) || p.id <= 0 || typeof p.text !== 'string') {
      throw new Error(`Некорректный пост: ${JSON.stringify(p).slice(0, 100)}`);
    }
  }
  return [...posts].sort((a, b) => a.id - b.id);
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
