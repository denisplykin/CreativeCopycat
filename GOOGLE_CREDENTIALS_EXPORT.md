# 📤 Экспорт Google Service Account Credentials

Этот файл содержит все необходимые данные для настройки Google Service Account в другом проекте.

## 📋 Информация о Service Account

```
Project ID: revenue-collection-463213
Service Account Email: apify-311@revenue-collection-463213.iam.gserviceaccount.com
Client ID: 117203096037583892744
Private Key ID: 010ba459af543a12cd05e0e073177eb2cea68665
```

## 📁 Файлы для копирования

### 1. service-account.json
Скопируйте файл `service-account.json` из корня проекта.

### 2. .env.example
Скопируйте файл `.env.example` и переименуйте в `.env`, затем заполните значениями.

## 🔑 Переменные окружения

Скопируйте эти переменные в ваш `.env` файл:

```bash
# Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=apify-311@revenue-collection-463213.iam.gserviceaccount.com
GOOGLE_PROJECT_ID=revenue-collection-463213
GOOGLE_CLIENT_ID=117203096037583892744
GOOGLE_PRIVATE_KEY_ID=010ba459af543a12cd05e0e073177eb2cea68665

# Google Sheets
GOOGLE_SHEETS_SPREADSHEET_ID=1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw
GOOGLE_SHEETS_NAME=Competitor Ads

# Supabase
SUPABASE_URL=https://osokxlweresllgbclkme.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ
```

⚠️ **Примечание**: `GOOGLE_PRIVATE_KEY` слишком длинный для отображения здесь. 
Используйте файл `service-account.json` или `.env` для получения полного ключа.

## 📦 Что скопировать в новый проект

1. ✅ `service-account.json` - полные credentials в JSON формате
2. ✅ `.env.example` - шаблон для переменных окружения
3. ✅ `CREDENTIALS_SETUP.md` - документация по настройке

## 🚀 Быстрая настройка

```bash
# В новом проекте
cp /path/to/Competitors-scrapper/service-account.json .
cp /path/to/Competitors-scrapper/.env.example .env
# Отредактируйте .env с вашими значениями
```

## ✅ Проверка

После копирования файлов проверьте:

1. Файл `service-account.json` существует и содержит валидный JSON
2. Файл `.env` существует и содержит все необходимые переменные
3. Файлы добавлены в `.gitignore`

---

**Готово к использованию!** 🎉

