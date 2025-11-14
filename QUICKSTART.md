# Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `.env.local`

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials (see below for where to get them).

### 3. Setup Supabase

**Create Project:**
1. Go to [supabase.com](https://supabase.com)
2. Create new project (wait ~2 minutes)

**Setup Database:**
1. Go to SQL Editor
2. Copy/paste from `supabase/schema.sql`
3. Click "Run"

**Setup Storage:**
1. Go to Storage
2. Create bucket: `creatives` (Public)
3. Create bucket: `backgrounds` (Public)
4. Create bucket: `renders` (Public)

**Get Credentials:**
1. Go to Project Settings → API
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Get API Keys

**OpenRouter** (LLM):
1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Go to Keys
3. Create new key
4. Add $5-10 credits
5. Copy key → `OPENROUTER_API_KEY`

**OpenAI** (DALL·E):
1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Go to API Keys
3. Create new key
4. Add payment method
5. Copy key → `OPENAI_API_KEY`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Add Test Creative

**Upload Image:**
1. Go to Supabase → Storage → creatives
2. Upload any image (e.g., `test.jpg`)

**Insert Record:**
Go to SQL Editor and run:

```sql
INSERT INTO creatives (source_image_path, platform, width, height)
VALUES ('test.jpg', 'Facebook', 1080, 1080);
```

### 7. Test the App

1. Open [http://localhost:3000/creatives](http://localhost:3000/creatives)
2. Click on your test creative
3. Click "Analyze"
4. Wait ~5 seconds
5. Select copy mode: "Simple Overlay"
6. Click "Generate Copy"
7. See result in "Generated Variants"

## Troubleshooting

### "Failed to fetch creatives"
- Check Supabase credentials in `.env.local`
- Verify database has `creatives` table

### "Creative not analyzed"
- Click "Analyze" button first
- Wait for analysis to complete

### "Failed to generate copy"
- Check OpenRouter/OpenAI API keys
- Verify you have credits in both accounts
- Check browser console for detailed errors

### Canvas errors during build
- Run `npm install canvas --build-from-source` (macOS/Linux)
- On Windows: install windows-build-tools first

## Next Steps

- Read [README.md](README.md) for full documentation
- Read [API.md](API.md) for API reference
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup

## Common Tasks

### Add more creatives

```sql
INSERT INTO creatives (source_image_path, platform, width, height)
VALUES 
  ('ad1.jpg', 'Instagram', 1080, 1350),
  ('ad2.jpg', 'TikTok', 1080, 1920);
```

### Change LLM model

In UI, the model is hardcoded. To change default:

Edit `lib/llm.ts`:
```typescript
async function callOpenRouter(
  prompt: string,
  model: string = 'openai/gpt-4-turbo', // Change here
  temperature: number = 0.7
)
```

### Change style presets

Edit `lib/llm.ts` → `generateImagePrompt()` function.

### View generated images

All generated images are in Supabase Storage:
- Storage → renders (final outputs)
- Storage → backgrounds (AI-generated backgrounds)

## Development Tips

### Hot Reload
Next.js has fast refresh. Just edit files and see changes instantly.

### Debug API Routes
Check terminal for API logs:
```
POST /api/analyze 200 in 5432ms
```

### View Database
Use Supabase Table Editor to browse data.

### Clear Cache
If things act weird:
```bash
rm -rf .next
npm run dev
```

## Getting Help

- Check [README.md](README.md) for detailed docs
- Check [API.md](API.md) for API reference
- Open GitHub issue for bugs
- Check Supabase/OpenRouter/OpenAI docs for API issues

## Cost Estimate for Testing

- Analysis: $0.01 per creative
- Simple Overlay: $0-0.05 per generation
- DALL·E modes: $0.03-0.09 per generation

**Total for testing (10 creatives, 50 generations)**: ~$3-5

