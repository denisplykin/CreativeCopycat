# 📦 Загрузка Algonova Logo в Supabase

## Вариант 1: Через Supabase Dashboard (быстрее)

1. Зайди в **Supabase Dashboard** → твой проект
2. Перейди в **Storage** → создай bucket **`assets`** (если еще нет)
   - Settings: Public bucket
3. Внутри bucket создай папку **`logos`**
4. Загрузи файл **`public/algonova-logo.png`** в папку `logos`
5. Скопируй Public URL (должен быть вида):
   ```
   https://[project-id].supabase.co/storage/v1/object/public/assets/logos/algonova-logo.png
   ```

## Вариант 2: Через API (автоматически)

Если у тебя есть локальный `.env.local` с Supabase credentials:

```bash
node scripts/upload-algonova-logo.js
```

## ✅ После загрузки

Logo URL будет автоматически использоваться в промптах для замены конкурентских логотипов на Algonova.

URL логотипа: `https://[project-id].supabase.co/storage/v1/object/public/assets/logos/algonova-logo.png`

Этот URL можно будет использовать в промптах для DALL-E для точной замены логотипов.

