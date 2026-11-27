import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectPosts } from '../tgcloud/lib/select.js';

const SALE = 'Сегодня в 20:00 стартует продажа билетов.';
const NEWS = 'Победа в овертайме!';

const posts = [
  { id: 10, text: SALE },
  { id: 11, text: NEWS },
  { id: 12, text: SALE },
];

test('первый запуск: запоминает последний id и ничего не шлёт', () => {
  assert.deepEqual(selectPosts(posts, null, new Set()), { toForward: [], baseline: 12 });
});

test('первый запуск без постов: baseline остаётся null', () => {
  assert.deepEqual(selectPosts([], null, new Set()), { toForward: [], baseline: null });
});

test('шлёт только анонсы новее baseline', () => {
  const { toForward } = selectPosts(posts, 10, new Set());
  assert.deepEqual(toForward.map((p) => p.id), [12]);
});

test('не шлёт повторно уже пересланное', () => {
  const { toForward } = selectPosts(posts, 9, new Set([10]));
  assert.deepEqual(toForward.map((p) => p.id), [12]);
});
