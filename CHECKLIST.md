# Setup Checklist

Use this checklist to ensure everything is properly configured.

## Pre-requisites

- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

## 1. Project Setup

- [ ] Clone/download project
- [ ] Run `npm install`
- [ ] Verify no installation errors
- [ ] Create `.env.local` from `.env.example`

## 2. Supabase Setup

### Create Project
- [ ] Sign up at [supabase.com](https://supabase.com)
- [ ] Create new project
- [ ] Wait for project to be ready (~2 minutes)
- [ ] Note down project name and region

### Database Setup
- [ ] Go to SQL Editor
- [ ] Open `supabase/schema.sql`
- [ ] Copy and paste entire file
- [ ] Click "Run"
- [ ] Verify success (should show "Success. No rows returned")
- [ ] Go to Table Editor
- [ ] Verify 3 tables exist:
  - [ ] `creatives`
  - [ ] `creative_analysis`
  - [ ] `creative_variants`

### Storage Setup
- [ ] Go to Storage section
- [ ] Create bucket: `creatives`
  - [ ] Name: `creatives`
  - [ ] Public: ✅ Yes
  - [ ] File size limit: 50MB
  - [ ] Allowed MIME types: `image/*`
- [ ] Create bucket: `backgrounds`
  - [ ] Name: `backgrounds`
  - [ ] Public: ✅ Yes
  - [ ] File size limit: 50MB
  - [ ] Allowed MIME types: `image/*`
- [ ] Create bucket: `renders`
  - [ ] Name: `renders`
  - [ ] Public: ✅ Yes
  - [ ] File size limit: 50MB
  - [ ] Allowed MIME types: `image/*`

### Get API Credentials
- [ ] Go to Project Settings → API
- [ ] Copy Project URL → Add to `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copy anon public key → Add to `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Copy service_role key → Add to `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
- [ ] ⚠️ Keep service_role key secret! Never commit to git!

## 3. OpenRouter Setup (LLM)

- [ ] Go to [openrouter.ai](https://openrouter.ai)
- [ ] Sign up / Log in
- [ ] Go to Keys section
- [ ] Click "Create Key"
- [ ] Name it (e.g., "Creative Copycat")
- [ ] Copy key → Add to `.env.local` as `OPENROUTER_API_KEY`
- [ ] Go to Credits
- [ ] Add credits (recommended: $10 for testing)
- [ ] Verify balance shows up

## 4. OpenAI Setup (DALL·E)

- [ ] Go to [platform.openai.com](https://platform.openai.com)
- [ ] Sign up / Log in
- [ ] Go to API Keys
- [ ] Click "Create new secret key"
- [ ] Name it (e.g., "Creative Copycat")
- [ ] Copy key → Add to `.env.local` as `OPENAI_API_KEY`
- [ ] Go to Billing
- [ ] Add payment method
- [ ] Set up billing limits (optional but recommended)
- [ ] Verify payment method is active

## 5. Environment Variables

Verify your `.env.local` has all 5 variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-...
```

- [ ] All 5 variables present
- [ ] No trailing spaces
- [ ] No quotes around values
- [ ] No placeholder text (like "your_key_here")

## 6. Test Local Development

- [ ] Run `npm run dev`
- [ ] No errors in terminal
- [ ] Server starts on port 3000
- [ ] Open [http://localhost:3000](http://localhost:3000)
- [ ] Page loads without errors
- [ ] Redirects to `/creatives`
- [ ] See "No creatives found" message (expected)

## 7. Add Test Creative

### Upload Image
- [ ] Go to Supabase Dashboard → Storage → creatives
- [ ] Upload test image (any ad image, recommend 1080x1080)
- [ ] Note the filename (e.g., `test.jpg`)

### Insert Database Record
- [ ] Go to SQL Editor
- [ ] Run:
```sql
INSERT INTO creatives (source_image_path, platform, width, height)
VALUES ('test.jpg', 'Facebook', 1080, 1080);
```
- [ ] Verify success message
- [ ] Go to Table Editor → creatives
- [ ] See your record

### Verify in App
- [ ] Refresh [http://localhost:3000/creatives](http://localhost:3000/creatives)
- [ ] See your creative in the grid
- [ ] Image loads correctly
- [ ] Shows platform badge
- [ ] Shows dimensions

## 8. Test Analysis

- [ ] Click on your test creative
- [ ] See detail page with original image
- [ ] Click "Analyze" button
- [ ] Wait 5-10 seconds
- [ ] See analysis results:
  - [ ] Text roles (hook, twist, body, cta)
  - [ ] Language detected
  - [ ] Aspect ratio shown
  - [ ] Dominant colors displayed
- [ ] No errors in browser console

## 9. Test Copy Generation

### Test Simple Overlay
- [ ] Select copy mode: "Simple Overlay (Fast)"
- [ ] Click "Generate Copy"
- [ ] Wait 2-5 seconds
- [ ] See new variant in "Generated Variants"
- [ ] Image loads correctly
- [ ] Shows "copy" badge
- [ ] Shows "simple_overlay" badge

### Test DALL·E Inpaint (Optional - costs money)
- [ ] Select copy mode: "DALL·E Inpaint"
- [ ] Click "Generate Copy"
- [ ] Wait 15-30 seconds
- [ ] See new variant with clean background
- [ ] Verify in Supabase Storage → backgrounds (should have new file)

## 10. Test Variation Generation

- [ ] Click "New Text, Same Style"
- [ ] Wait 3-5 seconds
- [ ] See variation with different text
- [ ] Shows "variation_text" badge

## 11. Troubleshooting

If something doesn't work, check:

### "Failed to fetch creatives"
- [ ] Verify Supabase URL is correct
- [ ] Verify anon key is correct
- [ ] Check browser network tab for errors
- [ ] Verify `creatives` table exists

### "Failed to analyze creative"
- [ ] Verify service role key is correct
- [ ] Verify creative has valid image in storage
- [ ] Check terminal for API errors
- [ ] Verify OpenRouter key has credits

### "Failed to generate copy"
- [ ] Verify creative is analyzed first
- [ ] Check OpenRouter credits
- [ ] Check OpenAI credits (for DALL·E modes)
- [ ] Check browser console for errors
- [ ] Check terminal for detailed error messages

### Canvas errors
- [ ] Run `npm install canvas --build-from-source`
- [ ] On Windows: Install windows-build-tools first
- [ ] On macOS: May need to install cairo (`brew install cairo`)

## 12. Deploy to Vercel (Optional)

- [ ] Push code to GitHub
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Import GitHub repository
- [ ] Add all 5 environment variables
- [ ] Click "Deploy"
- [ ] Wait for deployment
- [ ] Test deployed URL
- [ ] Verify environment variables are set correctly

## 13. Production Checklist

Before going live:

- [ ] Enable Supabase RLS (Row Level Security)
- [ ] Add authentication
- [ ] Implement rate limiting
- [ ] Set up error tracking (Sentry)
- [ ] Configure proper CORS
- [ ] Add monitoring
- [ ] Set up backups
- [ ] Review API costs
- [ ] Add usage limits
- [ ] Test error scenarios

## Success Criteria

You're ready to use the app when:

- ✅ Local dev server runs without errors
- ✅ Can view creatives list
- ✅ Can analyze a creative
- ✅ Can generate at least one copy
- ✅ All generated images display correctly
- ✅ No errors in browser console
- ✅ No errors in terminal

## Need Help?

- 📖 Read [README.md](README.md) for detailed docs
- 🚀 Read [QUICKSTART.md](QUICKSTART.md) for quick setup
- 🏗️ Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- 🔧 Read [API.md](API.md) for API documentation
- 🚢 Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup

If you're still stuck, open a GitHub issue with:
- Error message
- Steps to reproduce
- Screenshots
- Environment (OS, Node version, etc.)

