# 🚀 БЫСТРЫЙ СТАРТ

## Шаг 1: Создайте .env.local

Создайте файл `.env.local` в корне проекта со следующим содержимым:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://osokxlweresllgbclkme.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDAxMzAsImV4cCI6MjA3NzkxNjEzMH0.HZ1EjhvhUl882G7ra6xyWHvmswUle3JnhnSjkGSiYXg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ
OPENROUTER_API_KEY=замените_на_ваш_ключ
OPENAI_API_KEY=замените_на_ваш_ключ
```

## Шаг 2: Установите зависимости

```bash
npm install
```

## Шаг 3: Настройте Supabase

### 3.1 Создайте таблицы базы данных

1. Откройте SQL Editor: https://supabase.com/dashboard/project/osokxlweresllgbclkme/sql/new
2. Скопируйте содержимое файла `supabase/schema.sql`
3. Вставьте в редактор и нажмите **RUN**

### 3.2 Создайте Storage buckets

1. Откройте Storage: https://supabase.com/dashboard/project/osokxlweresllgbclkme/storage/buckets
2. Создайте 3 bucket'а (все **Public**):
   - `creatives` 
   - `backgrounds`
   - `renders`

Для каждого:
- Нажмите **"New bucket"**
- Введите имя
- Включите **"Public bucket"**
- Нажмите **"Create bucket"**

## Шаг 4: Получите API ключи

### OpenRouter (для LLM)
1. Зарегистрируйтесь: https://openrouter.ai
2. Создайте ключ: https://openrouter.ai/keys
3. Пополните баланс: https://openrouter.ai/credits ($5-10)
4. Скопируйте ключ в `.env.local` → `OPENROUTER_API_KEY`

### OpenAI (для DALL·E)
1. Зарегистрируйтесь: https://platform.openai.com
2. Создайте ключ: https://platform.openai.com/api-keys
3. Добавьте способ оплаты в Billing
4. Скопируйте ключ в `.env.local` → `OPENAI_API_KEY`

## Шаг 5: Запустите проект

```bash
npm run dev
```

Откройте: http://localhost:3000

## Шаг 6: Добавьте тестовый креатив

### 6.1 Загрузите изображение

1. Откройте Storage: https://supabase.com/dashboard/project/osokxlweresllgbclkme/storage/buckets/creatives
2. Нажмите **"Upload file"**
3. Выберите любое рекламное изображение (желательно 1080x1080)
4. Запомните имя файла (например, `test.jpg`)

### 6.2 Добавьте запись в БД

1. Откройте SQL Editor: https://supabase.com/dashboard/project/osokxlweresllgbclkme/sql/new
2. Выполните:

```sql
INSERT INTO creatives (source_image_path, platform, width, height)
VALUES ('test.jpg', 'Facebook', 1080, 1080);
```

Замените `test.jpg` на имя вашего файла.

### 6.3 Проверьте результат

1. Обновите http://localhost:3000/creatives
2. Увидите ваш креатив в сетке
3. Кликните на него
4. Нажмите **"Analyze"**
5. Через 5-10 секунд увидите результаты анализа
6. Попробуйте **"Generate Copy"**

## ✅ Готово!

Теперь вы можете:
- Анализировать креативы
- Генерировать копии (4 режима)
- Создавать вариации
- Экспериментировать с разными стилями

## 📚 Документация

- **README.md** - полная документация
- **API.md** - описание API
- **QUICKSTART.md** - подробная инструкция
- **ARCHITECTURE.md** - архитектура проекта
- **DEPLOYMENT.md** - деплой на Vercel

## 🆘 Проблемы?

### "Failed to fetch creatives"
→ Проверьте ключи Supabase в `.env.local`

### "Failed to analyze"
→ Проверьте `OPENROUTER_API_KEY` и баланс

### "Failed to generate"
→ Проверьте `OPENAI_API_KEY` и способ оплаты

### Canvas ошибки
→ Выполните: `npm install canvas --build-from-source`

## 💰 Стоимость

- Анализ: ~$0.01 за креатив
- Простая копия: $0-$0.05
- DALL·E копия: $0.03-$0.09

Для тестирования 10 креативов + 50 генераций: ~$3-5

---

**Проект готов к работе! 🎉**

