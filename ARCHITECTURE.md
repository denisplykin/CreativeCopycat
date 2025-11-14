# Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  ┌─────────────────┐         ┌─────────────────┐           │
│  │  /creatives     │────────▶│  /creatives/[id]│           │
│  │  (Grid View)    │         │  (Detail View)   │           │
│  └─────────────────┘         └─────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ /api/    │  │ /api/    │  │ /api/    │  │ /api/    │   │
│  │creatives │  │ analyze  │  │generate- │  │generate- │   │
│  │          │  │          │  │copy      │  │variation │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Supabase      │  │  OpenRouter     │  │   OpenAI        │
│   (Database +   │  │  (LLM for text) │  │   (DALL·E)      │
│    Storage)     │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Data Flow

### 1. Creative Analysis Flow

```
User clicks "Analyze"
        │
        ▼
POST /api/analyze
        │
        ├──▶ Download image from Supabase Storage
        │
        ├──▶ Run OCR (lib/ocr.ts)
        │    └──▶ Extract text blocks + bounding boxes
        │
        ├──▶ Call LLM (lib/llm.ts)
        │    └──▶ Extract text roles (hook, twist, CTA)
        │
        ├──▶ Generate layout (lib/render.ts)
        │    └──▶ Create layout_json from OCR results
        │
        ├──▶ Extract colors (lib/ocr.ts)
        │
        └──▶ Save to creative_analysis table
             └──▶ Return analysis to frontend
```

### 2. Copy Generation Flow (4 Modes)

#### Mode A: Simple Overlay
```
POST /api/generate-copy { copyMode: "simple_overlay" }
        │
        ├──▶ Download original image
        │
        ├──▶ Get texts (user input OR LLM generate)
        │
        ├──▶ Render text over image (lib/render.ts)
        │    └──▶ Use canvas to draw text at bbox positions
        │
        └──▶ Upload to Supabase Storage
             └──▶ Save variant to DB
```

#### Mode B: DALL·E Inpaint
```
POST /api/generate-copy { copyMode: "dalle_inpaint" }
        │
        ├──▶ Download original image
        │
        ├──▶ Create mask from text bboxes (lib/dalle.ts)
        │    └──▶ White rectangles where text was
        │
        ├──▶ DALL·E image.edit (remove text)
        │    └──▶ Returns clean background
        │
        ├──▶ Get texts (user input OR LLM generate)
        │
        ├──▶ Render text over clean background
        │
        └──▶ Upload to Storage + Save variant
```

#### Mode C: Background Regeneration
```
POST /api/generate-copy { copyMode: "bg_regen" }
        │
        ├──▶ Generate prompt based on stylePreset
        │
        ├──▶ DALL·E image.generate (new background)
        │
        ├──▶ Get texts (user input OR LLM generate)
        │
        ├──▶ Render text over new background
        │
        └──▶ Upload to Storage + Save variant
```

#### Mode D: Text Pattern
```
POST /api/generate-copy { copyMode: "new_text_pattern" }
        │
        ├──▶ LLM generate new texts
        │    └──▶ Based on original roles
        │
        ├──▶ Download original image
        │
        ├──▶ Render new text over original
        │
        └──▶ Upload to Storage + Save variant
```

### 3. Variation Generation Flow

Similar to copy generation, but with 3 types:
- **variation_text**: New LLM text + original image
- **variation_style**: Original text + new DALL·E background
- **variation_structure**: New LLM text + new DALL·E background

## Module Responsibilities

### `/app` (Next.js App Router)

**Pages:**
- `page.tsx`: Redirect to /creatives
- `creatives/page.tsx`: Grid view of all creatives
- `creatives/[id]/page.tsx`: Detail view with analysis & generation

**API Routes:**
- `api/creatives/route.ts`: List all creatives
- `api/creatives/[id]/route.ts`: Get creative details
- `api/analyze/route.ts`: Analyze creative
- `api/generate-copy/route.ts`: Generate copy
- `api/generate-variation/route.ts`: Generate variation

### `/lib` (Core Logic)

**supabase.ts**: Supabase client & storage helpers
- `supabase`: Client for browser
- `supabaseAdmin`: Admin client for server
- `getPublicUrl()`: Get public URL for file
- `uploadFile()`: Upload to storage
- `downloadFile()`: Download from storage

**db.ts**: Database operations
- `getCreatives()`: Get all creatives
- `getCreativeById()`: Get single creative
- `getCreativeAnalysis()`: Get analysis
- `upsertCreativeAnalysis()`: Create/update analysis
- `getCreativeVariants()`: Get all variants
- `createCreativeVariant()`: Create new variant

**ocr.ts**: OCR processing
- `runOCR()`: Extract text and bboxes (currently stub)
- `extractDominantColors()`: Get main colors from image
- `detectLanguage()`: Detect text language
- `calculateAspectRatio()`: Calculate aspect ratio

**llm.ts**: LLM operations via OpenRouter
- `callOpenRouter()`: Generic LLM API call
- `extractRoles()`: Extract text roles from OCR
- `generateTexts()`: Generate new texts for roles
- `generateImagePrompt()`: Create DALL·E prompt

**dalle.ts**: DALL·E operations via OpenAI
- `generateBackground()`: Generate new background
- `editImageWithMask()`: Inpaint to remove text
- `createTextMask()`: Create mask from bboxes

