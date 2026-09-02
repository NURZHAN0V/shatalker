# Ш.А.Т.А.Л.К.Е.Р.

Браузерная одиночная вылазка в Периметр. Без сервера: мир, бой и боты крутятся в клиенте.

Документация: [docs/README.md](docs/README.md). Порядок работ: [docs/plan.md](docs/plan.md).

## Запуск

```bash
npm install
npm run dev
```

Сборка:

```bash
npm run build
```

Открыть URL Vite (обычно `http://localhost:5173`). Сервер API не нужен.

Клавиша `I` — инвентарь (аптечка +30 HP, мясо хряка). **Space** — прыжок (низкий край перелетается, склады нет). Справа сверху — 2D-миникарта. Рация внизу (Система / Периметр / Бой). Кнопка **Авто** на КПК крутит заказ сама.

Прогресс пишется в браузер (`localStorage`). GM **Reset Save** стирает сейв. **AUTO TEST** сам проходит один цикл заказа и пишет OK/FAIL. GM **Teleport to depot** ставит к ржавому депо.

Окружение Насыпи: low-poly из [Kenney City Kit (Industrial)](https://kenney.nl/assets/city-kit-industrial), CC0. Над заставой пасмурный купол с облачной текстурой 512 (GM **Toggle sky**). Земля — грязный вертексный цвет, без отдельной текстуры. Край площадки — редкие столбы и обломки; три тусклые сферы (GM **Toggle anomalies**). Склады не проходимы (AABB, GM **Show colliders**). Игрок, хряки, Кефир и боты остаются примитивами. Лицензия: `public/assets/LICENSES.md`.

## Опционально: HTTP API

Нужны Go и локальный Postgres (не Docker). База `shatalker`.

```bash
cp server/.env.example server/.env
make migrate-up
make serve
```

Клиент, чтобы ходить в API (иначе снова только `localStorage`):

```bash
echo 'VITE_API_URL=http://localhost:8080' > .env.local
npm run dev
```

На КПК: регистрация / вход. GM **API Health**, **Push save**, **Pull save**, **Logout**. После входа рация «Периметр» живая, на КПК список **На насыпи**, чужие шаталкеры — оливковые капсулы. Сборка API: `make build`.

## Прод

Docker только здесь, не вместо `make serve`. Goose — отдельный контейнер `migrate` до `api`. Статика — nginx (`make image`). TLS снаружи. Пример: `deploy/.env.prod.example`.
