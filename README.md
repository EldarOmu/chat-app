# Групповой чат

React и TypeScript (файлы `.tsx`). Регистрация, вход и выход через JWT, сообщения через WebSocket.
Сервер: https://inai-col3.fishrungames.com (документация API на `/api/docs/`, чат на `wss://inai-col3.fishrungames.com/chat/`).

## Запуск

```
npm install
npm run dev
```

Проверка типов и сборка: `npm run build`.

## Как это устроено

- `src/api.tsx`: запросы `register`, `login`, `logout`, `getProfile`, `refreshToken`. Запросы идут с `credentials: "include"`, чтобы браузер хранил HttpOnly cookie с refresh-токеном.
- Access-токен лежит только в состоянии React (`Session` в `src/App.tsx`), в localStorage его нет. При открытии страницы приложение просит новый access-токен у `/api/token/refresh/`, поэтому после перезагрузки вход сохраняется, пока жива cookie.
- `src/useChat.tsx`: хук с WebSocket. После открытия соединения отправляет `AUTH` с токеном, после `AUTH_SUCCESS` разрешает писать. Сообщения уходят как `CHAT_MESSAGE`, приходят как `NEW_MESSAGE`. Если соединение оборвалось, кнопка «Переподключиться» сначала обновляет токен.
- `src/types.tsx`: типы и функция `parseServerMessage`, которая проверяет сообщения сервера перед использованием.
- `src/Chat.tsx` и `src/MessageItem.tsx`: окно чата и одно сообщение (props `message`, `isOwn`).
- Babel не используется: Vite 8 сам компилирует TSX, а `tsc` только проверяет типы.

Другие адреса серверов: файл `.env` со строками `VITE_API_URL=...` и `VITE_WS_URL=...`.

## GitHub Pages

Settings → Pages → Source: GitHub Actions. Каждый пуш в `main` публикуется workflow `.github/workflows/deploy.yml`.
