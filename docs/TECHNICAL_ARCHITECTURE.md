# 🏗️ CreativeCopycat - Technical Architecture

**Техническая документация для разработчиков и продакт-менеджеров**

---

## 📋 Оглавление

1. [Архитектура системы](#архитектура-системы)
2. [Схема потоков данных](#схема-потоков-данных)
3. [API Endpoints](#api-endpoints)
4. [Типы данных](#типы-данных)
5. [Pipeline генерации](#pipeline-генерации)
6. [Database Schema](#database-schema)
7. [Environment Variables](#environment-variables)
8. [Error Handling](#error-handling)
9. [Optimization Points](#optimization-points)

---

## 🏛️ Архитектура системы

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS

**Backend:**
- Next.js API Routes (Node.js)
- Server-side rendering

**Database:**
- Supabase (PostgreSQL)

**AI Services:**
- OpenAI GPT-4o (Vision analysis)
- OpenAI DALL-E gpt-image-1 (Image editing)

**Image Processing:**
- Sharp (Node.js library)

**Storage:**
- Supabase Storage (uploaded images)
- Temporary buffers (generated images)

---

## 🔄 Схема потоков данных

### High-Level Flow

```
User → Frontend → API Route → AI Pipeline → Database → Frontend → User
```

### Detailed Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                         │
│                     (app/creatives/page.tsx)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ POST /api/generate
                             │ { creativeId, copyMode, aspectRatio }
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API ROUTE HANDLER                         │
│                  (app/api/generate/route.ts)                    │
│                                                                 │
│  1. Validate request                                            │
│  2. Load creative from Supabase                                 │
│  3. Download original image                                     │
│  4. Determine modifications based on copyMode                   │
│  5. Call AI Pipeline                                            │
│  6. Upload result to Supabase Storage                           │
│  7. Save creative_run record                                    │
│  8. Return result URL                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ generateMaskEdit()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AI PIPELINE                              │
│                   (lib/openai-image.ts)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │ STEP 1: Analyze (GPT-4o Vision)                 │          │
│  │ Input: Image Buffer                              │          │
│  │ Output: Layout JSON (bbox, elements, art_style) │          │
│  └────────────────┬─────────────────────────────────┘          │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────┐          │
│  │ STEP 2: Generate Mask                            │          │
│  │ Input: Layout JSON + editTypes                   │          │
│  │ Output: Binary mask (white areas to edit)       │          │
│  └────────────────┬─────────────────────────────────┘          │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────┐          │
│  │ STEP 3: DALL-E Inpainting                        │          │
│  │ Input: Image + Mask + Prompt                     │          │
│  │ Output: Edited image                             │          │
│  └────────────────┬─────────────────────────────────┘          │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────┐          │
│  │ STEP 4: Restore Aspect Ratio                     │          │
│  │ Input: Generated image                           │          │
│  │ Output: Resized to original dimensions          │          │
│  └────────────────┬─────────────────────────────────┘          │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────┐          │
│  │ STEP 5: Overlay Logo (PNG)                       │          │
│  │ Input: Generated image + logo bbox               │          │
│  │ Output: Final image with perfect logo           │          │
│  └────────────────┬─────────────────────────────────┘          │
│                   │                                             │
│                   │ Return: Buffer                              │
└───────────────────┼─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE STORAGE                           │
│                                                                 │
│  Upload: /generated/{creativeId}/{timestamp}.png                │
│  Return: Public URL                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### POST `/api/generate`

**Описание:** Генерация нового креатива на основе оригинала

**Request Body:**
```typescript
{
  creativeId: string;          // ID креатива в Supabase
  generationType: 'full_creative';
  copyMode: 'simple_copy' | 'slightly_different' | 'copy_with_color';
  aspectRatio: 'original';     // Сохранить оригинальные пропорции
  configGenerationType?: 'simple' | 'custom';
  customPrompt?: string;       // Для custom mode
}
```

**Response (Success):**
```typescript
{
  creative: Creative;          // Обновленный объект креатива
  generated_url: string;       // URL сгенерированного изображения
}
```

**Response (Error):**
```typescript
{
  error: string;               // Описание ошибки
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `429` - Rate limit exceeded (OpenAI)
- `500` - Internal server error

---

### GET `/api/creatives`

**Описание:** Получить список всех креативов

**Response:**
```typescript
{
  creatives: Creative[];
}
```

---

### POST `/api/creatives/upload`

**Описание:** Загрузить новый креатив

**Request:** `multipart/form-data`
- `file`: Image file
- `competitor_name`: string

**Response:**
```typescript
{
  creative: Creative;
}
```

---

## 📦 Типы данных

### Creative
```typescript
interface Creative {
  id: string;                  // UUID
  competitor_name: string;     // Название конкурента
  original_url: string;        // URL оригинального изображения
  generated_url?: string;      // URL последней генерации
  created_at: string;          // ISO timestamp
  updated_at: string;          // ISO timestamp
}
```

### BannerLayout
```typescript
interface BannerLayout {
  image_size: {
    width: number;
    height: number;
  };
  art_style?: string;          // anime | realistic | cartoon | illustration | 3d | photo
  background: {
    color: string;
    description: string;
  };
  elements: LayoutElement[];
}
```

### LayoutElement
```typescript
interface LayoutElement {
  id: string;
  type: 'text' | 'character' | 'logo' | 'button' | 'decor' | 'other';
  role: 'headline' | 'body' | 'cta' | 'brand' | 'primary' | 'shape' | 'other';
  text?: string | null;        // Текстовое содержимое
  font_style?: string | null;
  color?: string | null;
  description?: string | null; // Описание элемента
  style?: string | null;       // Стиль (для персонажей)
  bbox: BoundingBox;           // Координаты элемента
  z_index: number;             // Слой
  text_effects?: string | null;
}
```

### BoundingBox
```typescript
interface BoundingBox {
  x: number;                   // Left coordinate (px)
  y: number;                   // Top coordinate (px)
  width: number;               // Width (px)
  height: number;              // Height (px)
}
```

### CreativeRun
```typescript
interface CreativeRun {
  id: string;                  // UUID
  creative_id: string;         // FK to creatives
  copy_mode: CopyMode;
  generation_type: 'full_creative';
  status: 'pending' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
```

---

## ⚙️ Pipeline генерации

### Функция: `generateMaskEdit()`

**Файл:** `lib/openai-image.ts`

**Параметры:**
```typescript
interface MaskEditParams {
  imageBuffer: Buffer;         // Оригинальное изображение
  modifications: string;       // Инструкция для AI
  editTypes?: string[];        // ['character', 'logo', 'decor']
  aspectRatio?: string;        // 'original'
}
```

**Возвращает:** `Promise<Buffer>` - Сгенерированное изображение

---

### STEP 1: Analyze (GPT-4o Vision)

**API:** `https://api.openai.com/v1/chat/completions`

**Model:** `gpt-4o`

**Input:**
```typescript
{
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: analysisPrompt },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
      ]
    }
  ],
  max_tokens: 2000,
  temperature: 0.2
}
```

**Output:** Layout JSON
```json
{
  "image_size": { "width": 600, "height": 800 },
  "art_style": "anime",
  "background": { "color": "#F5F5F5", "description": "Light gray gradient" },
  "elements": [
    {
      "id": "logo_1",
      "type": "logo",
      "role": "brand",
      "description": "Kodland logo",
      "bbox": { "x": 20, "y": 20, "width": 120, "height": 40 },
      "z_index": 10
    },
    {
      "id": "char_1",
      "type": "character",
      "role": "primary",
      "style": "anime, sketch style",
      "description": "Anime character with dark hair",
      "bbox": { "x": 100, "y": 400, "width": 400, "height": 380 },
      "z_index": 5
    }
  ]
}
```

**Стоимость:** ~$0.002 за запрос

---

### STEP 2: Generate Mask

**Функция:** `generateMask()`

**Файл:** `lib/mask-generator.ts`

**Input:**
```typescript
{
  width: 600,
  height: 800,
  boxes: [
    { x: 20, y: 20, width: 120, height: 40 },   // Logo bbox
    { x: 100, y: 400, width: 400, height: 380 } // Character bbox
  ]
}
```

**Process:**
1. Создать черный canvas (600x800)
2. Для каждого bbox:
   - Нарисовать белый прямоугольник
3. Вернуть PNG buffer

**Output:** Binary mask (белые области = edit, черные = keep)

```
Black image with white rectangles where logo and character are
```

**Стоимость:** Бесплатно (локальная обработка)

---

### STEP 3: DALL-E Inpainting

**API:** `https://api.openai.com/v1/images/edits`

**Model:** `gpt-image-1`

**Input (FormData):**
```typescript
{
  model: 'gpt-image-1',
  image: File (PNG, <4MB),           // Оригинал
  mask: File (PNG, same size),       // Маска
  prompt: string,                     // Инструкция
  quality: 'high',                    // 'standard' | 'high'
  n: 1
}
```

**Prompt Examples:**

**Simple Copy (logo only):**
```
"Professional advertising design with text 'Algonova' in purple color #833AE0."
```

**Slightly Different:**
```
"Professional advertising design with 1 character in anime, sketch style. 
 Maintain exact same art style, composition, and character type. 
 Only minor expression/pose variation. 
 Include text 'Algonova' in purple color #833AE0."
```

**Copy + Color:**
```
"Professional advertising design with text 'Algonova' in purple color #833AE0, 
 maintaining existing layout."
```

**Output:** 
- Format: `b64_json` or `url`
- Size: May differ from input (DALL-E behavior)

**Стоимость:** ~$0.16 за запрос (quality: high)

**⚠️ Important:**
- Image and mask MUST be same size
- Both must be PNG format
- Both must be <4MB each
- Rate limit: 5 requests/min

---

### STEP 4: Restore Aspect Ratio

**Library:** Sharp

**Input:** Generated image buffer from DALL-E

**Logic:**
```typescript
const editedMetadata = await sharp(resultBuffer).metadata();
const originalWidth = layout.image_size.width;
const originalHeight = layout.image_size.height;

// Calculate aspect ratio difference
const currentAspect = editedMetadata.width / editedMetadata.height;
const targetAspect = originalWidth / originalHeight;
const aspectDiff = Math.abs(currentAspect - targetAspect) / targetAspect;

// Choose resize strategy
if (isLogoOnlyEdit && aspectDiff > 0.30) {
  // Don't resize - preserve quality
  return resultBuffer;
} else if (aspectDiff <= 0.01) {
  // Use 'cover' - aspect ratios match
  return sharp(resultBuffer).resize(originalWidth, originalHeight, { fit: 'cover' });
} else {
  // Use 'inside' - prevent distortion
  return sharp(resultBuffer).resize(originalWidth, originalHeight, { fit: 'inside' });
}
```

**Output:** Resized image buffer

**Стоимость:** Бесплатно (локальная обработка)

---

### STEP 5: Overlay Logo (PNG)

**Input:**
- Generated image buffer
- Logo bbox from layout
- Logo file: `public/algonova-logo.png`

**Process:**
```typescript
// 1. Load logo
const logoBuffer = fs.readFileSync('public/algonova-logo.png');

// 2. Resize logo to fit bbox
const resizedLogo = await sharp(logoBuffer)
  .resize(bbox.width, bbox.height, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .toBuffer();

// 3. Composite logo onto generated image
resultBuffer = await sharp(resultBuffer)
  .composite([{
    input: resizedLogo,
    left: bbox.x,
    top: bbox.y
  }])
  .toBuffer();
```

**Output:** Final image with perfect Algonova logo

**Стоимость:** Бесплатно (локальная обработка)

---

## 🗄️ Database Schema

### Table: `creatives`

```sql
CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_name TEXT NOT NULL,
  original_url TEXT NOT NULL,
  generated_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table: `creative_runs`

```sql
CREATE TABLE creative_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creative_id UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  copy_mode TEXT NOT NULL,
  generation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_creative_runs_creative_id ON creative_runs(creative_id);
CREATE INDEX idx_creative_runs_created_at ON creative_runs(created_at);
CREATE INDEX idx_creative_runs_status ON creative_runs(status);
```

### Storage Buckets

**Bucket: `creatives`**
- Path: `original/{creativeId}.png` - Uploaded originals
- Path: `generated/{creativeId}/{timestamp}.png` - Generated images

**Policies:**
- Public read access
- Authenticated write access

---

## 🔐 Environment Variables

### Required

```bash
# OpenAI API
OPENAI_API_KEY=sk-proj-...                 # OpenAI API key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...       # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # Service role (server-side)

# App
NEXT_PUBLIC_APP_URL=https://...            # Production URL
```

### Optional

```bash
# Feature Flags
USE_SDXL=false                             # Use SDXL instead of DALL-E (deprecated)

# Debug
DEBUG_LOGS=true                            # Enable verbose logging
```

---

## ⚠️ Error Handling

### Common Errors

**1. Rate Limit (429)**
```typescript
{
  error: {
    type: 'input-images',
    code: 'rate_limit_exceeded',
    message: 'Rate limit reached for gpt-image...'
  }
}
```

**Handling:**
- Wait 12 seconds
- Retry request
- Save failed run in database

---

**2. Moderation Block**
```typescript
{
  error: {
    type: 'invalid_request_error',
    code: 'content_policy_violation',
    message: 'Your request was rejected as a result of our safety system.'
  }
}
```

**Handling:**
- Log error
- Return user-friendly message
- Don't retry

---

**3. Invalid API Key**
```typescript
{
  error: {
    type: 'invalid_request_error',
    code: 'invalid_api_key',
    message: 'Incorrect API key provided'
  }
}
```

**Handling:**
- Check environment variables
- Alert developer

---

**4. Image Too Large**
```typescript
{
  error: 'Image still too large: 5.2MB (max 4MB)'
}
```

**Handling:**
- Downscale image more aggressively
- Reduce quality parameter in sharp

---

## 🎯 Copy Mode Logic

### File: `app/api/generate/route.ts`

```typescript
switch (copyMode) {
  case 'simple_copy':
    modifications = `If there is a company logo, update it to Algonova.`;
    editTypes = ['logo'];
    break;

  case 'copy_with_color':
    modifications = `If there is a company logo, update it to Algonova. 
                     Apply brand colors (orange, pink, purple, cyan) to decorative elements.`;
    editTypes = ['logo', 'decor'];
    break;

  case 'slightly_different':
    modifications = `Update logo to Algonova. For character(s): keep EXACT same art style, 
                     number of characters, and composition. ONLY minor expression or pose variation.`;
    editTypes = ['character', 'logo'];
    break;
}
```

### Prompt Building

**File:** `lib/openai-image.ts`

```typescript
function buildMinimalEditPrompt(modifications: string, editTypes: string[], layout?: BannerLayout): string {
  const algonova = `text "Algonova" in purple color #833AE0`;
  
  // Logo only
  if (editTypes.includes('logo') && editTypes.length === 1) {
    return `Professional advertising design with ${algonova}.`;
  }
  
  // Character edit - use art style
  if (editTypes.includes('character') && layout) {
    const artStyle = layout.art_style || 'illustration';
    const characters = layout.elements.filter(e => e.type === 'character');
    const charCount = characters.length;
    const charStyle = characters[0]?.style || artStyle;
    
    return `Professional advertising design with ${charCount} character${charCount > 1 ? 's' : ''} 
            in ${charStyle} style. Maintain exact same art style, composition, and character type. 
            Only minor expression/pose variation. Include ${algonova}.`;
  }
  
  // Fallback
  return `Professional advertising design with ${algonova}, maintaining existing layout.`;
}
```

---

## 🚀 Optimization Points

### 1. Reduce Failed Generations

**Problem:** 15% failed → $2.50/day wasted

**Solution:**
```typescript
// Add retry logic with exponential backoff
async function retryWithBackoff(fn: Function, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const wait = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, wait));
        continue;
      }
      throw error;
    }
  }
}
```

---

### 2. Cache Analysis Results

**Problem:** Same creative → re-analyze each time

**Solution:**
```typescript
// Save layout JSON in database
CREATE TABLE creative_layouts (
  creative_id UUID PRIMARY KEY REFERENCES creatives(id),
  layout JSON NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

// Reuse layout for multiple generations
```

**Savings:** $0.002 per generation × N variations

---

### 3. Lower Quality for Batch Processing

**Problem:** High quality = $0.16 per image

**Solution:**
```typescript
const quality = isBatchProcessing ? 'standard' : 'high';
formData.append('quality', quality);
```

**Savings:** ~40% ($0.16 → $0.10)

---

### 4. Rate Limit Queue

**Problem:** 5 images/min limit → 429 errors

**Solution:**
```typescript
// Implement queue with 12s delay between requests
class GenerationQueue {
  private queue: Task[] = [];
  private processing = false;
  
  async add(task: Task) {
    this.queue.push(task);
    if (!this.processing) {
      await this.process();
    }
  }
  
  private async process() {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      await task.execute();
      await new Promise(resolve => setTimeout(resolve, 12000)); // 12s delay
    }
    this.processing = false;
  }
}
```

---

### 5. Parallel Processing (GPT-4o)

**Problem:** Analysis can be done in parallel

**Solution:**
```typescript
// Batch analyze multiple creatives
const analyses = await Promise.all(
  creatives.map(c => analyzeCreative(c.imageBuffer))
);
```

**Note:** GPT-4o has higher rate limits than DALL-E

---

## 📊 Monitoring & Analytics

### Metrics to Track

**Cost Metrics:**
```typescript
interface CostMetrics {
  total_spent: number;
  successful_generations: number;
  failed_generations: number;
  avg_cost_per_creative: number;
  daily_budget_remaining: number;
}
```

**Performance Metrics:**
```typescript
interface PerformanceMetrics {
  avg_generation_time: number;     // seconds
  p95_generation_time: number;
  rate_limit_errors: number;
  timeout_errors: number;
  success_rate: number;            // percentage
}
```

**Usage Metrics:**
```typescript
interface UsageMetrics {
  generations_by_mode: {
    simple_copy: number;
    slightly_different: number;
    copy_with_color: number;
  };
  generations_by_hour: Record<string, number>;
  top_competitors: Array<{ name: string; count: number }>;
}
```

### Implementation

```typescript
// Add to app/api/analytics/route.ts
export async function GET() {
  const { data: runs } = await supabase
    .from('creative_runs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000));
  
  const metrics = calculateMetrics(runs);
  return Response.json(metrics);
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - run: vercel deploy --prod
```

### Environment Setup

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm run start
```

---

## 📚 Additional Resources

**OpenAI Docs:**
- [Images API](https://platform.openai.com/docs/api-reference/images)
- [GPT-4 Vision](https://platform.openai.com/docs/guides/vision)

**Sharp Docs:**
- [Resize](https://sharp.pixelplumbing.com/api-resize)
- [Composite](https://sharp.pixelplumbing.com/api-composite)

**Supabase Docs:**
- [Storage](https://supabase.com/docs/guides/storage)
- [Database](https://supabase.com/docs/guides/database)

---

## 📞 Development Contact

**Questions?**
- 💬 Team Slack: #creative-copycat
- 📧 Tech Lead: tech@algonova.ai
- 📚 Wiki: [Confluence](https://algonova.atlassian.net)

---

**Version:** 1.0  
**Last Updated:** November 17, 2025  
**Maintainer:** Product & Engineering Team

