-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create creatives table
CREATE TABLE IF NOT EXISTS creatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_image_path TEXT NOT NULL,
  platform TEXT NOT NULL,
  source_url TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create creative_analysis table
CREATE TABLE IF NOT EXISTS creative_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creative_id UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  ocr_json JSONB NOT NULL,
  layout_json JSONB NOT NULL,
  roles_json JSONB NOT NULL,
  dominant_colors JSONB NOT NULL,
  language TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creative_id)
);

-- Create creative_variants table
CREATE TABLE IF NOT EXISTS creative_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creative_id UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES creative_analysis(id) ON DELETE SET NULL,
  variant_type TEXT NOT NULL,
  style_preset TEXT NOT NULL,
  language TEXT NOT NULL,
  background_path TEXT,
  rendered_path TEXT NOT NULL,
  texts_json JSONB NOT NULL,
  copy_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_creatives_created_at ON creatives(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creatives_platform ON creatives(platform);
CREATE INDEX IF NOT EXISTS idx_creative_analysis_creative_id ON creative_analysis(creative_id);
CREATE INDEX IF NOT EXISTS idx_creative_variants_creative_id ON creative_variants(creative_id);
CREATE INDEX IF NOT EXISTS idx_creative_variants_variant_type ON creative_variants(variant_type);
CREATE INDEX IF NOT EXISTS idx_creative_variants_copy_mode ON creative_variants(copy_mode);

-- Create storage buckets (Run these in Supabase Dashboard or via API)
-- Note: These need to be created through Supabase Dashboard -> Storage
-- 1. Create bucket: 'creatives' (public)
-- 2. Create bucket: 'backgrounds' (public)
-- 3. Create bucket: 'renders' (public)

-- Storage policies for public access
-- Run these after creating the buckets in Supabase Dashboard

-- Policy for creatives bucket
-- INSERT INTO storage.buckets (id, name, public) VALUES ('creatives', 'creatives', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('backgrounds', 'backgrounds', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('renders', 'renders', true);

-- Optional: Create RLS policies if needed
-- For now, we're using service role key which bypasses RLS

-- Example: Insert sample data for testing
-- INSERT INTO creatives (source_image_path, platform, source_url, width, height)
-- VALUES 
--   ('sample1.jpg', 'Facebook', 'https://facebook.com/ad1', 1080, 1080),
--   ('sample2.jpg', 'Instagram', 'https://instagram.com/ad2', 1080, 1350),
--   ('sample3.jpg', 'TikTok', 'https://tiktok.com/ad3', 1080, 1920);

