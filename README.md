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

Клавиша `I` — инвентарь (аптечка +30 HP, мясо хряка, тусклый осколок). **1** удар, **2** тяжёлый удар (выносливость). **Enter** — рация. **M** — миникарта. **Space** — прыжок. При нуле HP — **Подняться** у Кефира. Радиация на КПК растёт у края площадки.

Прогресс пишется в браузер (`localStorage`). GM **Reset Save** стирает сейв. **AUTO TEST** сам проходит один цикл заказа и пишет OK/FAIL. GM **Teleport to depot** ставит к ржавому депо.

Окружение Насыпи: low-poly из [Kenney City Kit (Industrial)](https://kenney.nl/assets/city-kit-industrial), CC0. Над заставой пасмурный купол с эквирект-небом 1k (Poly Haven CC0, GM **Toggle sky**). Земля — грязный вертексный цвет, без отдельной текстуры. Край площадки — редкие столбы и обломки; три сферы жгут HP, `F` даёт осколок (GM **Toggle anomalies**). Склады не проходимы (AABB, GM **Show colliders**). Второй заказ у Кефира — осколок. Игрок и хряк — капсулы, рыскарь — коробка. Лицензия: `public/assets/LICENSES.md`.

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
