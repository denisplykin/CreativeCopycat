# Настройка ключей для вашего проекта

## ✅ Что уже есть

- **Supabase URL**: `https://osokxlweresllgbclkme.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDAxMzAsImV4cCI6MjA3NzkxNjEzMH0.HZ1EjhvhUl882G7ra6xyWHvmswUle3JnhnSjkGSiYXg`

## ⚠️ Что нужно получить

### 1. Service Role Key (ОБЯЗАТЕЛЬНО)

**Где взять:**
1. Откройте: https://supabase.com/dashboard/project/osokxlweresllgbclkme/settings/api
2. Прокрутите до раздела **"Project API keys"**
3. Найдите строку **"service_role"** с пометкой `secret`
4. Нажмите кнопку **"Reveal"** (иконка глаза)
5. Скопируйте длинный ключ (должен начинаться с `eyJhbGc...`)

**Выглядит так:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.xxxxxx...
```

⚠️ **Важно**: Ключ `sb_secret_ca-MUFemWuUMKlBtpvUWcw_PIhiOv23` - это database password, НЕ service_role key!

### 2. OpenRouter Key (для генерации текста)

**Где взять:**
1. Зарегистрируйтесь на https://openrouter.ai
2. Перейдите в Keys: https://openrouter.ai/keys
3. Нажмите "Create Key"
4. Скопируйте ключ (начинается с `sk-or-v1-...`)
5. Пополните баланс на $5-10: https://openrouter.ai/credits

### 3. OpenAI Key (для генерации изображений DALL·E)

**Где взять:**
1. Зарегистрируйтесь на https://platform.openai.com
2. Перейдите в API Keys: https://platform.openai.com/api-keys
3. Нажмите "Create new secret key"
4. Скопируйте ключ (начинается с `sk-...`)
5. Добавьте способ оплаты в Billing

**Стоимость:**
- Анализ: ~$0.01 за креатив
- Простая копия: ~$0.01 за копию
- DALL·E копия: ~$0.04 за копию

## 📝 Создание .env.local

**Создайте файл `.env.local`** в корне проекта (рядом с `package.json`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://osokxlweresllgbclkme.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDAxMzAsImV4cCI6MjA3NzkxNjEzMH0.HZ1EjhvhUl882G7ra6xyWHvmswUle3JnhnSjkGSiYXg
SUPABASE_SERVICE_ROLE_KEY=вставьте_сюда_service_role_key_из_шага_1

# OpenRouter
OPENROUTER_API_KEY=вставьте_сюда_openrouter_key_из_шага_2

# OpenAI
OPENAI_API_KEY=вставьте_сюда_openai_key_из_шага_3
```

## 🚀 Запуск

После создания файла `.env.local`:

```bash
npm run dev
```

Откройте: http://localhost:3000

## ✅ Проверка

Если всё настроено правильно:
- Страница загружается без ошибок
- Нет ошибок в консоли браузера (F12)
- Нет ошибок в терминале

## 🆘 Если не работает

**"Failed to fetch creatives"** → Проверьте SUPABASE_SERVICE_ROLE_KEY

**"Failed to analyze"** → Проверьте OPENROUTER_API_KEY и баланс

**"Failed to generate copy"** → Проверьте OPENAI_API_KEY и способ оплаты

## 📦 Следующие шаги

1. Настройте базу данных: запустите `supabase/schema.sql`
2. Создайте Storage buckets: `creatives`, `backgrounds`, `renders`
3. Загрузите тестовое изображение
4. Добавьте запись в таблицу `creatives`

Подробнее в [QUICKSTART.md](QUICKSTART.md)

