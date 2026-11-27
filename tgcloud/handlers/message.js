import { api } from 'sdk';

// Единственная команда: /chatid — подсказывает id чата для TARGET_CHAT_ID.
export default async function (message) {
  if (typeof message?.text !== 'string') return;
  if (!/^\/chatid(@\w+)?$/.test(message.text.trim())) return;
  await api.sendMessage({ chat_id: message.chat.id, text: `chat id: ${message.chat.id}` });
}
