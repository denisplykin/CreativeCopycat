# 🔍 Как работает анализ

## 📋 Что происходит сейчас

### ✅ Автоматический анализ (первые 6 креативов)

При загрузке страницы `/creatives`:
1. **Загружаются все креативы** из Supabase
2. **Автоматически запускается анализ** первых 6 pending креативов
3. **Каждый анализ стартует с задержкой 1 секунда** (чтобы не перегрузить API)
4. **Статус меняется на `analyzing`** для каждого креатива
5. **Анализы идут параллельно** (~10-15 секунд каждый)

```typescript
// app/creatives/page.tsx
useEffect(() => {
  if (creatives.length > 0) {
    autoAnalyzeFirst6();
  }
}, [creatives.length]);

const autoAnalyzeFirst6 = async () => {
  const pendingCreatives = creatives
    .filter(c => c.status === 'pending')
    .slice(0, 6); // Только первые 6!

  for (const creative of pendingCreatives) {
    fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ creativeId: creative.id }),
    });
    
    await new Promise(r => setTimeout(r, 1000)); // 1s delay
  }
};
```

### ✅ Ручной анализ (кнопка на креативе)

На каждом креативе с status `pending` или `failed`:
- **При hover** появляется кнопка "🔍 Analyze" внизу карточки
- **При клике** запускается анализ этого креатива
- **Не открывает модальное окно** (используется `event.stopPropagation()`)
- **Обновляет список** через 1 секунду после запуска

```typescript
const handleAnalyzeCreative = async (creativeId: string, event: React.MouseEvent) => {
  event.stopPropagation(); // Don't open modal!
  
  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ creativeId }),
  });
  
  setTimeout(fetchCreatives, 1000); // Refresh list
};
```

---

## 🔬 Что происходит во время анализа

### Шаг 1: Download image (1-2 секунды)
```typescript
const imageResponse = await fetch(creative.original_image_url);
const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
```

**Возможные проблемы:**
- ❌ `Failed to fetch image from URL` - bucket не публичный
- ❌ Timeout - изображение слишком большое

### Шаг 2: OCR with Tesseract.js (10-15 секунд)
```typescript
const result = await Tesseract.recognize(imageBuffer, 'eng+ind');
```

**Что происходит:**
- Tesseract скачивает языковые модели (eng, ind) **при первом запуске**
- Распознаёт текст на изображении
- Извлекает bounding boxes
- Вычисляет confidence

**Возможные проблемы:**
- ⏱️ **Долго** - Tesseract медленный (~10-15s на креатив)
- ❌ **Timeout на Vercel** - функция работает > 60 секунд (limit)
- ❌ **Low confidence** - текст мелкий или плохое качество

### Шаг 3: LLM analysis with OpenRouter (2-3 секунды)
```typescript
const rolesJson = await extractRoles(ocrResult.fullText);
```

**Что происходит:**
- Отправляет текст в OpenRouter (Gemini Flash)
- LLM определяет роли (hook, twist, CTA, body)
- Парсит JSON ответ

**Возможные проблемы:**
- ❌ `OpenRouter API key invalid` - неверный ключ
- ❌ `Rate limit` - превышен лимит запросов
- ❌ `JSON parse error` - LLM вернул невалидный JSON

### Шаг 4: Extract colors with Sharp (1 секунда)
```typescript
const dominantColors = await extractDominantColors(imageBuffer);
```

### Шаг 5: Save to Supabase (0.5 секунды)
```typescript
await updateCreativeAnalysis(creativeId, analysis);
```

---

## ⚠️ Почему 3 креатива висят на `analyzing`?

### Причина 1: Vercel Timeout ⏱️

**Проблема:** Vercel Serverless Functions имеют **timeout 60 секунд** на бесплатном плане.

**Что происходит:**
1. OCR Tesseract.js работает ~10-15 секунд
2. Если запущено 6 анализов параллельно
3. Некоторые могут упасть по timeout
4. Статус остаётся `analyzing` навсегда

**Решение:**
```bash
# Vercel Dashboard → Settings → Functions
# Function Timeout: 60s → 300s (требует Pro план)
```

Или используйте Google Vision API (быстрее):
```typescript
// lib/ocr.ts
import vision from '@google-cloud/vision';

export async function runOCR(imageBuffer: Buffer) {
  const client = new vision.ImageAnnotatorClient();
  const [result] = await client.textDetection(imageBuffer);
  // ~1-2 секунды вместо 10-15!
}
```

### Причина 2: OCR падает с ошибкой ❌

**Проблема:** Tesseract.js может упасть на некоторых изображениях.

**Что происходит:**
- Большие изображения (> 5MB)
- Нестандартные форматы
- Corrupted files

**Решение:** Проверьте логи Vercel:
```bash
# Vercel Dashboard → Deployments → Latest → Logs
# Ищите "OCR error" или "Tesseract failed"
```

Добавьте fallback:
```typescript
// lib/ocr.ts
export async function runOCR(imageBuffer: Buffer): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(...);
    return result;
  } catch (error) {
    console.error('❌ OCR error:', error);
    
    // Fallback to stub data
    return getStubOCRResult();
  }
}
```

### Причина 3: API не отвечает 🌐

**Проблема:** 
- OpenRouter API timeout
- Supabase connection timeout
- Network issues

