-- Test data for Creative Copycat
-- Run this after setting up the schema to populate with sample data

-- Sample creatives
-- Note: Make sure to upload corresponding images to Supabase Storage first
INSERT INTO creatives (id, source_image_path, platform, source_url, width, height, created_at)
VALUES 
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'samples/facebook-ad-1.jpg', 'Facebook', 'https://facebook.com/ads/123', 1080, 1080, NOW() - INTERVAL '5 days'),
  ('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'samples/instagram-story-1.jpg', 'Instagram', 'https://instagram.com/stories/456', 1080, 1920, NOW() - INTERVAL '4 days'),
  ('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'samples/tiktok-ad-1.jpg', 'TikTok', 'https://tiktok.com/ads/789', 1080, 1920, NOW() - INTERVAL '3 days'),
  ('d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a', 'samples/youtube-bumper-1.jpg', 'YouTube', 'https://youtube.com/ads/012', 1920, 1080, NOW() - INTERVAL '2 days'),
  ('e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b', 'samples/linkedin-ad-1.jpg', 'LinkedIn', 'https://linkedin.com/ads/345', 1200, 628, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Sample creative analysis for the first creative
INSERT INTO creative_analysis (
  id,
  creative_id,
  ocr_json,
  layout_json,
  roles_json,
  dominant_colors,
  language,
  aspect_ratio,
  analyzed_at
)
VALUES (
  'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  '{
    "blocks": [
      {
        "text": "SUMMER SALE",
        "bbox": {"x": 100, "y": 80, "width": 880, "height": 120},
        "confidence": 0.98
      },
      {
        "text": "Up to 70% OFF",
        "bbox": {"x": 150, "y": 250, "width": 780, "height": 100},
        "confidence": 0.95
      },
      {
        "text": "Limited time offer! Get huge discounts on all summer collections. Don''t miss out!",
        "bbox": {"x": 100, "y": 400, "width": 880, "height": 200},
        "confidence": 0.92
      },
      {
        "text": "SHOP NOW",
        "bbox": {"x": 350, "y": 750, "width": 380, "height": 80},
        "confidence": 0.99
      }
    ],
    "fullText": "SUMMER SALE\\nUp to 70% OFF\\nLimited time offer! Get huge discounts on all summer collections. Don''t miss out!\\nSHOP NOW"
  }'::jsonb,
  '{
    "elements": [
      {
        "type": "text",
        "bbox": {"x": 100, "y": 80, "width": 880, "height": 120},
        "style": {
          "fontSize": 84,
          "fontFamily": "Arial, sans-serif",
          "color": "#FFFFFF",
          "align": "center",
          "fontWeight": "bold"
        }
      },
      {
        "type": "text",
        "bbox": {"x": 150, "y": 250, "width": 780, "height": 100},
        "style": {
          "fontSize": 70,
          "fontFamily": "Arial, sans-serif",
          "color": "#FFD700",
          "align": "center",
          "fontWeight": "bold"
        }
      },
      {
        "type": "text",
        "bbox": {"x": 100, "y": 400, "width": 880, "height": 200},
        "style": {
          "fontSize": 140,
          "fontFamily": "Arial, sans-serif",
          "color": "#FFFFFF",
          "align": "center",
          "fontWeight": "normal"
        }
      },
      {
        "type": "text",
        "bbox": {"x": 350, "y": 750, "width": 380, "height": 80},
        "style": {
          "fontSize": 56,
          "fontFamily": "Arial, sans-serif",
          "color": "#000000",
          "align": "center",
          "fontWeight": "bold"
        }
      }
    ],
    "canvasSize": {"width": 1080, "height": 1080}
  }'::jsonb,
  '[
    {"role": "hook", "text": "SUMMER SALE"},
    {"role": "twist", "text": "Up to 70% OFF"},
    {"role": "body", "text": "Limited time offer! Get huge discounts on all summer collections. Don''t miss out!"},
    {"role": "cta", "text": "SHOP NOW"}
  ]'::jsonb,
  '["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFD700", "#FFFFFF"]'::jsonb,
  'en',
  '1:1',
  NOW() - INTERVAL '5 days'
)
ON CONFLICT (creative_id) DO NOTHING;

-- Sample creative variant (simple overlay copy)
INSERT INTO creative_variants (
  id,
  creative_id,
  analysis_id,
  variant_type,
  style_preset,
  language,
  background_path,
  rendered_path,
  texts_json,
  copy_mode,
  created_at
)
VALUES (
  'a7b8c9d0-e1f2-4a5b-4c5d-6e7f8a9b0c1d',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c',
  'copy',
  'original',
  'en',
  NULL,
  'renders/test-simple-overlay-001.png',
  '{
    "texts": {
      "hook": "WINTER SALE",
      "twist": "Up to 80% OFF",
      "body": "Exclusive offer! Save big on winter essentials. Limited stock available!",
      "cta": "GET YOURS"
    },
    "meta": {
      "llm_model": "anthropic/claude-3.5-sonnet",
      "temperature": 0.7,
      "copy_mode": "simple_overlay"
    }
  }'::jsonb,
  'simple_overlay',
  NOW() - INTERVAL '4 days'
)
ON CONFLICT (id) DO NOTHING;

