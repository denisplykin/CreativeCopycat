# 📊 Что сохраняется в Supabase после анализа

## 🎯 Цель

После каждого анализа в таблицу `creatives` (поле `analysis` типа JSONB) сохраняется полная информация о креативе. Это позволяет вам:

1. ✅ **Проверить качество OCR** - все распознанные блоки с координатами
2. ✅ **Оценить точность** - confidence score для каждого элемента  
3. ✅ **Понять структуру** - роли текста определённые LLM
4. ✅ **Увидеть стиль** - доминирующие цвета и layout
5. ✅ **Найти проблемы** - низкий confidence, пропущенный текст

---

## 📦 Структура поля `analysis`

```typescript
{
  ocr: {
    blocks: Array<{
      text: string;              // Распознанный текст
      bbox: {
        x: number;               // Координата X (px)
        y: number;               // Координата Y (px)
        width: number;           // Ширина блока (px)
        height: number;          // Высота блока (px)
      };
      confidence: number;        // Уверенность OCR (0-1)
    }>;
    fullText: string;            // Весь текст одной строкой
    confidence: number;          // Общая уверенность OCR
    language: 'id' | 'en';      // Определённый язык
  };
  
  layout: {
    canvasSize: {
      width: number;             // Ширина изображения
      height: number;            // Высота изображения
    };
    elements: Array<{
      type: 'text';
      bbox: {...};               // Координаты элемента
      style: {
        fontSize: number;
        fontFamily: string;
        color: string;
        align: string;
        fontWeight: string;
      };
    }>;
  };
  
  roles: Array<{
    role: 'hook' | 'twist' | 'cta' | 'body' | 'headline' | 'subheadline';
    text: string;                // Текст из OCR
    bbox?: {...};                // Координаты (опционально)
  }>;
  
  dominant_colors: string[];     // ['#FF5733', '#3498DB', ...]
  language: 'id' | 'en';
  aspect_ratio: string;          // "1080x1080 (square)"
}
```

---

## 🔍 Примеры реальных данных

### Пример 1: Kodland Indonesia (хорошее распознавание)

```json
{
  "ocr": {
    "blocks": [
      {
        "text": "KURSUS CODING",
        "bbox": { "x": 120, "y": 80, "width": 840, "height": 120 },
        "confidence": 0.97
      },
      {
        "text": "UNTUK ANAK 6-17 TAHUN",
        "bbox": { "x": 150, "y": 220, "width": 780, "height": 60 },
        "confidence": 0.94
      },
      {
        "text": "Belajar coding dengan fun!",
        "bbox": { "x": 200, "y": 500, "width": 680, "height": 80 },
        "confidence": 0.89
      },
      {
        "text": "DAFTAR SEKARANG",
        "bbox": { "x": 400, "y": 900, "width": 280, "height": 70 },
        "confidence": 0.96
      }
    ],
    "fullText": "KURSUS CODING\nUNTUK ANAK 6-17 TAHUN\nBelajar coding dengan fun!\nDAFTAR SEKARANG",
    "confidence": 0.94,
    "language": "id"
  },
  "roles": [
    {
      "role": "headline",
      "text": "KURSUS CODING"
    },
    {
      "role": "subheadline",
      "text": "UNTUK ANAK 6-17 TAHUN"
    },
    {
      "role": "body",
      "text": "Belajar coding dengan fun!"
    },
    {
      "role": "cta",
      "text": "DAFTAR SEKARANG"
    }
  ],
  "layout": {
    "canvasSize": { "width": 1080, "height": 1080 },
    "elements": [
      {
        "type": "text",
        "bbox": { "x": 120, "y": 80, "width": 840, "height": 120 },
        "style": {
          "fontSize": 84,
          "fontFamily": "Arial, sans-serif",
          "color": "#FFFFFF",
          "align": "center",
          "fontWeight": "bold"
        }
      }
      // ... остальные элементы
    ]
  },
  "dominant_colors": ["#FF6B35", "#004E89", "#FFFFFF", "#FFC300", "#1A1A1A"],
  "language": "id",
  "aspect_ratio": "1080x1080 (square)"
}
```

