# Creative Copycat

AI-powered creative analysis and generation tool for advertising creatives. Analyze competitor ads, extract insights, and generate variations with different styles and copy.

## Features

- **Creative Library**: Browse and manage collected advertising creatives
- **AI Analysis**: Automatic OCR, text role detection, layout analysis, and color extraction
- **4 Copy Modes**:
  - **Simple Overlay**: Fast text replacement over original image
  - **DALL·E Inpaint**: Clean background removal and text replacement
  - **Background Regeneration**: New AI-generated backgrounds with same layout
  - **Text Pattern**: LLM-generated new copy with experimental models
- **Variations**: Generate text, style, or complete creative variations
- **Style Presets**: Anime, Sakura, Realistic, 3D, Minimal, and more

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI Models**: 
  - OpenRouter (LLM for text generation)
  - OpenAI DALL·E (image generation and editing)
- **Rendering**: Node Canvas
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Project Structure

```
/app
  /api
    /creatives          # List creatives
    /creatives/[id]     # Get creative details
    /analyze            # Analyze creative
    /generate-copy      # Generate copy with different modes
    /generate-variation # Generate variations
  /creatives
    page.tsx            # Creative library grid
    /[id]
      page.tsx          # Creative detail page
  layout.tsx
  page.tsx
  globals.css

/lib
  supabase.ts           # Supabase client & storage helpers
  db.ts                 # Database operations
  ocr.ts                # OCR processing (stub)
  llm.ts                # OpenRouter LLM integration
  dalle.ts              # DALL·E image generation/editing
  render.ts             # Text rendering over images

/types
  creative.ts           # TypeScript interfaces

/supabase
  schema.sql            # Database schema
  setup-instructions.md # Setup guide
```

## Setup

### Prerequisites

- Node.js 18+
- Supabase account
- OpenRouter API key
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CreativeCopycat
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Follow instructions in `supabase/setup-instructions.md`
   - Create storage buckets: `creatives`, `backgrounds`, `renders`
   - Run the SQL schema from `supabase/schema.sql`

4. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
- Supabase URL and keys
- OpenRouter API key
- OpenAI API key

5. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Upload Creatives

Currently, creatives are added via your data collection agent. They should be uploaded to the `creatives` bucket in Supabase Storage, with metadata in the `creatives` table.

Example insert:
```sql
INSERT INTO creatives (source_image_path, platform, source_url, width, height)
VALUES ('sample.jpg', 'Facebook', 'https://example.com', 1080, 1080);
```

### 2. Browse Creatives

Navigate to `/creatives` to see all collected creatives in a grid view.

### 3. Analyze Creative

1. Click on a creative to view details
2. Click "Analyze" button
3. Wait for AI analysis (OCR, text roles, colors, layout)

### 4. Generate Copies

Choose a copy mode:
- **Simple Overlay**: Fast, no API calls to DALL·E
- **DALL·E Inpaint**: Removes text cleanly
- **Background Regen**: New AI background
- **Text Pattern**: New LLM-generated copy

Select style preset (for modes that use DALL·E):
- Original, Anime, Sakura, Realistic, 3D, Minimal

Click "Generate Copy"

### 5. Generate Variations

Three variation types:
- **New Text, Same Style**: LLM generates new copy
- **New Style, Same Text**: DALL·E generates new background
- **Complete Regeneration**: Both new text and background

### 6. View Results

All generated variants appear at the bottom of the page with previews and metadata.

## API Endpoints

### GET `/api/creatives`
Returns list of all creatives with public URLs.

### GET `/api/creatives/[id]`
Returns creative details, analysis, and variants.

### POST `/api/analyze`
Analyzes a creative with OCR, LLM, and color extraction.

**Request:**
```json
{
  "creativeId": "uuid"
}
```

### POST `/api/generate-copy`
Generates a copy with specified mode.

**Request:**
```json
{
  "creativeId": "uuid",
  "copyMode": "simple_overlay" | "dalle_inpaint" | "bg_regen" | "new_text_pattern",
  "stylePreset": "anime" | "sakura" | "realistic" | "3d" | "minimal" | "original",
  "texts": { "hook": "text", "cta": "text" },  // optional
  "language": "en",
  "llmModel": "anthropic/claude-3.5-sonnet",    // optional
  "temperature": 0.7                             // optional
}
```

### POST `/api/generate-variation`
Generates a variation with specified type.

**Request:**
```json
{
  "creativeId": "uuid",
  "variantType": "variation_text" | "variation_style" | "variation_structure",
  "stylePreset": "anime",
  "language": "en",
  "niche": "gaming",                             // optional
  "llmModel": "anthropic/claude-3.5-sonnet",    // optional
  "temperature": 0.7                             // optional
}
```

## Copy Modes Explained

### 1. Simple Overlay
- **Speed**: ⚡ Fastest
- **Cost**: $ Cheapest (no image generation)
- **Quality**: Basic
- **Use case**: Quick tests, baseline copies

**Pipeline**: Original image → Render text → Done

### 2. DALL·E Inpaint
- **Speed**: 🐢 Slow (DALL·E API call)
- **Cost**: $$$ (DALL·E pricing)
- **Quality**: High (clean backgrounds)
- **Use case**: Professional copies with clean text removal

**Pipeline**: Original image → Create mask → DALL·E inpaint → Render text → Done

### 3. Background Regeneration
- **Speed**: 🐢 Slow (DALL·E API call)
- **Cost**: $$$ (DALL·E pricing)
- **Quality**: Creative (new styles)
- **Use case**: Style experiments, A/B testing

**Pipeline**: Style prompt → DALL·E generate → Render text → Done

### 4. Text Pattern
- **Speed**: ⚡ Fast (LLM only)
- **Cost**: $$ (OpenRouter pricing)
- **Quality**: Depends on LLM
- **Use case**: Copy experiments, multi-model testing

**Pipeline**: Original text → LLM generate → Render on original → Done

## Development

### Adding New Style Presets

Edit `lib/llm.ts` → `generateImagePrompt()`:

```typescript
const styleDescriptions: Record<string, string> = {
  // Add new style
  cyberpunk: 'cyberpunk futuristic neon style, dark background',
};
```

Update TypeScript type in `types/creative.ts`:

```typescript
export type StylePreset = 'anime' | 'sakura' | 'realistic' | 'original' | '3d' | 'minimal' | 'cyberpunk';
```

### Adding New LLM Models

Models are configured via OpenRouter. Pass the model string like:

```
anthropic/claude-3.5-sonnet
openai/gpt-4-turbo
google/gemini-pro
meta-llama/llama-3-70b
```

See [OpenRouter docs](https://openrouter.ai/docs) for available models.

### Testing

For testing without real API calls, the OCR module includes stub data. To enable:

The current implementation already uses stub OCR data by default in `lib/ocr.ts`.

## Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all variables from `.env.example` in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`

## Roadmap

- [ ] Real OCR integration (PaddleOCR or Cloud Vision)
- [ ] Batch generation (10-20 variants at once)
- [ ] Video creative support
- [ ] Multi-language UI
- [ ] A/B test results tracking
- [ ] Export to marketing platforms
- [ ] Custom font upload
- [ ] Advanced layout editor

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT

## Support

For issues or questions, please open a GitHub issue.

