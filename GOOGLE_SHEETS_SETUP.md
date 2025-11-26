# 🔑 Google Sheets API Setup

## Шаг 1: Создай Service Account

1. Открой [Google Cloud Console](https://console.cloud.google.com/)
2. Создай новый проект или выбери существующий
3. Включи **Google Sheets API**:
   - Перейди в "APIs & Services" → "Enable APIs and Services"
   - Найди "Google Sheets API"
   - Нажми "Enable"

## Шаг 2: Создай Service Account Credentials

1. Перейди в [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Нажми "Create Service Account"
3. Введи имя: `creative-copycat-sheets`
4. Нажми "Create and Continue"
5. Skip role selection (нажми Continue)
6. Нажми "Done"

## Шаг 3: Создай JSON Key

1. Найди созданный Service Account в списке
2. Нажми на него
3. Перейди в "Keys" tab
4. Нажми "Add Key" → "Create new key"
5. Выбери "JSON"
6. Нажми "Create" - файл скачается автоматически

## Шаг 4: Открой доступ к таблице

1. Открой скачанный JSON файл
2. Найди поле `"client_email"` (например: `creative-copycat-sheets@project-id.iam.gserviceaccount.com`)
3. Скопируй этот email
4. Открой [твою Google Sheets таблицу](https://docs.google.com/spreadsheets/d/1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw/)
5. Нажми "Share" (вверху справа)
6. Вставь скопированный email
7. Дай права "Viewer"
8. Нажми "Send"

## Шаг 5: Настрой переменные окружения

Из скачанного JSON файла возьми:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`

### Локально (для теста):

```bash
export GOOGLE_SERVICE_ACCOUNT_EMAIL="creative-copycat-sheets@project-id.iam.gserviceaccount.com"
export GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
```

### В Vercel:

1. Открой [Vercel Dashboard](https://vercel.com/dashboard)
2. Выбери проект "CreativeCopycat"
3. Settings → Environment Variables
4. Добавь:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `creative-copycat-sheets@...`
   - `GOOGLE_PRIVATE_KEY` = `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`

⚠️ **ВАЖНО:** В `GOOGLE_PRIVATE_KEY` замени все переносы строк на `\n`

## Шаг 6: Запусти синхронизацию

```bash
node sync-from-sheets.js
```

## 🎯 Готово!

Теперь данные из Google Sheets будут синхронизироваться с БД Supabase.

---

## 📊 Формат таблицы

Убедись что в Google Sheets есть эти колонки:

| Column Name        | Description                |
|--------------------|----------------------------|
| Image URL          | URL изображения            |
| Advertiser Name    | Название конкурента        |
| Active Days        | Сколько дней активна       |
| Ad Text            | Текст рекламы (оригинал)   |
| Ad Text Eng        | Текст рекламы (английский) |
| Landing Page URL   | URL landing page           |
| CTA Button         | Текст кнопки CTA           |
| Platform Count     | Количество платформ        |
| Text Variants      | Вариантов текста           |
| Image Variants     | Вариантов изображения      |
| Media Type         | single_image / carousel    |
| Age Targeting      | Таргетинг по возрасту      |
| Course Subjects    | Предметы курсов            |
| Offers             | Офферы (скидки, FREE etc)  |
| Ad ID              | Facebook Ad ID             |

