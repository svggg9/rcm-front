# рцмаркет — frontend

Маркетплейс независимых брендов: каталог, корзина/checkout, кабинеты покупателя и продавца, админка. Next.js 16, React 19, TypeScript, App Router. Основная ветка — `main`.

## С чего начать

1. [AGENTS.md](AGENTS.md) — рабочие инструкции для агента.
2. [PROJECT_PLAN.md](PROJECT_PLAN.md) — текущие задачи и приоритеты.
3. [WINDOWS_HANDOFF.md](WINDOWS_HANDOFF.md) — перенос, окружение и готовый промпт продолжения.
4. [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — принятые решения интерфейса; сначала последнее состояние.
5. [DEPLOYMENT_2026-09-19.md](DEPLOYMENT_2026-09-19.md) — что реально собрано, проверено и выложено.

Парный backend: [svggg9/rcm](https://github.com/svggg9/rcm), ветка `master`. Удобно держать `rcm-front` и `rcm` рядом в одной родительской папке; абсолютные пути Mac не нужны.

## Запуск на Windows / PowerShell

Используй Node.js 24.x и npm: эта версия использована для серверных frontend-сборок 19 сентября. Зависимости устанавливаются по package-lock.json.

```powershell
npm ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Открыть [localhost:3000](http://localhost:3000). Для данных нужен запущенный backend на порту 9696; его запуск описан в README backend. Без него интерфейс не является полностью рабочим marketplace.

`.env.example` содержит только локальные URL. `NEXT_PUBLIC_API_URL` используется браузером и встраивается при сборке; `SERVER_API_URL` — серверной частью Next.js. Нельзя помещать секреты в `NEXT_PUBLIC_*`. При изменении public URL для релиза нужна новая сборка. Карта ПВЗ дополнительно использует public Yandex Maps/Suggest keys — настраивай только для соответствующего сценария.

Локальные `.env.local`, node_modules и .next в Git не входят. Не перезаписывай существующий env и не обновляй зависимости просто ради переноса.

## Карта кода

| Путь | Назначение |
| --- | --- |
| `app/components/ui`, `app/styles` | Общие компоненты и стили |
| `app/catalog`, `app/components/Catalog` | Каталог, фильтры, пагинация |
| `app/product`, `app/p` | Карточки товара и публичные URL |
| `app/cart`, `app/checkout` | Покупка и оформление заказа |
| `app/seller`, `app/seller/@editor` | Кабинет продавца и редактор поверх списка |
| `app/account`, `app/admin` | Кабинет покупателя и админка |
| `app/lib/config.ts` | Выбор frontend/backend URL |
| `app/design-system` | Эталон интерфейса, доступен только в dev |
| `scripts/check-*.cjs` | Дополнительные проверки отдельных сценариев |
| `docs/mac-artifacts-2026-09` | Архив дизайна и импорта; не bootstrap для Windows |

## Проверки

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Для Next/font сборке нужен доступ к источнику шрифтов. `npm start` запускает уже собранную production-версию. Полного npm test в проекте нет; выбирай релевантные `scripts/check-*.cjs` после чтения сценария, не запускай все архивные инструменты подряд.

## Текущий статус

19 сентября 2026 frontend и backend обновлены на [test](https://test.rcmarket.io) и [production](https://rcmarket.io). Обе серверные БД — V99. Сборки frontend, 340 unit/web + 24 integration backend и smoke прошли; полный бизнес-E2E с реальными провайдерами не выполнен. Это зафиксированное состояние релиза, не постоянный мониторинг.

Следующий рабочий блок: локальный запуск на Windows и проверка seller-навигации, товаров/подборок, сортировки, массовых действий, прямых URL и закрытия редактора с несохранёнными правками. Затем — открытые контракты из плана.

Серверы используют закреплённые Docker images; обычный git pull не обновляет работающие контейнеры. История релиза, backup и rollback описаны в отчёте. Старый backlog в docs и апрельские/сентябрьские исторические отчёты не заменяют текущий план.
