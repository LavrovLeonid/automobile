import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePreview } from '../tgcloud/lib/preview.js';

// Упрощённая копия разметки t.me/s/hc_avtomobilist: пост с текстом,
// пост только с фото, пост с entity и emoji.
const html = readFileSync(new URL('./fixtures/preview.html', import.meta.url), 'utf-8');

test('достаёт посты с текстом по возрастанию id', () => {
  const posts = parsePreview(html, 'hc_avtomobilist');
  assert.deepEqual(posts.map((p) => p.id), [28620, 28666]);
});

test('переводит <br/> в перенос строки и снимает теги', () => {
  const [post] = parsePreview(html, 'hc_avtomobilist');
  assert.equal(
    post.text,
    'Встречаем зиму на хоккее 😉\n\nСегодня в 20:00 на официальном сайте клуба стартует продажа билетов.',
  );
});

test('декодирует HTML entities', () => {
  const posts = parsePreview(html, 'hc_avtomobilist');
  assert.equal(posts[1].text, '«Трактор» & «Авто» — "1:1"');
});

test('пустая или чужая страница даёт пустой список', () => {
  assert.deepEqual(parsePreview('', 'hc_avtomobilist'), []);
  assert.deepEqual(parsePreview(html, 'other_channel'), []);
});
