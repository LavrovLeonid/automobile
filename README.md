# automobile

Бот на [Telegram Serverless](https://core.telegram.org/bots/serverless) (tgcloud):
следит за каналом [@hc_avtomobilist](https://t.me/hc_avtomobilist) и пересылает
в группу посты о старте продажи билетов. Остальные посты (розыгрыши, итоги,
абонементы, новости) не пересылаются.

## Как устроено

- Бот не может читать чужой канал через Bot API, поэтому берём публичное
  веб-превью `https://t.me/s/hc_avtomobilist` (последние ~20 постов).
- Из облака Telegram Serverless `t.me` недоступен (`fetch: request failed`),
  поэтому страницу скачивает и разбирает [`scripts/poll.js`](scripts/poll.js)
  на раннере GitHub Actions и передаёт посты в облако:
  `npx tgcloud run endpoints/poll '{ posts: [...] }'`. `endpoints/poll`
  фильтрует их и пересылает подходящие через `forwardMessage`; если переслать
  нельзя, шлёт ссылку на пост.
- В Telegram Serverless нет запуска по расписанию, поэтому cron живёт в GitHub
  Actions: [`poll.yml`](.github/workflows/poll.yml) каждые 30 минут с 07:00 до
  22:30 по Екатеринбургу.
  Анонсы выходят за 1,5–8 часов до старта продаж, так что этой задержки хватает.
- Уже пересланные посты хранятся в таблице `forwarded`, повторно не уходят.
  На первом запуске бот запоминает последний пост (`state.baseline`) и старые
  анонсы не шлёт.
- `handlers/message` отвечает на `/chatid` — чтобы узнать id группы.

| Файл                         | Что внутри                               |
|------------------------------|------------------------------------------|
| `tgcloud/lib/config.js`      | канал и id группы                        |
| `tgcloud/lib/filter.js`      | правила «это анонс продаж»               |
| `tgcloud/lib/preview.js`     | разбор HTML превью канала                |
| `tgcloud/lib/select.js`      | что пересылать (baseline, дубликаты)     |
| `scripts/poll.js`            | скачать превью на раннере → `tgcloud run` |
| `tgcloud/endpoints/poll.js`  | фильтр → пересылка (в облаке)            |
| `tgcloud/schema.js`          | таблицы `state`, `forwarded`             |

## Запуск с нуля

1. В @BotFather создать бота, включить для него Serverless и получить CLI-токен
   вида `app<id>:<secret>` (так же, как для sup-bot).
2. Связать проект с ботом и создать таблицы:
   ```bash
   npm install
   npx tgcloud login
   npx tgcloud migrate
   npm run deploy
   ```
3. Добавить бота в группу, написать там `/chatid`, вписать ответ в
   `TARGET_CHAT_ID` в `tgcloud/lib/config.js`, закоммитить.
4. Положить токен в секреты репозитория:
   ```bash
   gh secret set TGCLOUD_TOKEN
   ```
5. Проверить вручную:
   ```bash
   npm run poll:dry
   npm run poll
   ```
   Первый `npm run poll` только запоминает baseline. Дальше работает cron.
   Запустить опрос из GitHub: Actions → poll → Run workflow.

## Тесты

```bash
npm test
```

Фильтр проверен на 54 реальных постах канала (сентябрь 2025 — ноябрь 2026):
все анонсы продаж ловятся, розыгрыши и новости — нет.

## Если что-то сломалось

- Запуск poll красный с «не нашлось ни одного поста» — Telegram поменял вёрстку
  превью, чинить `tgcloud/lib/preview.js`.
- Группу преобразовали в супергруппу — id сменится на `-100…`, обновить
  `TARGET_CHAT_ID` (узнать заново через `/chatid`).
- Анонс не переслался — посмотреть его текст и дополнить `INCLUDE` в
  `tgcloud/lib/filter.js` (и тест в `test/filter.test.js`).
