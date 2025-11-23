# 🔄 Миграция Google Service Account Credentials

## ✅ Что было сделано

### 1. Скопированы файлы credentials
- ✅ `service-account.json` - полные credentials из проекта Competitors-scrapper
- ✅ `.env.example` - шаблон для переменных окружения
- ✅ `CREDENTIALS_SETUP.md` - подробная документация
- ✅ `GOOGLE_CREDENTIALS_EXPORT.md` - экспорт-гайд

### 2. Обновлен код для поддержки множественных источников credentials

Теперь код автоматически загружает credentials в следующем порядке приоритета:

1. **Переменные окружения** (`.env` файл или системные переменные)
2. **service-account.json** (новый стандартный файл)
3. **google-credentials.json** (legacy файл, для обратной совместимости)

### 3. Обновленные файлы

- ✅ `sync-from-sheets.js` - поддержка новых credentials
- ✅ `sync-from-sheets-v2.js` - поддержка новых credentials
- ✅ `test-sheets-connection.js` - поддержка новых credentials
- ✅ `quick-test.js` - поддержка новых credentials
- ✅ `.gitignore` - добавлен `service-account.json`

## 📋 Использование

### Вариант 1: Использовать service-account.json (рекомендуется)

Файл уже скопирован в проект. Просто используйте:

```bash
node sync-from-sheets.js
```

Код автоматически найдет и использует `service-account.json`.

### Вариант 2: Использовать переменные окружения

1. Скопируйте `.env.example` в `.env`:
   ```bash
   cp .env.example .env
   ```

2. Заполните переменные в `.env`:
   ```bash
   GOOGLE_SERVICE_ACCOUNT_EMAIL=apify-311@revenue-collection-463213.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_PROJECT_ID=revenue-collection-463213
   GOOGLE_CLIENT_ID=117203096037583892744
   GOOGLE_PRIVATE_KEY_ID=010ba459af543a12cd05e0e073177eb2cea68665
   ```

3. Запустите скрипт:
   ```bash
   node sync-from-sheets.js
   ```

### Вариант 3: Использовать существующий google-credentials.json

Старый файл `google-credentials.json` продолжит работать как fallback, если другие источники не найдены.

## 🔒 Безопасность

Все файлы с credentials добавлены в `.gitignore`:
- `.env`
- `.env.local`
- `service-account.json`
- `google-credentials.json`
- `credentials.json`

## 📊 Текущие Credentials

### Project Information
- **Project ID**: `revenue-collection-463213`
- **Service Account Email**: `apify-311@revenue-collection-463213.iam.gserviceaccount.com`
- **Client ID**: `117203096037583892744`

### Google Sheets
- **Spreadsheet ID**: `1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw`
- **Sheet Name**: `Competitor Ads`

## 🚀 Проверка работы

Протестируйте подключение:

```bash
node test-sheets-connection.js
```

Или быстрый тест:

```bash
node quick-test.js
```

## 📝 Документация

Подробная документация доступна в:
- `CREDENTIALS_SETUP.md` - полная инструкция по настройке
- `GOOGLE_CREDENTIALS_EXPORT.md` - экспорт credentials для других проектов
- `GOOGLE_SHEETS_SETUP.md` - оригинальная инструкция по настройке Google Sheets

---

**Готово!** Теперь проект CreativeCopycat использует те же credentials, что и Competitors-scrapper. 🎉


