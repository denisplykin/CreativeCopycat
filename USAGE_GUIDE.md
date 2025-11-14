# 📘 Creative Copycat - Руководство пользователя

## 🎯 Что делает система

Creative Copycat анализирует креативы конкурентов и создаёт их вариации:

1. **OCR (распознавание текста)** - извлекает весь текст из изображения
2. **LLM анализ** - определяет роли текста (hook, twist, CTA)
3. **Генерация вариаций** - создаёт новые версии с разными подходами
4. **Сохранение результатов** - всё хранится в Supabase

---

## 🚀 Быстрый старт

### 1️⃣ Просмотр креативов

Откройте веб-интерфейс: `https://your-vercel-app.vercel.app/creatives`

**Возможности:**
- 🔍 Поиск по конкуренту
- 📊 Фильтр по статусу (pending, analyzing, completed, failed)
- 📄 Пагинация (20 креативов на страницу)
- Всего импортировано: **161 креатив**

---

### 2️⃣ Анализ креатива

#### Через UI:
1. Кликните на креатив из списка
2. Нажмите кнопку **"Analyze"**
3. Дождитесь завершения

#### Через API:
```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"creativeId": "uuid-here"}'
```

#### Что анализируется:

**OCR (Tesseract.js):**
- Извлекаются все текстовые блоки
- Bounding boxes (координаты)
- Confidence score для каждого блока
- Общий confidence анализа
- Язык: Indonesian или English

**LLM анализ (OpenRouter):**
- Определяются роли текста:
  - `hook` - привлекает внимание
  - `twist` - основное предложение
  - `cta` - призыв к действию
  - `body` - дополнительный текст
  - `headline` - заголовок
  - `subheadline` - подзаголовок

**Layout:**
- Размер canvas
- Позиции элементов
- Стили текста (размер, шрифт, цвет)

**Визуальный анализ:**
- Доминирующие цвета (top 5)
- Aspect ratio (landscape/portrait/square)

#### Пример результата в Supabase:

```json
{
  "ocr": {
    "blocks": [
      {
        "text": "Belajar Coding untuk Anak",
        "bbox": { "x": 50, "y": 100, "width": 400, "height": 60 },
        "confidence": 0.95
      }
    ],
    "fullText": "Belajar Coding untuk Anak\nDiskon 50%\nDaftar Sekarang",
    "confidence": 0.93,
    "language": "id"
  },
  "roles": [
    { "role": "headline", "text": "Belajar Coding untuk Anak" },
    { "role": "twist", "text": "Diskon 50%" },
    { "role": "cta", "text": "Daftar Sekarang" }
  ],
  "layout": {
    "canvasSize": { "width": 1080, "height": 1080 },
    "elements": [...]
  },
  "dominant_colors": ["#FF5733", "#3498DB", "#FFFFFF", "#000000", "#FFC300"],
  "language": "id",
  "aspect_ratio": "1080x1080 (square)"
}
```

---

### 3️⃣ Генерация вариаций

#### 4 режима генерации:

#### 🎨 **Simple Overlay** (быстро)
Накладывает новый текст поверх оригинала
```bash
curl -X POST https://your-app.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "creativeId": "uuid",
    "generationType": "full_creative",
    "copyMode": "simple_overlay",
    "newTexts": {
      "text0": "New Headline",
      "text1": "New Body",
      "text2": "New CTA"
    }
  }'
```

#### 🖌️ **DALL-E Inpaint** (качественно)
Убирает старый текст через DALL-E и накладывает новый
```bash
curl -X POST https://your-app.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "creativeId": "uuid",
    "generationType": "full_creative",
    "copyMode": "dalle_inpaint",
    "inpaintPrompt": "educational background with clean space for text",
    "newTexts": { ... }
  }'
```

#### 🌈 **Background Regen** (креатив)
Генерирует новый фон с DALL-E
```bash
curl -X POST https://your-app.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "creativeId": "uuid",
    "generationType": "background",
    "copyMode": "bg_regen",
    "stylePreset": "anime",
    "backgroundPrompt": "colorful anime style learning environment"
  }'
```

**Style Presets:**
- `anime` - аниме стиль (для детских курсов)
- `realistic` - реалистичный
- `3d` - 3D рендер
- `minimal` - минималистичный
- `sakura` - стиль с сакурой
- `original` - сохранить оригинальный стиль

#### 🤖 **New Text Pattern** (AI копирайтинг)
LLM генерирует новые тексты в стиле оригинала
```bash
curl -X POST https://your-app.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "creativeId": "uuid",
    "generationType": "full_creative",
    "copyMode": "new_text_pattern",
    "llmModel": "google/gemini-flash-1.5",
    "temperature": 0.8,
    "productDescription": "Math learning app for kids 6-12"
  }'
```

**LLM Models (OpenRouter):**
- `google/gemini-flash-1.5` - быстро, дёшево
- `anthropic/claude-3.5-sonnet` - лучшее качество
- `openai/gpt-4o` - сбалансированный

---

## 📊 Проверка результатов в Supabase

### SQL запросы для проверки:

#### Все креативы с анализом:
```sql
SELECT 
  id,
  competitor_name,
  status,
  analysis->>'language' as language,
  jsonb_array_length(analysis->'ocr'->'blocks') as text_blocks_count,
  analysis->'ocr'->>'confidence' as ocr_confidence
FROM creatives
WHERE analysis IS NOT NULL;
```

