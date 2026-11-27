import { table, integer, text, sql } from 'sdk/db';

// Простое key-value хранилище состояния (baseline — id последнего поста на первом запуске).
export const state = table('state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Посты канала, уже пересланные в группу. Защита от повторной пересылки.
export const forwarded = table('forwarded', {
  postId: integer('post_id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
