// Разбор веб-превью публичного канала (https://t.me/s/<channel>).
// Страница отдаёт последние ~20 постов без авторизации.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  ).trim();
}

/**
 * @returns {{ id: number, text: string }[]} посты канала по возрастанию id;
 *   посты без текста (только фото/видео) пропускаются.
 */
export function parsePreview(html, channel) {
  const posts = new Map();
  const blocks = html.split(/(?=<div class="tgme_widget_message_wrap)/);
  const postRe = new RegExp(`data-post="${channel}/(\\d+)"`, 'i');
  for (const block of blocks) {
    const idMatch = block.match(postRe);
    const textMatch = block.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!idMatch || !textMatch) continue;
    const text = htmlToText(textMatch[1]);
    if (text) posts.set(Number(idMatch[1]), text);
  }
  return [...posts.entries()].sort((a, b) => a[0] - b[0]).map(([id, text]) => ({ id, text }));
}
