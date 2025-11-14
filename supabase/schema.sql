-- Schema for Creative Copycat
-- This schema matches your existing Supabase database

-- Note: These tables already exist in your database
-- This file is for reference only

-- Creatives table
CREATE TABLE IF NOT EXISTS public.creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  competitor_name TEXT,
  original_image_url TEXT NOT NULL,
  analysis JSONB,
  generated_character_url TEXT,
  generated_background_url TEXT,
  generated_image_url TEXT,
  figma_file_id TEXT,
  status TEXT DEFAULT 'pending'::TEXT CHECK (status = ANY (ARRAY['pending'::TEXT, 'analyzing'::TEXT, 'generating'::TEXT, 'completed'::TEXT, 'failed'::TEXT])),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT creatives_pkey PRIMARY KEY (id)
);

-- Patterns table
CREATE TABLE IF NOT EXISTS public.patterns (
  pattern_id TEXT NOT NULL,
  name TEXT,
  file_key TEXT,
  node_id TEXT,
  template_yaml JSONB,
  preferred_bg TEXT,
  sizes TEXT[],
  weights JSONB,
  inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT patterns_pkey PRIMARY KEY (pattern_id)
);

-- Runs table (for logging and observability)
CREATE TABLE IF NOT EXISTS public.runs (
  run_id UUID NOT NULL DEFAULT gen_random_uuid(),
  input JSONB,
  output JSONB,
  status TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT runs_pkey PRIMARY KEY (run_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_creatives_status ON public.creatives(status);
CREATE INDEX IF NOT EXISTS idx_creatives_created_at ON public.creatives(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creatives_competitor ON public.creatives(competitor_name);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON public.runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status ON public.runs(status);

-- Sample analysis JSONB structure:
-- {
--   "ocr": {
--     "blocks": [{"text": "...", "bbox": {...}, "confidence": 0.9}],
--     "fullText": "..."
--   },
--   "layout": {
--     "elements": [{"type": "text", "bbox": {...}, "style": {...}}],
--     "canvasSize": {"width": 1080, "height": 1080}
--   },
--   "roles": [
--     {"role": "hook", "text": "..."},
--     {"role": "cta", "text": "..."}
--   ],
--   "dominant_colors": ["#FF0000", "#00FF00"],
--   "language": "en",
--   "aspect_ratio": "1:1"
-- }
