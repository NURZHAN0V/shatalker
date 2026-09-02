# Бэкенд: технические требования

Клиент по-прежнему крутит мир, бой и ботов локально. Сервер — **аккаунт, сейв, потом рация и комнаты**. Не симулятор Периметра и не античит.

Стек сервера: **Gin + GORM + Postgres**. Игра не стартует с бэкенда: сначала одиночная вылазка, API подключается вторым этапом.

Подробности мира и клиента — в [idea.md](./idea.md).

---

## 1. Роль сервера

| Делает | Не делает в первой версии API |
| --- | --- |
| Регистрация / вход | Тик мира, физика, камера |
| Сохранение шаталкера | Авторитетный бой и позиции 20 раз в секунду |
| Выдача и сдача заказов (проверка прогресса) | Античит, экономика, аукцион |
| Инвентарь как источник правды после синка | Группировки, PvP, шарды |
| Лог рации (история) | Модерация, админка контента |
| Позже: комната «Насыпь» по WebSocket | Замена фейковых ботов в клиенте |

Клиент остаётся источником геймплея, пока нет комнаты. Сервер принимает **снимки сейва** и команды вроде «сдать заказ», не каждый кадр.

---

## 2. Стек

Выбрано:

- **Go**
- **Gin** — HTTP API
- **GORM** — модели и запросы
- **Postgres** — данные
- **goose** — SQL-миграции, только через Makefile

К Gin+GORM+Postgres добавляем только это:

| Слой | Зачем | Чем |
| --- | --- | --- |
| **WebSocket** | Рация, кто в Периметре, потом комната | `coder/websocket` или gorilla |
| **JWT** | Сейв привязан к человеку | `golang-jwt/jwt` |
| **bcrypt** | Пароль не plaintext | `golang.org/x/crypto/bcrypt` |
| **CORS + env** | Vite на другом порту, секреты не в коде | `gin-contrib/cors`, переменные окружения |

**Docker — только прод.** Локально API и Postgres без контейнеров. Команды — через **Makefile**, не руками `go run` из головы.

Схема БД — **не** ответственность HTTP-процесса. См. раздел «Миграции».

Не слать и не принимать позиции 20 раз в секунду, пока не попросили комнату. Сейв — снимок, рация — события. Производительность клиента важнее «живого» серверного тика.

---

## 3. Этапы

1. **Клиент без сервера** — как сейчас в идее: `localStorage`, фейковая рация.
2. **HTTP API** — аккаунт + сейв + заказ + инвентарь. Клиент умеет играть офлайн и заливать сейв.
3. **Рация по WS** — сообщения живые, боты в клиенте пока остаются.
4. **Комната** — другие люди видны на Насыпи. Бой всё ещё клиентский, пока не решим иначе.

Порядок подключения API — фазы 9–12 в [plan.md](./plan.md). Не начинать сервер, пока клиент фазы 6 не играется.

---

## 4. HTTP API

База: `http://localhost:8080/api/v1`. JSON. Ошибки вида `{ "error": "..." }`.

Авторизация: `Authorization: Bearer <jwt>` на всём, кроме register/login.

### Аккаунт

```text
POST /auth/register   { "name", "password" } → { "token", "player" }
POST /auth/login      { "name", "password" } → { "token", "player" }
GET  /me              → текущий шаталкер
```

Имя = позывной. Пароль хранить как hash, не plaintext.

### Сейв

```text
GET  /save            → полный снимок
PUT  /save            { hp, mp, exp, level, position, ... } → ok
```

`PUT /save` — клиент периодически (не каждый кадр, раз в 5–10 с и при выходе) шлёт состояние. Сервер не симулирует позицию.

### Заказы

```text
GET  /quests
POST /quests/:id/accept
POST /quests/:id/complete
```

Complete: сервер проверяет `progress >= required` в сейве (или отдельной таблице прогресса), выдаёт опыт и предметы, помечает заказ сданным. Для MVP можно принять клиентский прогресс и выдать награду один раз.

### Инвентарь

```text
GET  /inventory
POST /inventory/use   { "itemId" }
```

Аптечка: сервер плюсует HP в сейве, минусует стак. Мясо хряка в MVP не используется, только лежит.

### Рация (HTTP, до WS)

```text
GET  /chat?channel=perimeter&limit=50
POST /chat            { "channel", "text" }
```

Каналы: `system`, `perimeter`, `combat`. Боевой лог можно не слать на сервер в MVP.

### Служебное

```text
GET  /health          → { "ok": true }
```

Без авторизации.

---

## 5. Схема Postgres

Для вайбкодинга достаточно `bigserial`.

```text
users
  id, name unique, password_hash, created_at

players
  id, user_id unique
  name, level, hp, max_hp, mp, max_mp
  exp, exp_to_next, attack, move_speed
  pos_x, pos_y, pos_z
  updated_at

inventory_items
  id, player_id, item_id, quantity
  unique(player_id, item_id)

quests
  id (string, напр. kill_hryaks_3)
  name, description, type, target, required
  reward_exp, reward_item_id

player_quests
  id, player_id, quest_id
  status: available | active | completed
  progress
  unique(player_id, quest_id)

chat_messages
  id, player_id nullable, channel, text, created_at
```

