# API Documentation

## Base URL

```
Local: http://localhost:3000
Production: https://your-app.vercel.app
```

## Authentication

Currently using Supabase service role key for all operations. No user authentication required.

## Endpoints

### 1. List Creatives

Get all creatives with pagination support.

**Endpoint**: `GET /api/creatives`

**Response**:
```json
{
  "creatives": [
    {
      "id": "uuid",
      "source_image_path": "path/to/image.jpg",
      "platform": "Facebook",
      "source_url": "https://...",
      "width": 1080,
      "height": 1080,
      "created_at": "2024-01-01T00:00:00Z",
      "imageUrl": "https://supabase.co/storage/.../image.jpg"
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Success
- `500 Internal Server Error`: Database error

---

### 2. Get Creative Details

Get a single creative with analysis and variants.

**Endpoint**: `GET /api/creatives/[id]`

**Parameters**:
- `id` (path): Creative UUID

**Response**:
```json
{
  "creative": {
    "id": "uuid",
    "imageUrl": "https://...",
    ...
  },
  "analysis": {
    "id": "uuid",
    "creative_id": "uuid",
    "ocr_json": { ... },
    "layout_json": { ... },
    "roles_json": [ ... ],
    "dominant_colors": ["#FF0000", "#00FF00"],
    "language": "en",
    "aspect_ratio": "1:1",
    "analyzed_at": "2024-01-01T00:00:00Z"
  },
  "variants": [
    {
      "id": "uuid",
      "variant_type": "copy",
      "copy_mode": "simple_overlay",
      "renderedUrl": "https://...",
      ...
    }
  ]
}
```

**Status Codes**:
- `200 OK`: Success
- `404 Not Found`: Creative not found
- `500 Internal Server Error`: Database error

---

### 3. Analyze Creative

Run OCR and AI analysis on a creative.

**Endpoint**: `POST /api/analyze`

**Request Body**:
```json
{
  "creativeId": "uuid"
}
```

**Response**:
```json
{
  "analysisId": "uuid",
  "analysis": {
    "id": "uuid",
    "creative_id": "uuid",
    "ocr_json": {
      "blocks": [
        {
          "text": "AMAZING OFFER",
          "bbox": { "x": 50, "y": 50, "width": 300, "height": 60 },
          "confidence": 0.95
        }
      ],
      "fullText": "AMAZING OFFER\n..."
    },
    "layout_json": {
      "elements": [
        {
          "type": "text",
          "bbox": { "x": 50, "y": 50, "width": 300, "height": 60 },
          "style": {
            "fontSize": 42,
            "fontFamily": "Arial, sans-serif",
            "color": "#FFFFFF",
            "align": "center",
            "fontWeight": "bold"
          }
        }
      ],
      "canvasSize": { "width": 1080, "height": 1080 }
    },
    "roles_json": [
      { "role": "hook", "text": "AMAZING OFFER" },
      { "role": "cta", "text": "SHOP NOW" }
    ],
    "dominant_colors": ["#FF6B6B", "#4ECDC4"],
    "language": "en",
    "aspect_ratio": "1:1"
  }
}
```

**Status Codes**:
- `200 OK`: Success
- `404 Not Found`: Creative not found
- `500 Internal Server Error`: Analysis failed

**Notes**:
- Analysis is cached per creative
- Re-running analysis will update existing record
- OCR is currently stubbed (returns fake data)

---

### 4. Generate Copy

Generate a copy of the creative with different modes.

**Endpoint**: `POST /api/generate-copy`

**Request Body**:
```json
{
  "creativeId": "uuid",
  "copyMode": "simple_overlay",
  "stylePreset": "anime",
  "texts": {
    "hook": "NEW HEADLINE",
    "cta": "BUY NOW"
  },
  "language": "en",
  "llmModel": "anthropic/claude-3.5-sonnet",
  "temperature": 0.7
}
```

**Parameters**:
- `creativeId` (required): UUID of creative
- `copyMode` (required): One of:
  - `simple_overlay`: Render text over original image
  - `dalle_inpaint`: Remove text with DALL·E, then render
  - `bg_regen`: Generate new background with DALL·E
  - `new_text_pattern`: Generate new text with LLM
- `stylePreset` (optional): `anime`, `sakura`, `realistic`, `3d`, `minimal`, `original` (default: `original`)
- `texts` (optional): Custom texts by role. If not provided, LLM generates them
- `language` (optional): Language code (default: `en`)
- `llmModel` (optional): OpenRouter model ID (default: `anthropic/claude-3.5-sonnet`)
- `temperature` (optional): LLM temperature 0-1 (default: `0.7`)

**Response**:
```json
{
  "variantId": "uuid",
  "imageUrl": "https://supabase.co/storage/.../render.png",
  "variant": {
    "id": "uuid",
    "creative_id": "uuid",
    "variant_type": "copy",
    "copy_mode": "simple_overlay",
    "style_preset": "anime",
    "language": "en",
    "rendered_path": "renders/...",
    "texts_json": {
      "texts": { "hook": "...", "cta": "..." },
      "meta": {
        "llm_model": "anthropic/claude-3.5-sonnet",
        "temperature": 0.7,
        "copy_mode": "simple_overlay"
      }
    },
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Creative not analyzed or invalid parameters
- `404 Not Found`: Creative not found
- `500 Internal Server Error`: Generation failed

**Processing Time**:
- `simple_overlay`: 1-3 seconds
- `dalle_inpaint`: 10-30 seconds (DALL·E)
- `bg_regen`: 15-40 seconds (DALL·E 3)
- `new_text_pattern`: 2-5 seconds (LLM)

---

### 5. Generate Variation

Generate a variation of the creative.

**Endpoint**: `POST /api/generate-variation`

**Request Body**:
```json
{
  "creativeId": "uuid",
  "variantType": "variation_text",
  "stylePreset": "realistic",
  "language": "en",
  "niche": "gaming",
  "llmModel": "openai/gpt-4-turbo",
  "temperature": 0.8
}
```

**Parameters**:
- `creativeId` (required): UUID of creative
- `variantType` (required): One of:
  - `variation_text`: New text, same background
  - `variation_style`: New background, same text
  - `variation_structure`: New text + new background
- `stylePreset` (optional): Style for background generation (default: `original`)
- `language` (optional): Language code (default: `en`)
- `niche` (optional): Product/niche context for text generation
- `llmModel` (optional): OpenRouter model ID
- `temperature` (optional): LLM temperature 0-1

**Response**:
```json
{
  "variantId": "uuid",
  "imageUrl": "https://...",
  "variant": {
    "id": "uuid",
    "variant_type": "variation_text",
    "style_preset": "realistic",
    ...
  }
}
```

**Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Creative not analyzed or invalid parameters
- `404 Not Found`: Creative not found
- `500 Internal Server Error`: Generation failed

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Rate Limits

Currently no rate limiting implemented. Recommended to add for production:

- Analysis: 10 requests/minute
- Generation: 5 requests/minute (due to DALL·E)
- List/Get: 100 requests/minute

## Available LLM Models (OpenRouter)

Popular choices:

- `anthropic/claude-3.5-sonnet` - Best quality, balanced cost
- `openai/gpt-4-turbo` - High quality, expensive
- `openai/gpt-3.5-turbo` - Fast, cheap
- `google/gemini-pro` - Good quality, moderate cost
- `meta-llama/llama-3-70b` - Open source, good quality

See [OpenRouter docs](https://openrouter.ai/docs) for full list.

## Webhooks

Not implemented yet. Future feature for async processing notifications.

## Pagination

Not implemented yet for `/api/creatives`. Future enhancement:

```
GET /api/creatives?page=1&limit=20
```

## Filtering

Not implemented yet. Future enhancement:

```
GET /api/creatives?platform=Facebook&date_from=2024-01-01
```

