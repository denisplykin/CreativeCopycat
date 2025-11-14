# Deployment Guide

## Quick Start (Vercel + Supabase)

### 1. Prepare Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase/schema.sql`
3. Go to Storage and create 3 buckets (all public):
   - `creatives`
   - `backgrounds`
   - `renders`
4. Copy your credentials from Project Settings → API:
   - Project URL
   - Anon key
   - Service role key

### 2. Get API Keys

**OpenRouter** (for LLM):
- Sign up at [openrouter.ai](https://openrouter.ai)
- Create API key
- Add credits to account

**OpenAI** (for DALL·E):
- Sign up at [platform.openai.com](https://platform.openai.com)
- Create API key
- Add payment method

### 3. Deploy to Vercel

#### Option A: Via Vercel Dashboard

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-...
```

6. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENROUTER_API_KEY
vercel env add OPENAI_API_KEY

# Deploy to production
vercel --prod
```

### 4. Test Deployment

1. Visit your deployed URL
2. Go to `/creatives`
3. Upload a test creative to Supabase Storage
4. Insert test record:

```sql
INSERT INTO creatives (source_image_path, platform, width, height)
VALUES ('test.jpg', 'Facebook', 1080, 1080);
```

5. Click on the creative and test "Analyze"

## Cost Estimates

### Per Creative Analysis
- OCR: $0 (using stub, or ~$0.001 with Cloud Vision)
- LLM (text roles): ~$0.01-0.05 (depending on model)
- **Total**: ~$0.01-0.05

### Per Copy Generation

**Simple Overlay**:
- LLM (optional): $0.01-0.05
- Rendering: $0 (server-side)
- **Total**: $0-0.05

**DALL·E Inpaint**:
- DALL·E edit: ~$0.02 (1024x1024)
- LLM (optional): $0.01-0.05
- **Total**: $0.03-0.07

**Background Regen**:
- DALL·E generate: ~$0.04 (DALL·E 3)
- LLM (optional): $0.01-0.05
- **Total**: $0.05-0.09

**Text Pattern**:
- LLM: $0.01-0.05 (varies by model)
- **Total**: $0.01-0.05

### Monthly Estimates (100 creatives, 500 copies)

- Analysis: 100 × $0.03 = $3
- Copies: 500 × $0.05 (avg) = $25
- **Total**: ~$30/month

*Note: Costs vary significantly based on chosen models and modes*

## Performance Optimization

### 1. Caching

Add caching for analysis results:

```typescript
// In lib/db.ts - already returns cached analysis
const analysis = await getCreativeAnalysis(creativeId);
```

### 2. Image Optimization

For faster loads, enable Next.js image optimization in `next.config.js` (already configured).

### 3. API Rate Limiting

Implement rate limiting for API routes:

```bash
npm install @upstash/ratelimit @upstash/redis
```

### 4. Background Jobs

For batch processing, use Vercel Cron or external job queue:

```typescript
// pages/api/cron/batch-analyze.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Batch process creatives
}
```

## Monitoring

### Vercel Analytics

Enable in Vercel dashboard → Analytics

### Error Tracking

Add Sentry:

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### API Usage Tracking

Monitor in respective dashboards:
- OpenRouter: [openrouter.ai/dashboard](https://openrouter.ai/dashboard)
- OpenAI: [platform.openai.com/usage](https://platform.openai.com/usage)
- Supabase: [app.supabase.com](https://app.supabase.com) → Database → Usage

## Security

### Environment Variables

- ✅ Never commit `.env.local`
- ✅ Use `SUPABASE_SERVICE_ROLE_KEY` only in API routes
- ✅ Keep API keys in Vercel environment variables
- ✅ Rotate keys periodically

### Supabase RLS

For production, enable Row Level Security:

```sql
-- Enable RLS on tables
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_variants ENABLE ROW LEVEL SECURITY;

-- Create policies (example for authenticated users)
CREATE POLICY "Users can view creatives" ON creatives
  FOR SELECT USING (auth.role() = 'authenticated');
```

### Rate Limiting

Add to API routes:

```typescript
import rateLimit from '@/lib/rate-limit';

export async function POST(req: Request) {
  await rateLimit(req);
  // ... rest of handler
}
```

## Troubleshooting

### Build Errors

**Error**: `Module not found: Can't resolve 'canvas'`

**Solution**: Canvas needs native dependencies. Already included in `package.json`.

### Runtime Errors

**Error**: `Failed to fetch creatives`

**Solution**: Check Supabase credentials and network connectivity.

**Error**: `DALL·E API error`

**Solution**: Verify OpenAI API key has credits and proper permissions.

### Storage Issues

**Error**: `Failed to upload file`

**Solution**: 
- Verify bucket exists and is public
- Check file size limits
- Verify service role key has storage permissions

## Scaling

### High Traffic

1. Enable Vercel Pro for better performance
2. Add Redis caching
3. Implement CDN for images
4. Use Supabase connection pooling

### Large Images

1. Compress images before upload
2. Use Supabase image transformations
3. Implement lazy loading

### Batch Processing

1. Move to queue-based system (BullMQ, Inngest)
2. Use serverless functions with longer timeouts
3. Consider dedicated workers for DALL·E calls

## Backup

### Database

Supabase provides automatic daily backups. For additional safety:

```bash
# Export database
pg_dump "postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres" > backup.sql

# Or use Supabase CLI
supabase db dump -f backup.sql
```

### Storage

Periodically sync storage to S3 or local backup.

## Support

For deployment issues:
- Vercel: [vercel.com/support](https://vercel.com/support)
- Supabase: [supabase.com/support](https://supabase.com/support)
- GitHub Issues: Create an issue in this repository