Контент заказов и предметов можно сидить миграцией. Клиентский `src/data` остаётся каноном для офлайна, сервер копирует те же id.

GORM — модели и запросы, не источник схемы. Схему меняют SQL-миграции, см. ниже.

---

## 6. WebSocket (этап 3+)

Один endpoint: `GET /api/v1/ws` с JWT в query или заголовке.

События JSON:

```text
client → server:  { "type": "chat", "channel": "perimeter", "text": "..." }
server → client:  { "type": "chat", "from": "Ржавый", "channel": "perimeter", "text": "..." }
server → client:  { "type": "presence", "name": "Лом", "online": true }
```

Пока без синхронизации капсул. Кто зашёл в комнату — список на КПК и рация. Позиции других людей — отдельный этап.

---

## 7. Конфиг и запуск

```text
APP_PORT=8080
APP_ENV=dev
DATABASE_URL=postgres://shatalker:shatalker@localhost:5432/shatalker?sslmode=disable
JWT_SECRET=dev-only-change-me
CORS_ORIGIN=http://localhost:5173
```

Локально: обычный Postgres на машине. Всё через Makefile:

```text
make migrate-up      # goose up, схема, отдельный шаг
make serve           # HTTP+WS, без миграций
make migrate-down    # goose down, откат последней
make build           # бинарь API (без Docker)
make image           # образы API + nginx (только прод)
```

`make serve` не вызывает migrate. Сначала migrate, потом serve. Docker в dev не нужен.

Прод: `docker-compose.prod.yml` — контейнер `migrate` (`goose up`) до `api`; nginx отдаёт `npm run build` и проксирует `/api/` (HTTP+WS). TLS снаружи, в compose только `:80`. Клиент в образе: `VITE_API_URL=/` (тот же origin). Пустой URL в `npm run dev` — только `localStorage`.

---

## 8. Миграции — не внутри приложения

`AutoMigrate` при старте Gin и «миграции в `main()` перед Listen» — плохая практика.

Почему:

- два инстанса стартуют сразу — гонка по схеме;
- упавшая миграция валит весь HTTP;
- GORM не умеет нормально rename/drop и не даёт откат;
- схема не ревьюится как SQL в git.

Правильно:

1. Версионированные SQL-файлы в `server/migrations/`. Мигратор — **goose**, не `golang-migrate`, не GORM AutoMigrate.
2. Отдельная цель Makefile / команда бинаря: `make migrate-up` / `make migrate-down`. Не побочный эффект `make serve`.
3. На проде миграции — **шаг релиза до** запуска сервера (CI: `make migrate-up`, потом контейнер с API). Сервер только `ping` БД и слушает порт.
4. GORM мапит уже существующие таблицы. Не генерирует схему в рантайме.

Локально то же самое: `make migrate-up`, потом `make serve`.

---

## 9. Каркас репозитория

Монорепо, сервер рядом с клиентом:

```text
server/
  Makefile                 # serve, migrate-up/down через goose, build
  cmd/api/main.go          # только serve — зовётся из Makefile
  internal/
    config/
    db/
    http/                  # Gin, JWT, CORS, bcrypt в auth-service
    ws/
    models/
    repo/
    service/
  migrations/              # SQL для goose, не AutoMigrate
  Dockerfile               # api + migrate, CMD только api
  go.mod
Dockerfile.web             # npm run build + nginx
docker-compose.prod.yml    # postgres, migrate, api, web
deploy/nginx.conf
```

`make serve`: конфиг → Postgres ping → Gin → Listen. Без миграций.  
`make migrate-up`: `go run ./cmd/migrate up` (goose) и выход. Бизнес-логика в `service`, не в хендлерах.

Цели Makefile не смешивать: migrate отдельно, serve отдельно. Docker-цели — только для прода (`make image` / `make release`), не для повседневной разработки.

---

## 10. Правила для вайбкодинга

1. Без сервера клиент обязан запускаться (`npm run dev`).
2. Не тащить бой, движение и спавн хряков на Go, пока не попросили.
3. Не делать микросервисы, GraphQL, Kafka, админку.
4. Не хранить JWT secret и пароли в git.
5. Один Postgres, одна база `shatalker`.
6. Не вызывать `AutoMigrate` и не гонять goose из `serve`.
7. Локально только Makefile: `make migrate-up`, `make serve`. Не полагаться на «голый» `go run` в доках и PLAYTEST.
8. Docker только для прода. В dev — локальный Postgres.
9. Каждый новый endpoint — строка в PLAYTEST (curl или кнопка в GM).
10. Имена в API те же, что в клиенте: `hryak`, `kill_hryaks_3`, `trader_kefir`, `medkit_small`.
