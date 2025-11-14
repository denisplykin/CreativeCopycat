# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready
4. Copy your project URL and keys

## 2. Create Storage Buckets

Go to Storage in Supabase Dashboard and create these buckets:

### Bucket: `creatives`
- **Name**: creatives
- **Public**: Yes
- **File size limit**: 50MB
- **Allowed MIME types**: image/*

### Bucket: `backgrounds`
- **Name**: backgrounds
- **Public**: Yes
- **File size limit**: 50MB
- **Allowed MIME types**: image/*

### Bucket: `renders`
- **Name**: renders
- **Public**: Yes
- **File size limit**: 50MB
- **Allowed MIME types**: image/*

## 3. Run SQL Schema

1. Go to SQL Editor in Supabase Dashboard
2. Copy and paste the contents of `schema.sql`
3. Run the query
4. Verify tables are created in Table Editor

## 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key

# OpenAI (DALL·E)
OPENAI_API_KEY=your_openai_api_key
```

### Where to find these keys:

- **NEXT_PUBLIC_SUPABASE_URL**: Project Settings → API → Project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Project Settings → API → Project API keys → anon public
- **SUPABASE_SERVICE_ROLE_KEY**: Project Settings → API → Project API keys → service_role (Keep this secret!)
- **OPENROUTER_API_KEY**: Get from [openrouter.ai](https://openrouter.ai)
- **OPENAI_API_KEY**: Get from [platform.openai.com](https://platform.openai.com)

## 5. Verify Setup

Run this SQL query to verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see:
- creatives
- creative_analysis
- creative_variants

## 6. Optional: Add Sample Data

You can add sample creatives for testing:

```sql
INSERT INTO creatives (source_image_path, platform, source_url, width, height)
VALUES 
  ('sample1.jpg', 'Facebook', 'https://facebook.com/ad1', 1080, 1080),
  ('sample2.jpg', 'Instagram', 'https://instagram.com/ad2', 1080, 1350),
  ('sample3.jpg', 'TikTok', 'https://tiktok.com/ad3', 1080, 1920);
```

Make sure to upload corresponding images to the `creatives` bucket.

## 7. Configure Vercel Environment Variables

When deploying to Vercel, add all environment variables from `.env.local` to your Vercel project settings.

## Troubleshooting

### Storage Issues
- Make sure buckets are set to public
- Verify bucket names match exactly: `creatives`, `backgrounds`, `renders`
- Check file permissions

### Database Issues
- Verify all tables were created successfully
- Check for foreign key constraints
- Ensure UUID extension is enabled

### API Issues
- Verify service role key has proper permissions
- Check API rate limits on OpenRouter and OpenAI
- Monitor API usage in respective dashboards