#### Полный OCR результат:
```sql
SELECT 
  competitor_name,
  analysis->'ocr'->>'fullText' as extracted_text,
  analysis->'ocr'->'blocks' as text_blocks
FROM creatives
WHERE id = 'your-creative-uuid';
```

#### Текстовые роли:
```sql
SELECT 
  competitor_name,
  jsonb_pretty(analysis->'roles') as text_roles
FROM creatives
WHERE id = 'your-creative-uuid';
```

#### Статистика по языкам:
```sql
SELECT 
  analysis->>'language' as language,
  COUNT(*) as count
FROM creatives
WHERE analysis IS NOT NULL
GROUP BY analysis->>'language';
```

#### Креативы с низким confidence:
```sql
SELECT 
  id,
  competitor_name,
  (analysis->'ocr'->>'confidence')::float as confidence
FROM creatives
WHERE (analysis->'ocr'->>'confidence')::float < 0.7
ORDER BY confidence ASC;
```

---

## 🐛 Отладка

### Проверить OCR качество:

1. **Откройте Supabase Dashboard**
2. **Table Editor → creatives**
3. **Выберите креатив и посмотрите поле `analysis`**

Обратите внимание на:
- `ocr.confidence` - должен быть > 0.8 для хорошего качества
- `ocr.blocks` - все ли текстовые блоки распознались
- `ocr.language` - правильно ли определён язык
- `roles` - корректно ли LLM определил роли

### Если OCR плохо распознал:

**Возможные причины:**
- Текст слишком мелкий
- Нестандартный шрифт
- Текст под углом
- Низкое разрешение изображения
- Текст на сложном фоне

**Решения:**
- Увеличьте разрешение оригинала
- Попробуйте другую модель OCR (Google Vision API)
- Предобработайте изображение (увеличьте контраст)

---

## 🔄 Workflow для массовой обработки

### Скрипт для анализа всех pending креативов:

```javascript
// scripts/analyze-all.js
const supabase = require('@supabase/supabase-js').createClient(url, key);

async function analyzeAll() {
  const { data } = await supabase
    .from('creatives')
    .select('id')
    .eq('status', 'pending');
  
  for (const creative of data) {
    await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ creativeId: creative.id })
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
  }
}
```

---

## 📈 Метрики и мониторинг

Все операции логируются в таблицу `runs`:

```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(latency_ms) as avg_latency_ms
FROM runs
GROUP BY status;
```

Просмотр последних ошибок:
```sql
SELECT 
  created_at,
  input,
  output
FROM runs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎓 Примеры использования

### Кейс 1: Анализ конкурентов Ruangguru

```bash
# 1. Найти все креативы Ruangguru
curl https://your-app.vercel.app/api/creatives | \
  jq '.creatives[] | select(.competitor_name=="Ruangguru") | .id'

# 2. Проанализировать каждый
for id in $(cat ruangguru_ids.txt); do
  curl -X POST https://your-app.vercel.app/api/analyze \
    -d "{\"creativeId\":\"$id\"}"
done

# 3. Проверить результаты в Supabase
```

### Кейс 2: Создать 10 вариаций с разными стилями

```bash
# Для каждого style preset создать вариацию
for style in anime realistic 3d minimal sakura; do
  curl -X POST https://your-app.vercel.app/api/generate \
    -d "{
      \"creativeId\":\"uuid\",
      \"generationType\":\"background\",
      \"copyMode\":\"bg_regen\",
      \"stylePreset\":\"$style\"
    }"
done
```

---

## 🔗 API Reference

### GET `/api/creatives`
Получить все креативы

**Response:**
```json
{
  "creatives": [
    {
      "id": "uuid",
      "competitor_name": "Ruangguru",
      "status": "completed",
      "analysis": { ... }
    }
  ]
}
```

### GET `/api/creatives/[id]`
Получить один креатив

### POST `/api/analyze`
Проанализировать креатив

**Request:**
```json
{ "creativeId": "uuid" }
```

### POST `/api/generate`
Сгенерировать вариацию

**Request:**
```json
{
  "creativeId": "uuid",
  "generationType": "full_creative" | "character" | "background",
  "copyMode": "simple_overlay" | "dalle_inpaint" | "bg_regen" | "new_text_pattern",
  "stylePreset": "anime" | "realistic" | "3d" | ...,
  "newTexts": { "text0": "...", "text1": "..." },
  "llmModel": "google/gemini-flash-1.5",
  "temperature": 0.7
}
```

---

## 💡 Советы

1. **Для лучшего OCR**: Используйте изображения высокого разрешения
2. **Для экономии**: Используйте `simple_overlay` вместо DALL-E
3. **Для качества**: Используйте `dalle_inpaint` + Claude
4. **Для скорости**: Используйте Gemini Flash
5. **Для A/B тестов**: Генерируйте 5-10 вариаций с разными стилями

---

## 🆘 Поддержка

Если что-то не работает:
1. Проверьте переменные окружения в Vercel
2. Посмотрите логи в Vercel Dashboard
3. Проверьте таблицу `runs` в Supabase для ошибок
4. Убедитесь что API ключи валидны

---

Создано с ❤️ для анализа EdTech креативов 🎓