**✅ Что проверять:**
- `confidence: 0.94` - отличное распознавание
- 4 текстовых блока - все основные элементы найдены
- `language: "id"` - правильно определён индонезийский
- Все роли определены корректно

---

### Пример 2: Ruangguru (среднее качество)

```json
{
  "ocr": {
    "blocks": [
      {
        "text": "Belajar Matematika",
        "bbox": { "x": 100, "y": 150, "width": 600, "height": 80 },
        "confidence": 0.88
      },
      {
        "text": "Diskon 50% hari ini",
        "bbox": { "x": 120, "y": 450, "width": 840, "height": 90 },
        "confidence": 0.76
      },
      {
        "text": "Download App",  // Пропущено "Sekarang"
        "bbox": { "x": 350, "y": 850, "width": 380, "height": 65 },
        "confidence": 0.71
      }
    ],
    "fullText": "Belajar Matematika\nDiskon 50% hari ini\nDownload App",
    "confidence": 0.78,
    "language": "id"
  },
  "roles": [
    {
      "role": "headline",
      "text": "Belajar Matematika"
    },
    {
      "role": "twist",
      "text": "Diskon 50% hari ini"
    },
    {
      "role": "cta",
      "text": "Download App"
    }
  ],
  "dominant_colors": ["#00C896", "#FFFFFF", "#1F1F1F", "#FFD93D", "#6C63FF"],
  "language": "id",
  "aspect_ratio": "1080x1350 (portrait)"
}
```

**⚠️ Проблемы:**
- `confidence: 0.78` - среднее качество, возможны ошибки
- Пропущено слово "Sekarang" в CTA
- Только 3 блока вместо 4+
- Низкий confidence у блока 2 и 3

**💡 Что делать:**
- Проверить оригинальное изображение
- Возможно текст слишком мелкий
- Рассмотреть предобработку изображения

---

### Пример 3: Bright Champs (плохое распознавание)

```json
{
  "ocr": {
    "blocks": [
      {
        "text": "Brqht Champs",  // Ошибка: "Bright" → "Brqht"
        "bbox": { "x": 50, "y": 100, "width": 500, "height": 60 },
        "confidence": 0.54
      },
      {
        "text": "Lea n Cod ng",   // Ошибка: разделены слова
        "bbox": { "x": 80, "y": 300, "width": 920, "height": 100 },
        "confidence": 0.48
      }
    ],
    "fullText": "Brqht Champs\nLea n Cod ng",
    "confidence": 0.51,
    "language": "en"
  },
  "roles": [
    {
      "role": "headline",
      "text": "Brqht Champs"
    },
    {
      "role": "body",
      "text": "Lea n Cod ng"
    }
  ],
  "dominant_colors": ["#9B59B6", "#FFFFFF", "#E74C3C", "#3498DB", "#2C3E50"],
  "language": "en",
  "aspect_ratio": "1080x1920 (portrait)"
}
```

**❌ Серьёзные проблемы:**
- `confidence: 0.51` - очень низкий, данные ненадёжны
- Много ошибок в словах
- Пропущены блоки текста
- Всего 2 блока (слишком мало)

**💡 Решения:**
1. Увеличить разрешение изображения
2. Попробовать другую OCR модель (Google Vision API)
3. Предобработать изображение:
   ```javascript
   const sharp = require('sharp');
   const processed = await sharp(image)
     .resize(2160, 2160)  // Увеличить в 2 раза
     .sharpen()           // Увеличить резкость
     .normalize()         // Нормализовать контраст
     .toBuffer();
   ```

---

## 📈 SQL запросы для анализа качества

### Найти креативы с низким confidence:

```sql
SELECT 
  id,
  competitor_name,
  original_image_url,
  (analysis->'ocr'->>'confidence')::float as confidence,
  jsonb_array_length(analysis->'ocr'->'blocks') as blocks_count
FROM creatives
WHERE (analysis->'ocr'->>'confidence')::float < 0.75
ORDER BY confidence ASC;
```

### Статистика по конкурентам:

```sql
SELECT 
  competitor_name,
  COUNT(*) as total,
  AVG((analysis->'ocr'->>'confidence')::float) as avg_confidence,
  AVG(jsonb_array_length(analysis->'ocr'->'blocks')) as avg_blocks
FROM creatives
WHERE analysis IS NOT NULL
GROUP BY competitor_name
ORDER BY avg_confidence DESC;
```

