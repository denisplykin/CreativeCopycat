-- Create creative_runs table for tracking generation history

CREATE TABLE IF NOT EXISTS public.creative_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  creative_id UUID NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL, -- 'full_creative', 'copy_only', etc.
  copy_mode TEXT, -- 'mask_edit', 'dalle_simple', etc.
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  result_url TEXT,
  error_message TEXT,
  config JSONB, -- Store generation config
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT creative_runs_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_creative_runs_creative_id ON public.creative_runs(creative_id);
CREATE INDEX IF NOT EXISTS idx_creative_runs_created_at ON public.creative_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_runs_status ON public.creative_runs(status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.creative_runs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on creative_runs" ON public.creative_runs
  FOR ALL
  USING (true)
  WITH CHECK (true);

