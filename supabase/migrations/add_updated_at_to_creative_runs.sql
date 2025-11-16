-- Add updated_at column to creative_runs table
-- This migration adds the missing updated_at column that is referenced in the code

ALTER TABLE public.creative_runs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comment for documentation
COMMENT ON COLUMN public.creative_runs.updated_at IS 'Timestamp of the last update to this run record';

