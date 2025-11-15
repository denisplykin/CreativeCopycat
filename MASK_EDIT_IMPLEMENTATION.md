# Mask-Based Editing Implementation

## 📋 Overview

Полностью переработанная система генерации креативов на основе **mask-based editing** из инструкции `ai_banner_editing_instruction.md`.

## 🎯 Что удалено

Старые режимы генерации (нестабильные):
- ❌ `dalle_simple` - простая генерация через DALL-E 3
- ❌ `character_swap` - замена персонажа через GPT-4o + DALL-E 3
- ❌ `openai_2step` - 2-шаговый пайплайн через GPT-4o + DALL-E 3
- ❌ `old_style`, `bg_regen`, `clone`, `similar`, `style_variations`

## ✅ Что добавлено

### Новый режим: `mask_edit`

**3-шаговый пайплайн:**

### 1️⃣ **Analyze Banner → JSON Layout**
- **API**: `POST /v1/chat/completions`
- **Model**: `gpt-4o` (GPT-5.1)
- **Вход**: Изображение баннера (base64)
- **Выход**: Структурированный JSON с описанием всех элементов

**JSON Schema:**
```json
{
  "image_size": { "width": 1080, "height": 1920 },
  "background": {
    "color": "white",
    "description": "Clean white background with pink decorative blobs"
  },
  "elements": [
    {
      "id": "headline",
      "type": "text",
      "role": "headline",
      "text": "Intinya Smart Parents...",
      "font_style": "bold sans-serif",
      "color": "pink",
      "bbox": { "x": 50, "y": 100, "width": 400, "height": 60 },
      "z_index": 5
    },
    {
      "id": "main_character",
      "type": "character",
      "role": "primary",
      "description": "Little Asian girl, sitting, playful pose",
      "bbox": { "x": 600, "y": 800, "width": 400, "height": 1000 },
      "z_index": 10
    },
    {
      "id": "brand_logo",
      "type": "logo",
      "role": "brand",
      "description": "Company logo",
      "bbox": { "x": 100, "y": 50, "width": 150, "height": 50 },
      "z_index": 3
    }
  ]
}
```

### 2️⃣ **Generate Mask from Bounding Boxes**
- **Модуль**: `lib/mask-generator.ts`
- **Технология**: `sharp` (Node.js image manipulation)
- **Вход**: JSON layout + список типов элементов для редактирования
- **Выход**: PNG маска (белое = редактировать, чёрное = сохранить)

**Логика:**
```typescript
// Фильтруем элементы по типу (например, только 'character' и 'logo')
const editBoxes = elements
  .filter(el => ['character', 'logo'].includes(el.type))
  .map(el => el.bbox);

// Создаём чёрный фон
const mask = new Image(width, height, black);

// Рисуем белые прямоугольники в местах редактирования (с padding)
for (const box of editBoxes) {
  mask.drawWhiteRect(box.x - padding, box.y - padding, box.width + padding*2, box.height + padding*2);
}
```

### 3️⃣ **Edit Image with Mask**
- **API**: `POST /v1/images/edits`
- **Model**: `dall-e-2` (единственная модель, поддерживающая edits)
- **Вход**: 
  - `image`: Оригинальное изображение (PNG)
  - `mask`: Сгенерированная маска (PNG)
  - `prompt`: Текстовое описание изменений
- **Выход**: Отредактированное изображение

**Пример промпта:**
```
Professional advertising banner. 

Preserve the following EXACTLY:
- Background: Clean white background with pink decorative blobs.
- All text blocks: "Intinya Smart Parents..." (bold sans-serif, pink), "di setiap error si kecil" (regular sans-serif, black), ...
- Other elements: CTA button "Daftar Sekarang", decorative pink blobs

Change the following areas (white mask):
character (Little Asian girl, sitting, playful pose), logo (Company logo)

Modifications: Replace the main character with a confident 25-year-old Indonesian woman in modern, professional attire. Update brand names to "Algonova".

Maintain high quality, professional design, same layout and composition.
```