**render.ts**: Image rendering
- `renderCreative()`: Render text over background
- `generateLayout()`: Generate layout from OCR

### `/types` (TypeScript Definitions)

**creative.ts**: All TypeScript interfaces
- Database types: `Creative`, `CreativeAnalysis`, `CreativeVariant`
- API types: Request/Response interfaces
- Enums: `CopyMode`, `VariantType`, `StylePreset`

## Database Schema

### Tables

**creatives**: Source advertising creatives
- `id`: UUID primary key
- `source_image_path`: Path in storage
- `platform`: Where it was found
- `width`, `height`: Image dimensions
- `created_at`: Timestamp

**creative_analysis**: AI analysis results
- `id`: UUID primary key
- `creative_id`: FK to creatives (unique)
- `ocr_json`: OCR results
- `layout_json`: Layout elements
- `roles_json`: Text roles
- `dominant_colors`: Color palette
- `language`, `aspect_ratio`: Metadata

**creative_variants**: Generated copies/variations
- `id`: UUID primary key
- `creative_id`: FK to creatives
- `analysis_id`: FK to creative_analysis
- `variant_type`: copy/variation_text/variation_style/variation_structure
- `copy_mode`: simple_overlay/dalle_inpaint/bg_regen/new_text_pattern
- `style_preset`: anime/sakura/realistic/etc
- `background_path`: Path to generated background (if any)
- `rendered_path`: Path to final rendered image
- `texts_json`: Text content + metadata

### Storage Buckets

- **creatives**: Original source images
- **backgrounds**: AI-generated backgrounds
- **renders**: Final rendered outputs

## Key Algorithms

### Text Rendering Algorithm

1. Load background image into canvas
2. For each text element in layout:
   - Calculate font size based on bbox height
   - Split text into words for wrapping
   - Calculate line breaks based on bbox width
   - Draw each line with proper alignment
   - Add text shadow for readability

### Mask Generation Algorithm

1. Create black canvas (keep areas)
2. Draw white rectangles at text bbox positions (remove areas)
3. Add padding around text boxes
4. Export as PNG for DALL·E

### Layout Generation Algorithm

1. Take OCR text blocks with bboxes
2. For each block:
   - Create layout element with type "text"
   - Calculate appropriate font size (70% of bbox height)
   - Set default styles (color, font, alignment)
3. Return layout with canvas dimensions

## Performance Considerations

### Caching Strategy

- Analysis results cached in database (1 per creative)
- Images cached by Supabase CDN
- No client-side caching yet (future enhancement)

### Optimization Opportunities

1. **Image Processing**: Pre-resize images to standard dimensions
2. **Batch Processing**: Queue multiple generations
3. **CDN**: Use Cloudflare/CloudFront for images
4. **Database**: Add indexes for common queries (already done)
5. **API**: Implement rate limiting

### Cost Optimization

- Use cheaper LLM models for non-critical tasks
- Cache LLM responses for similar prompts
- Batch DALL·E requests where possible
- Use simple_overlay mode for high-volume testing

## Security

### Current Measures

- Service role key only used server-side
- Environment variables for all secrets
- Security headers in middleware
- Public storage buckets (intentional for demo)

### Production Recommendations

- Enable Supabase RLS (Row Level Security)
- Add authentication
- Implement API rate limiting
- Use private storage with signed URLs
- Add CORS restrictions
- Enable CSP (Content Security Policy)

## Scalability

### Current Limitations

- Synchronous API calls (blocking)
- No queue system
- Single-threaded rendering
- No horizontal scaling consideration

### Scaling Path

1. **Phase 1** (100 creatives/day):
   - Current setup works fine
   - Monitor API costs

2. **Phase 2** (1000 creatives/day):
   - Add Redis for caching
   - Implement job queue (BullMQ)
   - Add rate limiting
   - Optimize database queries

3. **Phase 3** (10k+ creatives/day):
   - Move to dedicated workers
   - Add CDN for images
   - Implement batch processing
   - Consider microservices architecture

## Testing Strategy

### Current State
- No automated tests (MVP)

### Recommended Testing

**Unit Tests:**
- `lib/ocr.ts`: Color extraction, language detection
- `lib/render.ts`: Layout generation
- `lib/llm.ts`: Prompt generation

**Integration Tests:**
- API routes with mock Supabase
- Database operations
- Storage operations

**E2E Tests:**
- User flow: browse → analyze → generate
- Different copy modes
- Error handling

## Monitoring & Observability

### Recommended Setup

1. **Application Monitoring**: Vercel Analytics
2. **Error Tracking**: Sentry
3. **API Monitoring**: OpenRouter/OpenAI dashboards
4. **Database Monitoring**: Supabase dashboard
5. **Custom Metrics**: Log generation times, success rates

## Future Enhancements

### Short Term
- [ ] Real OCR integration
- [ ] User authentication
- [ ] Pagination for creatives list
- [ ] Better error handling

### Medium Term
- [ ] Batch generation
- [ ] A/B test tracking
- [ ] Custom fonts upload
- [ ] Video creative support

### Long Term
- [ ] Multi-language UI
- [ ] Advanced analytics
- [ ] Integration with ad platforms
- [ ] Custom ML models

