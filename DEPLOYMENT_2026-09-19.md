# Выкладка test и production — 19 сентября 2026

По прямому запросу пользователя обновлены frontend и backend обоих окружений.
Test успешно проверен перед production. Это новая выкладка, заменяющая сентябрьский test-релиз и прежний production.

## Версии

| Компонент | Исходники / артефакт |
| --- | --- |
| Backend | `19804a2017084faa554e53f84852af293fb0ccc5` (`svggg9/rcm`, master) |
| Frontend | `1bda54f56d593fda06c7be82dfbb93ecc5ad0f14` (`svggg9/rcm-front`, main) |
| Backend image, оба окружения | `rcm-backend:20260919-19804a2` |
| Backend image ID | `sha256:68110c8c03611baef79c372c100bbb3e93708342fa2c05387ed597d9c1fa2d27` |
| JAR SHA-256 | `f67f53f89d859ad9c107e34a59d79012683415d6503bf4063428b62e3828c183` |
| Test frontend | `rcm-frontend:20260919-test`, `sha256:efe1dbb64687c20b952f369298af0ed2692f8f430ec2fc0379542f100db5eb5f` |
| Production frontend | `rcm-frontend:20260919-prod`, `sha256:35f01d269dc74abba130b70a9ac85dc85ada1340543b923c434afeef1ac10bcb` |

Сборки выполнены из чистых `git archive` указанных коммитов. Последующие документационные коммиты могут быть новее этих SHA — они не меняют выложенный код.
Frontend: Linux amd64, Node 24 Alpine, раздельные public URL для test/prod; runtime работает от пользователя node и содержит production dependencies. Исходный next.config.ts содержит обычный CommonJS JavaScript и в runtime скопирован как next.config.js. Backend runtime основан на ранее проверенном Java 21 image с доверенными CA, заменён JAR.

Release на сервере: `/home/ubuntu/release-20260919/` (доступ ограничен владельцем).
В нём сохранены source-архивы, JAR, образы frontend, manifest.json, Dockerfile/backend и frontend.Dockerfile, compose-конфигурации, результаты миграций/smoke и rollback-сценарии. Конфигурации с секретами не входят в Git.

## Проверки до выкладки

- Backend: `PAYMENT_PROVIDER=MOCK ./gradlew test integrationTest bootJar --no-daemon` — **340 unit/web + 24 integration**, без failures/errors/skips. Чистому checkout нужен явный mock provider для части тестовых контекстов.
- Оба frontend-образа: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build` — успешно.
- В JAR отсутствуют `.env` и `application-local.*`.
- Контрольная сумма JAR совпала локально, на сервере и внутри обоих работающих backend.
- Защищённые custom-format PostgreSQL backups восстановлены в одноразовые БД. Новая версия успешно мигрировала test-копию V94 → V99 и production-копию V92 → V99, failed migrations — 0.
- Старые backend-образы успешно запущены на этих же обновлённых копиях: проверена возможность отката приложения без отката схемы.
- Проверочные контейнеры работали в Docker internal network без внешнего доступа; временные контейнеры и их данные удалены после проверки.

## Выкладка и результат

- Test backend started: `2026-09-19T13:38:17Z`, frontend: `13:38:38Z`.
- Production backend started: `2026-09-19T13:39:55Z`, frontend: `13:40:16Z`.
- Все четыре приложения healthy, обе рабочие БД на V99, неуспешных миграций нет.
- Пересозданы только приложения через явные compose project/service и `--no-deps --no-build --pull never`. PostgreSQL и Redis не пересоздавались.
- Production backend получил обязательный `CORS_ALLOWED_ORIGINS=https://rcmarket.io,https://www.rcmarket.io`; test сохраняет только `https://test.rcmarket.io`.
- Frontend environment ограничен URL/public configuration и runtime-параметрами. Backend-секреты, ранее попадавшие в production frontend, удалены из его окружения. Ротация самих backend/provider secrets в этот релиз не входила.
- SERVER_API_URL frontend направлен на backend внутри соответствующей Docker network.
- Канонические compose-файлы обновлены на конкретные tagged images. Формат — JSON, допустимый для Compose, права 0600. Старые checkout/Dockerfile/certs сохранены; они не доказывают версию запущенного image.

Smoke на обоих HTTPS-доменах: главная, каталог, корзина, reset-страница, categories/products/storefront APIs — 200; anonymous session — 204; profile/admin/unknown API — 403. Разрешённый CORS origin проверен напрямую на backend, чужой origin отклонён по внешнему HTTPS; production origin отклонён test backend. TLS проверялся штатно.

Dev-only `/design-system` скрыт через Next notFound/noindex; при streaming ответ имеет HTTP 200 с `NEXT_HTTP_ERROR_FALLBACK;404`, поэтому один transport status не считается доказательством доступности демонстрационной страницы.

В браузере проверены главная/каталог обоих окружений и карточка товара test. Это базовая проверка выкладки, не полная пользовательская приёмка кабинетов или всех мобильных состояний.

## Резервные копии и откат

- Test: `/home/ubuntu/rcm-test/.backup-20260919/`.
- Production: `/home/ubuntu/rcm-deploy/.backup-20260919/`.
- Копии содержат прежние env/Compose, metadata старых контейнеров и database.dump; каталог 0700, секретные файлы 0600.
- Старые images закреплены тегами `rcm-test-backend:rollback-20260919`, `rcm-test-frontend:rollback-20260919`, `rcm-backend:rollback-20260919`, `rcm-frontend:rollback-20260919`.
- В release есть `test-rollback.compose.json` и `prod-rollback.compose.json`. Обычный откат — запуск соответствующих прежних application images с прежней конфигурацией, без восстановления рабочей БД и без Flyway repair/clean. После отката нужно сохранить выбранную конфигурацию и в каноническом compose-файле, иначе следующий up вернёт новый релиз.
- Автоматический/ручной откат при этой выкладке не понадобился.

## Что не считается закрытым

Реальные платежи, письма, OAuth, заказы, возвраты, доставка и уведомления не инициировались проверочными действиями. Полный бизнес-E2E и оставшиеся B1–B7 из BACKEND_PLAN.md остаются открытыми. Существующие фоновые процессы приложений продолжают работать с обычной конфигурацией окружений.

Общий внешний notification-gateway отдельно не обновлялся. Изоляция S3, firewall, Redis persistence/лимиты и остальная инфраструктурная очередь этим релизом целиком не закрыты. Локальные Mac-товары/demo-импорт и данные локальной БД на серверы не переносились.
