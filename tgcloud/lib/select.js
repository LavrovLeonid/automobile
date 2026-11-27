import { isTicketSale } from './filter.js';

/**
 * Какие посты переслать.
 * @param posts      посты со страницы превью
 * @param baseline   id последнего поста на момент первого запуска (старше — не трогаем),
 *                   null — первый запуск
 * @param forwarded  Set id уже пересланных постов
 * @returns {{ toForward: {id,text}[], baseline: number|null }}
 */
export function selectPosts(posts, baseline, forwarded) {
  // Первый запуск: запоминаем текущий последний пост и ничего не шлём,
  // иначе в группу прилетят старые анонсы со страницы.
  if (baseline === null) {
    const maxId = posts.reduce((m, p) => Math.max(m, p.id), 0);
    return { toForward: [], baseline: maxId || null };
  }
  // Посты в окне страницы проверяются каждый раз, поэтому пост, который
  // отредактировали и дописали анонс, тоже попадёт.
  const toForward = posts.filter((p) => p.id > baseline && !forwarded.has(p.id) && isTicketSale(p.text));
  return { toForward, baseline };
}