### Найти креативы с пропущенным текстом:

```sql
-- Креативы с <3 текстовых блоков (подозрительно мало)
SELECT 
  id,
  competitor_name,
  jsonb_array_length(analysis->'ocr'->'blocks') as blocks_count,
  analysis->'ocr'->>'fullText' as text
FROM creatives
WHERE jsonb_array_length(analysis->'ocr'->'blocks') < 3
AND analysis IS NOT NULL;
```

### Проверить определение языка:

```sql
SELECT 
  analysis->>'language' as language,
  COUNT(*) as count
FROM creatives
WHERE analysis IS NOT NULL
GROUP BY language;
```

### Экспортировать все тексты для проверки:

```sql
SELECT 
  competitor_name,
  analysis->'ocr'->>'fullText' as extracted_text,
  analysis->'ocr'->>'confidence' as confidence
FROM creatives
WHERE analysis IS NOT NULL
ORDER BY competitor_name;
```

---

## 🎯 Метрики качества OCR

### Отличное качество (✅):
- `confidence` > 0.85
- 4+ текстовых блока
- Все ключевые слова распознаны
- Правильный язык

### Хорошее качество (👍):
- `confidence` > 0.75
- 3+ текстовых блока
- Мелкие ошибки в словах
- Можно использовать

### Среднее качество (⚠️):
- `confidence` > 0.60
- 2-3 блока
- Есть ошибки, но понятно
- Требует проверки

### Плохое качество (❌):
- `confidence` < 0.60
- <2 блоков
- Много ошибок
- Требует переделки

---

## 🔧 Как улучшить качество

### 1. Предобработка изображения:

```javascript
const sharp = require('sharp');

async function preprocessImage(buffer) {
  return await sharp(buffer)
    .resize(2160, 2160, { fit: 'inside' })  // Увеличить
    .sharpen()                               // Резкость
    .normalize()                             // Контраст
    .greyscale()                             // Ч/Б (опционально)
    .toBuffer();
}
```

### 2. Использовать Google Vision API:

```javascript
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

async function runGoogleOCR(imageBuffer) {
  const [result] = await client.textDetection(imageBuffer);
  return result.textAnnotations;
}
```

### 3. Комбинировать несколько OCR:

```javascript
const tesseractResult = await runTesseractOCR(image);
const googleResult = await runGoogleOCR(image);

// Выбрать результат с большим confidence
const bestResult = tesseractResult.confidence > googleResult.confidence
  ? tesseractResult
  : googleResult;
```

---

## 📊 Dashboard для мониторинга

Создайте view в Supabase:

```sql
CREATE VIEW ocr_quality_dashboard AS
SELECT 
  competitor_name,
  COUNT(*) as total_creatives,
  AVG((analysis->'ocr'->>'confidence')::float) as avg_confidence,
  COUNT(CASE WHEN (analysis->'ocr'->>'confidence')::float > 0.85 THEN 1 END) as excellent,
  COUNT(CASE WHEN (analysis->'ocr'->>'confidence')::float BETWEEN 0.75 AND 0.85 THEN 1 END) as good,
  COUNT(CASE WHEN (analysis->'ocr'->>'confidence')::float BETWEEN 0.60 AND 0.75 THEN 1 END) as medium,
  COUNT(CASE WHEN (analysis->'ocr'->>'confidence')::float < 0.60 THEN 1 END) as poor,
  AVG(jsonb_array_length(analysis->'ocr'->'blocks')) as avg_blocks
FROM creatives
WHERE analysis IS NOT NULL
GROUP BY competitor_name
ORDER BY avg_confidence DESC;
```

Затем:
```sql
SELECT * FROM ocr_quality_dashboard;
```

---

## 💡 Выводы

1. **Всегда проверяйте `confidence`** - это главный показатель
2. **Смотрите на количество блоков** - слишком мало = пропущен текст
3. **Проверяйте language** - правильно ли определён
4. **Используйте SQL запросы** - для массовой проверки
5. **Улучшайте входные данные** - качество OCR = качество изображения

**Все результаты в Supabase доступны для анализа! 🎉**