## 📂 Изменённые файлы

### 1. **`types/creative.ts`**
- `CopyMode`: теперь только `'mask_edit'`
- `LayoutElement`: новый формат с `id`, `type`, `role`, `bbox`, `z_index`
- `AnalysisData.layout`: новый формат с `image_size`, `background`, `elements[]`

### 2. **`lib/mask-generator.ts`** (новый)
```typescript
export async function generateMask(options: MaskOptions): Promise<Buffer>
export function filterBoxesByType(elements, types): BoundingBox[]
```

### 3. **`lib/openai-image.ts`** (полностью переписан)
```typescript
export async function generateMaskEdit(params: MaskEditParams): Promise<Buffer>
// - Step 1: Analyze → JSON
// - Step 2: Generate mask
// - Step 3: Edit with mask
```

### 4. **`app/api/generate/route.ts`**
- Удалены старые режимы
- Только `mask_edit` с дефолтными параметрами:
  - `modifications`: "Replace character + update to Algonova"
  - `editTypes`: `['character', 'logo']`

### 5. **UI Components**
- **`components/CreativeModal.tsx`**: Только одна кнопка "🎭 Mask Edit"
- **`app/creatives/page.tsx`**: Обновлён `copyModeMap`
- **`app/debug/page.tsx`**: Только `mask_edit` режим
- **`app/test/page.tsx`**: Упрощён интерфейс для тестирования

### 6. **`app/api/test-generate/route.ts`**
- Только `mask_edit` режим
- Параметры: `file` + `modifications`

## 🔧 API Endpoints

### Generate (Production)
```typescript
POST /api/generate
{
  creativeId: string,
  generationType: 'full_creative',
  copyMode: 'mask_edit',
  aspectRatio: '9:16',
  numVariations: 1
}
```

### Test Generate (Debug)
```typescript
POST /api/test-generate
Headers: { 'X-Generation-Mode': 'mask_edit' }
FormData: {
  file: File,
  modifications: string
}
```

## 🎨 Default Behaviour

По умолчанию:
- **Edit types**: `['character', 'logo']` - редактируем только персонажа и логотип
- **Modifications**: "Replace the main character with a confident 25-year-old Indonesian woman. Update brand names to Algonova."
- **Aspect ratio**: `9:16` (вертикальный формат)
- **Padding**: `30px` вокруг каждого элемента в маске

## 📊 Преимущества нового подхода

✅ **Точность**: Маска гарантирует, что меняются только нужные области  
✅ **Стабильность**: `/v1/images/edits` API более предсказуем, чем генерация с нуля  
✅ **Сохранение layout**: Все тексты, цвета, композиция остаются неизменными  
✅ **Масштабируемость**: Можно выбирать, какие элементы редактировать (`character`, `logo`, `text`, `button`, `decor`)  
✅ **Прозрачность**: Чёткий JSON layout для каждого креатива  

## 🧪 Testing

Страница для тестирования: `/test`

1. Загрузите изображение баннера
2. Опишите, что хотите изменить (текстовое поле "Modifications")
3. Нажмите "🎭 Mask Edit"
4. Смотрите live logs и результат

## 🚀 Deployment

Изменения запушены в репозиторий. Vercel автоматически деплоит на:
```
https://creative-copycat.vercel.app
```

Тестируйте через 1-2 минуты после деплоя! 🎉

## 📝 Notes

- **DALL-E 2** используется для edits (это единственная модель, поддерживающая `/v1/images/edits`)
- **GPT-4o** используется для анализа (vision model)
- Размеры масок должны точно совпадать с оригинальным изображением
- Все изображения конвертируются в PNG перед отправкой
- Padding 30px добавляется к каждому bbox для лучшего покрытия

## 🔮 Future Improvements

- [ ] UI для выбора `editTypes` (какие элементы редактировать)
- [ ] Визуализация маски перед генерацией
- [ ] Настройка padding для маски
- [ ] Batch editing для множества креативов
- [ ] Кэширование JSON layouts в Supabase

