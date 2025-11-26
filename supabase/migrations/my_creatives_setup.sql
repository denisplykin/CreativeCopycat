-- Migration: Setup for My Creatives feature + fix ad_id constraint
-- Run this in Supabase SQL Editor

-- 1. Make ad_id nullable to allow uploads without ad_id
ALTER TABLE competitor_creatives 
ALTER COLUMN ad_id DROP NOT NULL;

-- 2. Add index for My Creatives filtering (optional but improves performance)
CREATE INDEX IF NOT EXISTS idx_competitor_creatives_competitor_name 
ON competitor_creatives(competitor_name);

-- 3. Update any existing uploads to use standardized name
UPDATE competitor_creatives 
SET competitor_name = 'My Creatives' 
WHERE competitor_name = 'My Upload';

-- Verify changes
SELECT 
  column_name, 
  is_nullable, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'competitor_creatives' 
  AND column_name = 'ad_id';