**Решение:** Добавьте retry logic:
```typescript
// lib/llm.ts
async function callOpenRouter(prompt: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        signal: AbortSignal.timeout(30000), // 30s timeout
      });
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
    }
  }
}
```

---

## 🐛 Как проверить что происходит

### 1. Проверьте статусы в Supabase

```sql
SELECT 
  id,
  competitor_name,
  status,
  created_at,
  updated_at,
  CASE 
    WHEN status = 'analyzing' AND updated_at < NOW() - INTERVAL '2 minutes'
    THEN '⚠️ STUCK'
    ELSE '✅ OK'
  END as health
FROM creatives
WHERE status = 'analyzing'
ORDER BY updated_at DESC;
```

**Если висят > 2 минут:**
- Значит упали по timeout или ошибке
- Нужно вручную поменять статус обратно на `pending`

```sql
-- Reset stuck analyzing creatives
UPDATE creatives
SET status = 'pending'
WHERE status = 'analyzing' 
  AND updated_at < NOW() - INTERVAL '2 minutes';
```

### 2. Проверьте логи Vercel

```bash
# Vercel Dashboard → Deployments → [Latest] → Functions
# Нажмите на /api/analyze
# Смотрите Real-time logs
```

**Ищите:**
- ✅ "OCR completed" - OCR прошёл успешно
- ✅ "Roles extracted" - LLM работает
- ✅ "Saving analysis to Supabase" - сохраняется
- ❌ "OCR error" - OCR упал
- ❌ "Timeout" - превышен лимит времени
- ❌ "ETIMEDOUT" - сеть упала

### 3. Проверьте таблицу `runs`

```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(latency_ms) as avg_latency_ms
FROM runs
WHERE input->>'action' = 'analyze'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;
```

**Ожидаемые результаты:**
- `success`: должно быть большинство
- `failed`: < 10%
- `avg_latency_ms`: 10000-15000 (10-15 секунд)

**Если failed > 50%:**
- Проблема с OCR или API keys
- Проверьте переменные окружения

### 4. Тестовый запрос

```bash
# Возьмите любой pending creative ID
CREATIVE_ID="your-uuid-here"

# Запустите анализ вручную
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"creativeId\": \"$CREATIVE_ID\"}" \
  -v

# Смотрите на:
# - HTTP status (должен быть 200)
# - Response time (должен быть < 30s)
# - Response body (должен содержать analysis)
```

---

## 💡 Рекомендации

### Для тестирования:

1. **Отключите автоанализ** временно:
```typescript
// app/creatives/page.tsx
useEffect(() => {
  // COMMENTED OUT FOR TESTING
  // if (creatives.length > 0) {
  //   autoAnalyzeFirst6();
  // }
}, [creatives.length]);
```

2. **Анализируйте по одному** креативу:
- Hover на креатив
- Нажмите "Analyze"
- Дождитесь результата (10-15s)
- Проверьте в Supabase

3. **Мониторьте логи** в реальном времени:
```bash
vercel logs --follow
```

### Для production:

1. **Используйте очередь** (Bull, BullMQ, Inngest):
```typescript
// Вместо прямого вызова API
await queue.add('analyze', { creativeId });

// Worker обрабатывает по одному
queue.process('analyze', async (job) => {
  await analyzeCreative(job.data.creativeId);
});
```

2. **Добавьте webhook** для обновления статуса:
```typescript
// После успешного анализа
await fetch('https://your-app.vercel.app/api/webhook/analyze-complete', {
  body: JSON.stringify({ creativeId, analysis }),
});
```

3. **Используйте Google Vision** вместо Tesseract:
- **10x быстрее** (1-2s вместо 10-15s)
- **Более точный**
- **Стоимость:** $1.50 за 1000 изображений

---

## 🎯 Текущая ситуация

### Что работает:
- ✅ Автоанализ первых 6
- ✅ Кнопка на каждом креативе
- ✅ Статус меняется на `analyzing`
- ✅ Spinner показывается

### Что может не работать:
- ⚠️ **OCR timeout** - если изображения большие
- ⚠️ **Vercel timeout** - если функция > 60s
- ⚠️ **Stuck в analyzing** - если упала ошибка

### Что нужно проверить:

1. **Откройте Vercel Logs:**
   - https://vercel.com/dashboard
   - Deployments → Latest → Functions
   - Ищите `/api/analyze` errors

2. **Проверьте Supabase:**
   ```sql
   SELECT status, COUNT(*) FROM creatives GROUP BY status;
   ```
   - Если много `analyzing` > 2 минут → reset them

3. **Запустите один тест:**
   - Hover на любой pending креатив
   - Нажмите "Analyze"
   - Откройте DevTools → Network
   - Смотрите на `/api/analyze` request
   - Ждите response (должен быть < 30s)

---

## 🚑 Quick Fix для висящих креативов

```sql
-- 1. Найти зависшие
SELECT id, competitor_name, updated_at 
FROM creatives 
WHERE status = 'analyzing' 
  AND updated_at < NOW() - INTERVAL '2 minutes';

-- 2. Reset их статус
UPDATE creatives 
SET status = 'pending'
WHERE status = 'analyzing' 
  AND updated_at < NOW() - INTERVAL '2 minutes';

-- 3. Попробовать заново через UI
```

---

**Дайте знать какие ошибки видите в Vercel logs - помогу точно исправить!** 🔧

