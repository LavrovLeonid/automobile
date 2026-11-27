import { api } from 'sdk';
import { SOURCE_CHANNEL, TARGET_CHAT_ID } from './config.js';

// Переслать пост через forwardMessage нельзя: бот не состоит в канале, и Bot API
// отвечает «message to forward not found» (проверено на посте #28620).
// Поэтому шлём ссылку на пост — Telegram показывает под ней превью с текстом и фото.
export async function notifyPost(postId) {
  const url = `https://t.me/${SOURCE_CHANNEL}/${postId}`;
  return api.sendMessage({
    chat_id: TARGET_CHAT_ID,
    text: `🎟 Старт продажи билетов\n${url}`,
    link_preview_options: { url, prefer_large_media: true },
  });
}
