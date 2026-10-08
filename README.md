# PHOTO ID

Статический сайт фотостудии в Новосибирске. Две страницы: `index.html` и `price.html`. Нет backend, npm-зависимостей приложения или обязательного шага сборки.

## Локальный запуск

Из корня проекта:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Открыть `http://127.0.0.1:8080/index.html`. Это сервер для разработки. Для публикации нужны обычный статический хостинг и HTTPS; в рамках аудита деплой не выполнялся.

## Где редактировать

- `index.html` — главная, фото, пакеты, FAQ и контакты.
- `price.html` — полный прайс с переходами к категориям. Актуальные значения сверены с файлом владельца `Прайс новый.svg`.
- `css/style.css` — базовые компоненты и токены. `scss/style.scss` содержит тот же CSS: при изменении основного файла синхронизируйте оба. Сборка Sass не требуется.
- `css/effects.css` — общие адаптивные уточнения, состояния и оформление внешнего виджета.
- `css/carousel.css`, `js/carousel.js` — галерея, перетаскивание и крупный просмотр через нативный `dialog`.
- `js/main.js` — меню и шапка; `js/priceAccordeon.js` — FAQ; `js/beforeAfterSlider.js` — сравнение; `js/effects.js` — scrollspy, отзывы и видео.
- `images/optimized` — WebP-копии. Исходные фотографии сохранены. Старые SCSS partials не подключаются к актуальным страницам.
- `css/motion.css`, `js/motion.js` — короткие анимации без скрытия содержимого, с поддержкой reduced-motion.
- `config/site.json`, `scripts/update_seo.py` — общий адрес, статические SEO-метаданные, sitemap и номер Метрики. После изменения конфигурации запустите генератор; сборка сайта не нужна.
- `js/analytics.js` — цели Метрики. Пока реальный номер счётчика не задан, подключение отключено.

Шрифты системные; Google Fonts и локальные Trial-файлы не загружаются. Видео автоматически играет фоном в видимой секции цен, при уменьшении движения остаётся постер. Виджет SmartWidgets сохраняет исходный ID, загружается при приближении к отзывам и имеет обработку ошибки/повтора. Карта сохраняет исходный адрес, рядом доступна прямая ссылка.

## Проверки без зависимостей

```powershell
python scripts/check_site.py
python tests/pricing_test.py
python tests/seo_test.py
Get-ChildItem js/*.js | ForEach-Object { node --check $_.FullName }
git diff --check
```

Статическая проверка проверяет структуру HTML, локальные файлы, якоря, уникальность ID, размеры изображений и синхронизацию CSS/SCSS. Проверка цен защищает изменённые тарифы и согласованность пакетов на двух страницах.

## Браузерная проверка

Требует Node.js, Playwright и axe. Инструменты можно установить вне проекта, не меняя зависимости сайта:

```powershell
$auditTools = Join-Path $env:TEMP 'photo-id-audit-tools'
npm install --prefix $auditTools --no-audit --no-fund playwright @axe-core/playwright
node "$auditTools/node_modules/playwright/cli.js" install chromium
$env:NODE_PATH = Join-Path $auditTools 'node_modules'
node tests/browser.cjs
node tests/integrations.cjs
node tests/motion_marketing.cjs
```

Сервер должен работать. Если используете уже установленный Chromium, задайте `$env:CHROMIUM_PATH` — полный путь к `chrome.exe`. `AUDIT_URL` меняет адрес сервера, `AUDIT_OUTPUT` — каталог результатов (по умолчанию локальный `.audit`, исключённый в `.gitignore`).

`browser.cjs` изолирует внешние запросы: проверяет две страницы, 7 основных и 10 промежуточных ширин, меню, FAQ, сравнение, галерею, просмотр фото, ошибки сети, работу без JS и touch-эмуляцию. Скриншоты и JSON сохраняются в каталог результатов. `integrations.cjs` отдельно требует Интернет и действующий аккаунт SmartWidgets: проверяет настоящие отзывы, axe на 375/1440 px, автозапуск/паузу/возобновление видео и снимает карту. Это не тест публикации отзыва: никаких сообщений не отправляется.

## Обновление изображений

Только для повторной генерации ассетов:

```powershell
python -m pip install Pillow
python scripts/optimize_images.py
```

Скрипт сохраняет оригиналы, учитывает EXIF-ориентацию и создаёт WebP в двух размерах. Зависимость Pillow нужна только этому скрипту.

Результаты и ограничения текущего аудита: [docs/AUDIT.md](docs/AUDIT.md). Полевые Core Web Vitals, Safari/Firefox и ручной screen reader-аудит требуют отдельной проверки на опубликованном сайте.

SEO, подключение фотоайди.рф, цели Метрики и готовые пути для рекламы: [docs/SEO-YANDEX.md](docs/SEO-YANDEX.md). Для обновления обложки из существующих ассетов: `node scripts/render_social_cover.cjs` с теми же Playwright/CHROMIUM_PATH. `tests/motion_marketing.cjs` проверяет настоящие анимации и контракт аналитики с браузерным перехватом, без отправки событий в чужой счётчик.
