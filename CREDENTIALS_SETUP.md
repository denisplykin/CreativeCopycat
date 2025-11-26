# 🔐 Google Service Account Credentials Setup

Этот документ описывает, как настроить Google Service Account credentials для использования в проекте.

## 📁 Файлы с Credentials

В проекте есть несколько способов хранения credentials:

### 1. **service-account.json** (рекомендуется для локальной разработки)
```json
{
  "type": "service_account",
  "project_id": "revenue-collection-463213",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "apify-311@revenue-collection-463213.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

### 2. **.env** (для переменных окружения)
```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=apify-311@revenue-collection-463213.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=revenue-collection-463213
GOOGLE_CLIENT_ID=117203096037583892744
GOOGLE_PRIVATE_KEY_ID=010ba459af543a12cd05e0e073177eb2cea68665
```

### 3. **Input параметр** (для Apify акторов)
```json
{
  "googleServiceAccountKey": "{...JSON credentials as string...}"
}
```

## 🔄 Приоритет загрузки Credentials

Код автоматически загружает credentials в следующем порядке:

1. **Input параметр** (`googleServiceAccountKey` в JSON input)
2. **Переменные окружения** (`.env` файл или системные переменные)
3. **Файл service-account.json** (в корне проекта)

## 📋 Как использовать в другом проекте

### Вариант 1: Использовать файл service-account.json

1. Скопируйте файл `service-account.json` в корень вашего проекта
2. Убедитесь, что файл добавлен в `.gitignore`:
   ```
   service-account.json
   ```
3. Код автоматически найдет и использует этот файл

### Вариант 2: Использовать переменные окружения

1. Скопируйте `.env.example` в `.env`:
   ```bash
   cp .env.example .env
   ```

2. Заполните переменные в `.env`:
   ```bash
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_PROJECT_ID=your-project-id
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_PRIVATE_KEY_ID=your-private-key-id
   ```

3. Убедитесь, что `.env` добавлен в `.gitignore`

### Вариант 3: Использовать в Apify акторе

1. Добавьте credentials в input JSON:
   ```json
   {
     "googleServiceAccountKey": "{\"type\":\"service_account\",\"project_id\":\"...\",...}"
   }
   ```

2. Или используйте Apify Secrets:
   - Создайте Secret в Apify Console
   - Используйте переменную окружения в коде

## 🔧 Пример использования в коде

### JavaScript/Node.js

```javascript
import { readFileSync } from 'fs';
import { google } from 'googleapis';

// Способ 1: Из файла
const credentials = JSON.parse(
  readFileSync('service-account.json', 'utf8')
);

// Способ 2: Из переменных окружения
const credentials = {
  type: 'service_account',
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  // ... остальные поля
};

// Инициализация Google Auth
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
```

### Python

```python
import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Способ 1: Из файла
credentials = service_account.Credentials.from_service_account_file(
    'service-account.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets']
)

# Способ 2: Из переменных окружения
credentials_dict = {
    "type": "service_account",
    "project_id": os.getenv("GOOGLE_PROJECT_ID"),
    "private_key": os.getenv("GOOGLE_PRIVATE_KEY").replace('\\n', '\n'),
    "client_email": os.getenv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    # ... остальные поля
}
credentials = service_account.Credentials.from_service_account_info(
    credentials_dict,
    scopes=['https://www.googleapis.com/auth/spreadsheets']
)

# Использование
service = build('sheets', 'v4', credentials=credentials)
```

## 🔒 Безопасность

⚠️ **ВАЖНО:**

1. **Никогда не коммитьте** credentials в Git
2. Добавьте в `.gitignore`:
   ```
   .env
   .env.local
   service-account.json
   google-credentials.json
   credentials.json
   ```
3. Используйте **Service Role Key**, а не User credentials
4. Ограничьте права доступа Service Account только необходимыми scope'ами
5. Регулярно ротируйте ключи

## 📊 Текущие Credentials

### Project Information
- **Project ID**: `revenue-collection-463213`
- **Service Account Email**: `apify-311@revenue-collection-463213.iam.gserviceaccount.com`
- **Client ID**: `117203096037583892744`

### Google Sheets
- **Spreadsheet ID**: `1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw`
- **Sheet Name**: `Competitor Ads`

## 🚀 Быстрый старт для нового проекта

1. **Скопируйте файлы:**
   ```bash
   cp service-account.json /path/to/new/project/
   cp .env.example /path/to/new/project/.env
   ```

2. **Или создайте .env:**
   ```bash
   cp .env.example .env
   # Отредактируйте .env с вашими credentials
   ```

3. **Убедитесь, что .gitignore настроен:**
   ```bash
   echo "service-account.json" >> .gitignore
   echo ".env" >> .gitignore
   ```

4. **Используйте в коде:**
   - Код автоматически найдет credentials из файла или переменных окружения
   - Приоритет: Input → Environment Variables → File

## 📝 Проверка настроек

Чтобы проверить, что credentials загружены правильно:

```javascript
const credentials = loadGoogleServiceAccountCredentials();
if (credentials) {
  console.log('✅ Credentials loaded:', credentials.client_email);
} else {
  console.log('❌ No credentials found');
}
```

## 🔗 Полезные ссылки

- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Apify Secrets](https://docs.apify.com/platform/integrations/secrets)

---

**Готово!** Теперь вы можете использовать эти credentials в любом проекте. 🎉