-- Sample creative variant (DALL·E inpaint)
INSERT INTO creative_variants (
  id,
  creative_id,
  analysis_id,
  variant_type,
  style_preset,
  language,
  background_path,
  rendered_path,
  texts_json,
  copy_mode,
  created_at
)
VALUES (
  'b8c9d0e1-f2a3-4b5c-5d6e-7f8a9b0c1d2e',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c',
  'copy',
  'original',
  'en',
  'backgrounds/test-inpaint-bg-001.png',
  'renders/test-inpaint-render-001.png',
  '{
    "texts": {
      "hook": "BLACK FRIDAY",
      "twist": "Up to 90% OFF",
      "body": "Biggest sale of the year! Don''t miss these incredible deals!",
      "cta": "BUY NOW"
    },
    "meta": {
      "llm_model": "openai/gpt-4-turbo",
      "temperature": 0.8,
      "copy_mode": "dalle_inpaint"
    }
  }'::jsonb,
  'dalle_inpaint',
  NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- Sample variation (new text, same style)
INSERT INTO creative_variants (
  id,
  creative_id,
  analysis_id,
  variant_type,
  style_preset,
  language,
  background_path,
  rendered_path,
  texts_json,
  copy_mode,
  created_at
)
VALUES (
  'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c',
  'variation_text',
  'original',
  'en',
  NULL,
  'renders/test-variation-text-001.png',
  '{
    "texts": {
      "hook": "MEGA DEALS",
      "twist": "Save 50%+",
      "body": "Unbeatable prices on everything you love. Today only!",
      "cta": "GRAB IT"
    },
    "meta": {
      "llm_model": "anthropic/claude-3.5-sonnet",
      "temperature": 0.9,
      "niche": "e-commerce"
    }
  }'::jsonb,
  NULL,
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- Sample variation (new style, same text)
INSERT INTO creative_variants (
  id,
  creative_id,
  analysis_id,
  variant_type,
  style_preset,
  language,
  background_path,
  rendered_path,
  texts_json,
  copy_mode,
  created_at
)
VALUES (
  'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c',
  'variation_style',
  'anime',
  'en',
  'backgrounds/test-anime-bg-001.png',
  'renders/test-variation-style-anime-001.png',
  '{
    "texts": {
      "hook": "SUMMER SALE",
      "twist": "Up to 70% OFF",
      "body": "Limited time offer! Get huge discounts on all summer collections. Don''t miss out!",
      "cta": "SHOP NOW"
    },
    "meta": {
      "style": "anime"
    }
  }'::jsonb,
  NULL,
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- Query to verify test data
-- Run this to check everything was inserted correctly:
/*
SELECT 'Creatives' as table_name, COUNT(*) as count FROM creatives
UNION ALL
SELECT 'Analyses' as table_name, COUNT(*) as count FROM creative_analysis
UNION ALL
SELECT 'Variants' as table_name, COUNT(*) as count FROM creative_variants;

-- Expected output:
-- Creatives: 5
-- Analyses: 1
-- Variants: 4
*/

