-- Добавляем новые колонки из Google Sheets
ALTER TABLE competitor_creatives 
ADD COLUMN IF NOT EXISTS active_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ad_text TEXT,
ADD COLUMN IF NOT EXISTS ad_text_eng TEXT,
ADD COLUMN IF NOT EXISTS landing_page_url TEXT,
ADD COLUMN IF NOT EXISTS cta_button TEXT,
ADD COLUMN IF NOT EXISTS platform_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS age_targeting TEXT,
ADD COLUMN IF NOT EXISTS course_subjects TEXT,
ADD COLUMN IF NOT EXISTS offers TEXT,
ADD COLUMN IF NOT EXISTS text_variants INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_variants INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ad_id TEXT;

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_competitor_creatives_active_days ON competitor_creatives(active_days DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_creatives_ad_id ON competitor_creatives(ad_id);
