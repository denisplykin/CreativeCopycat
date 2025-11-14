# 🔧 Next Steps: Real OCR Integration

## ❌ Текущая проблема

**Tesseract.js не работает в Vercel serverless:**
```
Error: Cannot find module '/var/task/.next/server/app/worker-script/node/index.js'
```

**Причина:**
- Tesseract.js использует Node.js Worker Threads
- Vercel serverless functions не поддерживают worker threads
- Это ограничение AWS Lambda (на котором работает Vercel)

**Временное решение:**
- OCR возвращает stub данные (фейковые)
- Остальной flow работает (LLM, generation, UI)
- Можно тестировать всё кроме реального распознавания текста

---

## ✅ Лучшее решение: Google Cloud Vision API

### Почему Google Vision:
- ✅ **Работает в serverless** (HTTP API, не требует workers)
- ✅ **Очень быстро** (1-2 секунды вместо 10-15)
- ✅ **Лучшая точность** (Google's ML модели)
- ✅ **Поддержка 50+ языков** включая Indonesian
- ✅ **Reasonable цена** ($1.50 за 1000 изображений)

### Как интегрировать:

#### 1. Создать Google Cloud Project

```bash
# 1. Перейти на https://console.cloud.google.com
# 2. Create New Project
# 3. Enable Vision API
# 4. Create Service Account
# 5. Download JSON key
```

#### 2. Добавить credentials в Vercel

```bash
# Vercel Dashboard → Settings → Environment Variables

# Add:
GOOGLE_VISION_CREDENTIALS=<paste full JSON key here as string>
# или
GOOGLE_APPLICATION_CREDENTIALS=/tmp/vision-key.json
```

#### 3. Обновить package.json

```json
{
  "dependencies": {
    "@google-cloud/vision": "^4.0.0"
  }
}
```

#### 4. Обновить lib/ocr.ts

```typescript
import vision from '@google-cloud/vision';
import type { OCRResult, TextBlock } from '@/types/creative';

let visionClient: vision.ImageAnnotatorClient | null = null;

function getVisionClient() {
  if (!visionClient) {
    // Parse credentials from env var
    const credentials = JSON.parse(
      process.env.GOOGLE_VISION_CREDENTIALS || '{}'
    );
    
    visionClient = new vision.ImageAnnotatorClient({
      credentials,
    });
  }
  return visionClient;
}

export async function runOCR(imageBuffer: Buffer): Promise<OCRResult> {
  try {
    console.log('🔍 Starting OCR with Google Vision API...');
    
    const client = getVisionClient();
    
    // Call Vision API
    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });
    
    const detections = result.textAnnotations || [];
    
    if (detections.length === 0) {
      console.warn('⚠️ No text detected');
      return getStubOCRResult();
    }
    
    // First annotation is full text
    const fullText = detections[0]?.description || '';
    
    // Rest are individual words/blocks
    const blocks: TextBlock[] = detections.slice(1).map(annotation => {
      const vertices = annotation.boundingPoly?.vertices || [];
      const x = Math.min(...vertices.map(v => v.x || 0));
      const y = Math.min(...vertices.map(v => v.y || 0));
      const maxX = Math.max(...vertices.map(v => v.x || 0));
      const maxY = Math.max(...vertices.map(v => v.y || 0));
      
      return {
        text: annotation.description || '',
        bbox: {
          x,
          y,
          width: maxX - x,
          height: maxY - y,
        },
        confidence: annotation.confidence || 0.9,
      };
    });
    
    // Group blocks on same line
    const groupedBlocks = groupTextBlocks(blocks);
    
    console.log(`✅ Vision API: ${groupedBlocks.length} blocks detected`);
    
    return {
      blocks: groupedBlocks,
      fullText,
      confidence: 0.95, // Vision API is very accurate
      language: detectLanguage(fullText),
    };
  } catch (error) {
    console.error('❌ Vision API error:', error);
    return getStubOCRResult();
  }
}
```

#### 5. Deploy

```bash
git add -A
git commit -m "✨ Integrate Google Cloud Vision API for OCR"
git push origin main

# Vercel will auto-deploy
```

---

## 🔄 Альтернативные решения

### Option 2: OCR.space API (Free tier)

**Pros:**
- Free tier: 25,000 requests/month
- HTTP API (работает в serverless)
- Простая интеграция

**Cons:**
- Медленнее чем Google Vision
- Менее точный
- Rate limits

```typescript
// lib/ocr.ts
export async function runOCR(imageBuffer: Buffer): Promise<OCRResult> {
  const base64Image = imageBuffer.toString('base64');
  
  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'apikey': process.env.OCR_SPACE_API_KEY!,
    },
    body: JSON.stringify({
      base64Image: `data:image/png;base64,${base64Image}`,
      language: 'eng',
    }),
  });
  
  const data = await response.json();
  const fullText = data.ParsedResults[0]?.ParsedText || '';
  
  // Convert to our format...
}
```

**Free API Key:** https://ocr.space/ocrapi

### Option 3: AWS Textract

**Pros:**
- Очень точный
- Хорошо работает с документами
- Managed by AWS

**Cons:**
- Дороже ($1.50 за 1000 + AWS costs)
- Сложнее настроить
- Overkill для креативов

### Option 4: Azure Computer Vision

**Pros:**
- Точный
- Быстрый
- Managed

**Cons:**
- Нужен Azure account
- Pricing complex

---

## 💰 Сравнение цен (для 161 креатива)

| Service | Cost per image | Total for 161 | Speed |
|---------|----------------|---------------|-------|
| **Google Vision** | $0.0015 | **$0.24** | 1-2s ⚡ |
| **OCR.space Free** | $0 (up to 25k/mo) | **FREE** | 3-5s |
| **AWS Textract** | $0.0015 + AWS | $0.30+ | 2-3s |
| **Tesseract.js** | $0 | ❌ Not working | 10-15s |

---

## 🎯 Рекомендация

### Для MVP / Testing:
**Используйте OCR.space (Free tier)**
- Бесплатно до 25k requests/month
- Простая интеграция (5 минут)
- Достаточно точный для креативов

### Для Production:
**Используйте Google Vision API**
- Лучшая точность
- Самый быстрый
- Надёжный
- Дешёвый ($0.24 за 161 креатив)

---

## 📝 Quick Start: OCR.space (5 минут)

### 1. Получить API key
```
https://ocr.space/ocrapi/freekey
```

### 2. Добавить в Vercel
```bash
# Vercel → Settings → Environment Variables
OCR_SPACE_API_KEY=<your-key>
```

### 3. Обновить lib/ocr.ts

```typescript
export async function runOCR(imageBuffer: Buffer): Promise<OCRResult> {
  try {
    console.log('🔍 Starting OCR with OCR.space...');
    
    const formData = new FormData();
    formData.append('base64Image', 
      `data:image/png;base64,${imageBuffer.toString('base64')}`
    );
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'true'); // Get bounding boxes
    
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': process.env.OCR_SPACE_API_KEY!,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!data.ParsedResults?.[0]) {
      throw new Error('OCR failed');
    }
    
    const result = data.ParsedResults[0];
    const fullText = result.ParsedText || '';
    
    // Parse words with bounding boxes
    const blocks: TextBlock[] = (result.TextOverlay?.Lines || []).flatMap(
      (line: any) => line.Words.map((word: any) => ({
        text: word.WordText,
        bbox: {
          x: word.Left,
          y: word.Top,
          width: word.Width,
          height: word.Height,
        },
        confidence: 0.9, // OCR.space doesn't provide per-word confidence
      }))
    );
    
    return {
      blocks: groupTextBlocks(blocks),
      fullText,
      confidence: 0.85,
      language: detectLanguage(fullText),
    };
  } catch (error) {
    console.error('❌ OCR.space error:', error);
    return getStubOCRResult();
  }
}
```

### 4. Install FormData polyfill

```bash
npm install form-data
```

```typescript
// Add to lib/ocr.ts
import FormData from 'form-data';
```

### 5. Deploy

```bash
git commit -am "✨ Integrate OCR.space API"
git push origin main
```

---

## 🚀 Текущий статус

### ✅ Что работает:
- UI с модалами
- Автоанализ первых 6
- Кнопки на карточках
- LLM analysis (roles)
- Генерация (3 режима)
- Сохранение в Supabase

### ⚠️ Что НЕ работает:
- **Реальный OCR** (возвращает stub данные)

### 🔧 Что нужно сделать:
1. **Выбрать OCR сервис** (рекомендую OCR.space для начала)
2. **Получить API key**
3. **Обновить `lib/ocr.ts`** (код выше)
4. **Deploy**
5. **Протестировать на реальных креативах**

---

## ⏱️ Время на интеграцию

- **OCR.space:** 5-10 минут
- **Google Vision:** 20-30 минут (нужен Google Cloud account)
- **AWS Textract:** 30-60 минут (сложнее настроить)

---

**Дайте знать какой сервис хотите - помогу интегрировать! 🚀**

Рекомендую начать с **OCR.space** (бесплатно + быстро).

