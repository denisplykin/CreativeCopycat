# CreativeCopycat - Claude Code Documentation

> Comprehensive project guide for AI assistants working with this codebase

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Project Structure](#project-structure)
4. [Development Guidelines](#development-guidelines)
5. [Key Concepts](#key-concepts)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Common Tasks](#common-tasks)
9. [Testing & Debugging](#testing--debugging)
10. [Deployment](#deployment)

---

## Project Overview

**CreativeCopycat** is an AI-powered creative adaptation platform that automatically adapts competitor advertising creatives for the Algonova brand. It uses GPT-4o Vision for analysis and DALL-E for image editing.

### What It Does

Takes competitor advertising creatives and generates branded versions by:
- Replacing competitor logos with Algonova logo
- Maintaining text, layout, and composition
- Optionally modifying characters or applying brand colors
- Processing in 15-30 seconds per creative

### Business Value

- **Performance Marketing**: Quick testing of competitor winning creatives
- **A/B Testing**: Generate variations with different characters/styles
- **Cost Savings**: $0.17 per creative vs hours of designer time
- **Speed**: 30 seconds vs 2+ hours manual editing

---

## Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui (radix-ui primitives)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js (via Next.js API Routes)
- **API**: Next.js App Router API handlers
- **Image Processing**: Sharp

### Database & Storage
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Tables**: `creatives`, `creative_runs`
- **Buckets**: `creatives` (original + generated images)

### AI Services
- **Vision Analysis**: OpenAI GPT-4o / Claude 3.5 Sonnet (via OpenRouter)
- **Image Generation Options**:
  - **DALL-E 2** (gpt-image-1) - Mask-based editing (default)
  - **DALL-E 3** - Image-to-image generation
  - **Nano Banana Pro** - Google Gemini 3 Pro via OpenRouter
- **API Clients**: OpenAI SDK, OpenRouter API

### Key Libraries
```json
{
  "openai": "^4.28.0",          // OpenAI integration (DALL-E, GPT-4o)
  "@supabase/supabase-js": "^2.39.0",  // Database & storage
  "sharp": "^0.33.2",           // Image processing
  "axios": "^1.6.7",            // HTTP client
  "tesseract.js": "^5.1.1"      // OCR (planned)
}
```

**External APIs**:
- OpenRouter API - Access to Gemini 3 Pro (Nano Banana Pro) and Claude models

---

## Project Structure

```
CreativeCopycat/
├── app/                         # Next.js App Router
│   ├── api/                     # API Routes
│   │   ├── generate/            # Main generation endpoint
│   │   │   └── route.ts         # POST /api/generate
│   │   ├── creatives/           # Creative management
│   │   │   ├── route.ts         # GET /api/creatives
│   │   │   └── upload/          # POST /api/creatives/upload
│   │   ├── analyze/             # Analysis endpoint (legacy)
│   │   └── generate-copy/       # Copy generation (legacy)
│   ├── creatives/               # Creative library page
│   │   └── page.tsx             # Main UI
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Redirect to /creatives
│   └── globals.css              # Global styles
│
├── components/                  # React components
│   ├── ui/                      # Shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── CreativeCard.tsx         # Creative grid item
│   ├── CreativeModal.tsx        # Creative detail view
│   ├── GenerateDialog.tsx       # Generation UI
│   ├── ResultDialog.tsx         # Result preview
│   ├── SidebarHistory.tsx       # Generation history
│   ├── CompetitorFilterTabs.tsx # Filter UI
│   └── ErrorMessage.tsx         # Error display
│
├── lib/                         # Core business logic
│   ├── supabase.ts              # Supabase client & storage helpers
│   ├── db.ts                    # Database operations
│   ├── openai-image.ts          # Main AI pipeline (DALL-E integration)
│   ├── nano-banana.ts           # Nano Banana Pro (Gemini 3 Pro) integration
│   ├── mask-generator.ts        # Mask generation for inpainting
│   ├── brand-replacement.ts     # Logo overlay logic
│   ├── design-analysis.ts       # GPT-4o Vision analysis
│   ├── style-modifiers.ts       # Style preset handling
│   ├── claude-analyzer.ts       # Alternative analyzer (Claude via OpenRouter)
│   ├── llm.ts                   # OpenRouter LLM (legacy)
│   ├── dalle.ts                 # Legacy DALL-E wrapper
│   ├── ocr.ts                   # OCR utilities (stub)
│   ├── render.ts                # Text rendering (canvas)
│   └── utils.ts                 # Utility functions
│
├── types/                       # TypeScript definitions
│   └── creative.ts              # All type definitions
│
├── public/                      # Static assets
│   └── algonova-logo.png        # Brand logo
│
├── docs/                        # Documentation
│   ├── PRODUCT_OVERVIEW.md      # Product documentation
│   └── TECHNICAL_ARCHITECTURE.md # Technical specs
│
├── supabase/                    # Database
│   └── schema.sql               # Database schema
│
├── scripts/                     # Utility scripts
│
└── Configuration files
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.js
    └── .env.local               # Environment variables (gitignored)
```

---

## Development Guidelines

### Code Style

**TypeScript**
- Use strict mode (`"strict": true`)
- Always define explicit types for function parameters and return values
- Use interfaces for data structures, types for unions/intersections
- Prefer `interface` over `type` for object shapes
- Use const assertions where appropriate

**React/Next.js**
- Use functional components with hooks
- Server Components by default, use "use client" when needed
- Extract complex logic to custom hooks
- Keep components small and focused (< 200 lines)
- Use Tailwind classes directly (no CSS modules)

**File Naming**
- Components: PascalCase (`CreativeCard.tsx`)
- Utilities: camelCase (`mask-generator.ts`)
- API routes: lowercase (`route.ts`)
- Constants: UPPER_SNAKE_CASE

**Imports**
- Use `@/` alias for absolute imports
- Group imports: React/Next → Third-party → Local → Types
- Sort alphabetically within groups

**Example:**
```typescript
// Good
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getCreatives } from '@/lib/db';
import type { Creative } from '@/types/creative';

// Bad
import { Button } from '../components/ui/button';
import type { Creative } from '../types/creative';
import { getCreatives } from '@/lib/db';
import { useState } from 'react';
```

### Git Workflow

**Branch Naming**
- Feature: `claude/feature-name-sessionId`
- Bugfix: `claude/fix-name-sessionId`
- Current branch: `claude/update-clau-01KGXGEekFy3VFi2pXGknkfz`

**Commit Messages**
- Use emojis: ✨ feat, 🐛 fix, 📄 docs, 🛠️ refactor, 🎯 test
- Format: `emoji Type: Description`
- Examples:
  - `✨ Add /api/creatives/upload endpoint`
  - `🐛 Fix aspect ratio calculation in mask generation`
  - `📄 Update API documentation`

**Push Instructions**
- Always use: `git push -u origin <branch-name>`
- Branch must start with `claude/` and end with session ID
- Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s) on network errors

---

## Key Concepts

### Copy Modes

The application supports 3 copy modes that determine what gets modified:

#### 1. Simple Copy
**What it does**: Replace only the logo
```typescript
modifications = "If there is a company logo, update it to Algonova.";
editTypes = ['logo'];
```
**Use case**: Exact copy with just branding change
**Cost**: ~$0.17 per creative

#### 2. Slightly Different
**What it does**: Replace logo + minor character variations
```typescript
modifications = "Update logo to Algonova. For character(s): keep EXACT same art style,
                 number of characters, and composition. ONLY minor expression or pose variation.";
editTypes = ['character', 'logo'];
```
**Use case**: Avoid direct copying, diversity testing
**Cost**: ~$0.17 per creative

#### 3. Copy with Color
**What it does**: Replace logo + apply brand colors to decorative elements
```typescript
modifications = "If there is a company logo, update it to Algonova.
                 Apply brand colors (orange, pink, purple, cyan) to decorative elements.";
editTypes = ['logo', 'decor'];
```
**Use case**: Strengthen branding with Algonova colors
**Cost**: ~$0.17 per creative

### AI Pipeline

The application supports 3 different image generation pipelines:

#### Pipeline 1: DALL-E 2 Mask Editing (Default)

Core logic in `lib/openai-image.ts`:

```typescript
generateMaskEdit(imageBuffer, modifications, editTypes, aspectRatio)
```

**Step 1: Analyze (GPT-4o Vision)**
- Input: Image buffer
- API: `gpt-4o` model
- Output: Layout JSON with bounding boxes
- Cost: ~$0.002

**Step 2: Generate Mask**
- Input: Layout JSON + editTypes
- Process: Create binary mask (white = edit areas)
- Output: Mask buffer (PNG)
- Cost: Free (local)

**Step 3: DALL-E 2 Inpainting**
- Input: Image + Mask + Prompt
- API: `gpt-image-1` model (DALL-E 2)
- Output: Edited image
- Cost: ~$0.16

**Step 4: Restore Aspect Ratio**
- Input: Generated image
- Process: Resize using Sharp
- Output: Properly sized image
- Cost: Free (local)

**Step 5: Overlay Logo**
- Input: Generated image + logo bbox
- Process: Composite PNG logo using Sharp
- Output: Final image with perfect logo
- Cost: Free (local)

#### Pipeline 2: DALL-E 3 Generation

Core logic in `lib/openai-image.ts`:

```typescript
generateWithDallE3(imageBuffer, modifications, aspectRatio)
```

**Step 1: Analyze & Generate Prompt**
- Input: Image buffer + modifications
- API: `gpt-4o` model
- Output: Detailed description prompt
- Cost: ~$0.002

**Step 2: Generate Image**
- Input: Prompt
- API: `dall-e-3` model
- Output: New image (1024x1024 or 1792x1024)
- Cost: ~$0.04-0.08

**Step 3: Post-process**
- Resize to target aspect ratio
- Cost: Free (local)

#### Pipeline 3: Nano Banana Pro (Gemini 3 Pro)

Core logic in `lib/nano-banana.ts`:

```typescript
generateWithNanoBanana(imageBuffer, modifications, aspectRatio, analysis)
```

**Step 1: Analyze & Generate Prompt (Claude 3.5 Sonnet)**
- Input: Image buffer + modifications
- API: `anthropic/claude-3.5-sonnet` via OpenRouter
- Output: Detailed 200-300 word recreation prompt
- Cost: ~$0.003

**Step 2: Generate Image (Gemini 3 Pro)**
- Input: Detailed prompt
- API: `google/gemini-3-pro-image-preview` via OpenRouter
- Output: Generated image (returns base64 data URL)
- Cost: Variable (OpenRouter pricing)

**Step 3: Convert & Process**
- Convert base64 to Buffer
- Cost: Free (local)

**Pipeline Selection** (in `app/api/generate/route.ts`):
```typescript
if (imageModel === 'nano-banana-pro') {
  bgBuffer = await generateWithNanoBanana({ ... });
} else if (imageModel === 'dall-e-3') {
  bgBuffer = await generateWithDallE3({ ... });
} else {
  // Default: DALL-E 2 mask editing
  bgBuffer = await generateMaskEdit({ ... });
}
```

### Data Types

**Core Types** (from `types/creative.ts`):

```typescript
interface Creative {
  id: string;                    // UUID
  competitor_name: string;       // Competitor name
  original_url: string;          // Original image URL
  generated_url?: string;        // Latest generation URL
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}

interface BannerLayout {
  image_size: { width: number; height: number };
  art_style?: string;            // anime | realistic | cartoon | etc.
  background: { color: string; description: string };
  elements: LayoutElement[];
}

interface LayoutElement {
  id: string;
  type: 'text' | 'character' | 'logo' | 'button' | 'decor' | 'other';
  role: 'headline' | 'body' | 'cta' | 'brand' | 'primary' | 'shape' | 'other';
  text?: string | null;
  description?: string | null;
  style?: string | null;         // For characters
  bbox: BoundingBox;             // Coordinates
  z_index: number;
}

interface BoundingBox {
  x: number;                     // Left (px)
  y: number;                     // Top (px)
  width: number;                 // Width (px)
  height: number;                // Height (px)
}
```

---

## API Reference

### POST `/api/generate`

Generate a new creative based on original.

**Request:**
```typescript
{
  creativeId: string;                    // Creative ID
  generationType: 'full_creative';
  copyMode: 'simple_copy' | 'slightly_different' | 'copy_with_color' | 'mask_edit';
  imageModel?: 'dall-e-2' | 'dall-e-3' | 'nano-banana-pro';  // Default: 'dall-e-2'
  aspectRatio?: 'original';              // Default: 'original'
  configGenerationType?: 'simple' | 'custom';
  customPrompt?: string;                 // For custom mode
  stylePreset?: string;                  // Style preset (optional)
  language?: string;                     // Default: 'en'
  numVariations?: number;                // Default: 1
}
```

**Response (200):**
```typescript
{
  creative: Creative;                    // Updated creative
  generated_url: string;                 // Public URL
}
```

**Response (429):**
```typescript
{
  error: string;                         // Rate limit error
}
```

**Response (500):**
```typescript
{
  error: string;                         // Server error
}
```

**Implementation**: `app/api/generate/route.ts`

---

### GET `/api/creatives`

List all creatives.

**Response:**
```typescript
{
  creatives: Creative[];
}
```

**Implementation**: `app/api/creatives/route.ts`

---

### POST `/api/creatives/upload`

Upload a new creative.

**Request**: `multipart/form-data`
- `file`: Image file
- `competitor_name`: string

**Response:**
```typescript
{
  creative: Creative;
}
```

**Implementation**: `app/api/creatives/upload/route.ts`

---

## Database Schema

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

**Operations** (in `lib/db.ts`):
- `getCreatives()`: Get all creatives with public URLs
- `getCreativeById(id)`: Get single creative
- `createCreative(data)`: Insert new creative
- `updateCreative(id, data)`: Update creative

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
CREATE INDEX idx_creative_runs_status ON creative_runs(status);
```

**Operations**:
- `createCreativeRun(data)`: Create new run
- `updateCreativeRun(id, data)`: Update run status
- `getCreativeRuns(creativeId)`: Get runs for creative

### Storage Buckets

**Bucket: `creatives`**
- Path: `original/{creativeId}.png` - Uploaded originals
- Path: `generated/{creativeId}/{timestamp}.png` - Generated images
- Access: Public read, Authenticated write

---

## Common Tasks

### Adding a New Copy Mode

1. **Update type definition** (`types/creative.ts`):
```typescript
export type CopyMode = 'simple_copy' | 'slightly_different' | 'copy_with_color' | 'your_new_mode';
```

2. **Add switch case** (`app/api/generate/route.ts`):
```typescript
case 'your_new_mode':
  modifications = "Your modification instructions...";
  editTypes = ['logo', 'character'];
  break;
```

3. **Update UI** (`components/GenerateDialog.tsx`):
```tsx
<option value="your_new_mode">Your New Mode</option>
```

### Adding a New API Endpoint

1. **Create route file**: `app/api/your-endpoint/route.ts`
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Your logic here
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

2. **Add types** (if needed): `types/creative.ts`

3. **Add database operations** (if needed): `lib/db.ts`

### Modifying the AI Pipeline

Core file: `lib/openai-image.ts`

**Change prompt**:
```typescript
function buildMinimalEditPrompt(modifications: string, editTypes: string[], layout?: BannerLayout) {
  // Modify prompt logic here
  return `Your new prompt...`;
}
```

**Change mask generation**:
```typescript
// lib/mask-generator.ts
export async function generateMask(width: number, height: number, boxes: BoundingBox[]): Promise<Buffer>
```

**Change analysis**:
```typescript
// lib/design-analysis.ts
export async function analyzeCreativeLayout(imageBuffer: Buffer): Promise<BannerLayout>
```

### Debugging Common Issues

**Rate Limit (429)**
```typescript
// Check OpenAI rate limits
// Wait 12 seconds between requests
// Max 5 requests/minute
```

**Image Too Large**
```typescript
// lib/openai-image.ts
// Reduce quality or resize before sending to DALL-E
const resized = await sharp(imageBuffer)
  .resize(1024, 1024, { fit: 'inside' })
  .toBuffer();
```

**Mask Not Working**
```typescript
// Ensure mask and image are same dimensions
// Mask should be PNG with white areas to edit
// Use lib/mask-generator.ts to debug
```

**Supabase Connection**
```typescript
// Check environment variables
// Use supabaseAdmin for server-side operations
// Use supabase for client-side
```

---

## Testing & Debugging

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

Create `.env.local`:
```bash
# OpenAI (for DALL-E and GPT-4o)
OPENAI_API_KEY=sk-proj-...

# OpenRouter (for Nano Banana Pro and Claude)
OPENROUTER_API_KEY=sk-or-v1-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Debug Logging

Add debug logs in API routes:
```typescript
console.log('[DEBUG]', { imageSize, copyMode, editTypes });
```

Check Vercel logs:
```bash
vercel logs
```

### Testing Endpoints

**Test generation**:
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"creativeId":"uuid","copyMode":"simple_copy","generationType":"full_creative","aspectRatio":"original"}'
```

**Test upload**:
```bash
curl -X POST http://localhost:3000/api/creatives/upload \
  -F "file=@image.png" \
  -F "competitor_name=TestCompetitor"
```

---

## Deployment

### Vercel Deployment

**Prerequisites**:
- GitHub repository connected to Vercel
- Environment variables configured in Vercel dashboard

**Deploy**:
```bash
# Automatic on git push to main branch
git push origin main

# Manual deploy
vercel deploy --prod
```

**Environment Variables** (Vercel Dashboard):
- `OPENAI_API_KEY` - OpenAI API key for DALL-E and GPT-4o
- `OPENROUTER_API_KEY` - OpenRouter API key for Nano Banana Pro and Claude
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

### Database Setup

1. Create Supabase project
2. Run schema: `supabase/schema.sql`
3. Create storage bucket: `creatives`
4. Set bucket to public read access
5. Copy credentials to environment variables

### Monitoring

**Check status**:
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- OpenAI Usage: https://platform.openai.com/usage

**Cost tracking**:
- **DALL-E 2 (mask edit)**: ~$0.17 per creative ($0.002 analysis + $0.16 generation)
- **DALL-E 3**: ~$0.04-0.08 per creative (depends on size: 1024x1024 or 1792x1024)
- **Nano Banana Pro**: ~$0.003+ per creative (variable OpenRouter pricing)
- Budget accordingly for scale

---

## Important Notes for Claude Code

### When Working on This Project

1. **Always read existing code first** before making changes
2. **Follow the established patterns** in similar files
3. **Update types** when changing data structures
4. **Test API endpoints** after changes
5. **Check environment variables** are set
6. **Use the current branch**: `claude/update-clau-01KGXGEekFy3VFi2pXGknkfz`

### Key Files to Understand

**Must read for any work**:
- `types/creative.ts` - All type definitions
- `lib/openai-image.ts` - Core AI pipeline
- `app/api/generate/route.ts` - Main API endpoint

**For UI changes**:
- `app/creatives/page.tsx` - Main page
- `components/GenerateDialog.tsx` - Generation UI
- `components/CreativeModal.tsx` - Creative details

**For database work**:
- `lib/db.ts` - Database operations
- `lib/supabase.ts` - Supabase client
- `supabase/schema.sql` - Schema definition

### Common Pitfalls to Avoid

1. **Don't use `supabase` client server-side** → Use `supabaseAdmin`
2. **Don't exceed OpenAI rate limits** → 5 requests/minute max
3. **Don't commit `.env.local`** → Already gitignored
4. **Don't change core types without updating all usages**
5. **Don't skip error handling in API routes**

### Performance Considerations

- **Cache analysis results** - Save layout JSON to avoid re-analyzing
- **Batch processing** - Use queue for multiple generations
- **Image optimization** - Resize before uploading to DALL-E
- **Rate limiting** - Add 12s delay between DALL-E calls

### Security Notes

- **API keys** in environment variables only
- **Service role key** server-side only (never client-side)
- **Input validation** on all API endpoints
- **File size limits** on uploads (< 4MB)

---

## Additional Resources

**Documentation**:
- `docs/PRODUCT_OVERVIEW.md` - Product details and use cases
- `docs/TECHNICAL_ARCHITECTURE.md` - Detailed technical specs
- `README.md` - Quick start guide

**External Docs**:
- [Next.js App Router](https://nextjs.org/docs/app)
- [OpenAI Images API](https://platform.openai.com/docs/api-reference/images)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)

**Support**:
- GitHub Issues: For bug reports
- Email: support@algonova.ai
- Telegram: @algonova_support

---

**Version**: 1.0
**Last Updated**: 2025-11-21
**Maintained by**: Engineering Team

**Current Session**:
- Branch: `claude/update-clau-01KGXGEekFy3VFi2pXGknkfz`
- Working Directory: `/home/user/CreativeCopycat`

---

## Recent Updates

### v1.1 - Nano Banana Pro Integration (2025-11-21)

**New Features**:
- ✨ Added Nano Banana Pro (Google Gemini 3 Pro) image generation support via OpenRouter
- 🎨 Three image generation models now available:
  - DALL-E 2 (mask-based editing) - Default
  - DALL-E 3 (image-to-image generation)
  - Nano Banana Pro (Gemini 3 Pro) - New!
- 🔄 Multi-step pipeline for Nano Banana Pro:
  1. Claude 3.5 Sonnet analyzes image and creates detailed prompt
  2. Gemini 3 Pro generates new image from prompt
- 📤 Upload endpoint improvements

**Technical Details**:
- **New File**: `lib/nano-banana.ts` - Nano Banana Pro integration
- **Updated**: `app/api/generate/route.ts` - Support for `imageModel` parameter
- **Updated**: `types/creative.ts` - Added `ImageGenerationModel` type
- **New Env Var**: `OPENROUTER_API_KEY` - Required for Nano Banana Pro and Claude models

**Usage**:
```typescript
// Use Nano Banana Pro for generation
POST /api/generate
{
  "creativeId": "uuid",
  "generationType": "full_creative",
  "copyMode": "simple_copy",
  "imageModel": "nano-banana-pro",  // ← New parameter
  "aspectRatio": "original"
}
```

**Benefits**:
- **Better text rendering**: Gemini 3 Pro handles text in images better than DALL-E
- **More creative variations**: Different AI approach leads to different results
- **Cost flexibility**: Choose the best model for your use case
- **Fallback options**: Multiple models provide redundancy

**When to Use Each Model**:
- **DALL-E 2** (default): Best for precise mask-based edits, logo replacements
- **DALL-E 3**: Better for full creative generation, higher quality
- **Nano Banana Pro**: Best for text-heavy designs, creative variations, different artistic style
