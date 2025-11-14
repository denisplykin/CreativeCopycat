import { supabaseAdmin } from './supabase';
import type {
  Creative,
  CreativeAnalysis,
  CreativeVariant,
  OCRResult,
  TextRole,
  LayoutElement,
  CopyMode,
} from '@/types/creative';

/**
 * Get all creatives
 */
export async function getCreatives(): Promise<Creative[]> {
  const { data, error } = await supabaseAdmin
    .from('creatives')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch creatives: ${error.message}`);
  }

  return data || [];
}

/**
 * Get creative by ID
 */
export async function getCreativeById(id: string): Promise<Creative | null> {
  const { data, error } = await supabaseAdmin
    .from('creatives')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Failed to fetch creative: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Get creative analysis
 */
export async function getCreativeAnalysis(creativeId: string): Promise<CreativeAnalysis | null> {
  const { data, error } = await supabaseAdmin
    .from('creative_analysis')
    .select('*')
    .eq('creative_id', creativeId)
    .single();

  if (error) {
    console.error(`Failed to fetch analysis: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Create or update creative analysis
 */
export async function upsertCreativeAnalysis(
  creativeId: string,
  ocrJson: OCRResult,
  layoutJson: { elements: LayoutElement[]; canvasSize: { width: number; height: number } },
  rolesJson: TextRole[],
  dominantColors: string[],
  language: string,
  aspectRatio: string
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('creative_analysis')
    .upsert(
      {
        creative_id: creativeId,
        ocr_json: ocrJson,
        layout_json: layoutJson,
        roles_json: rolesJson,
        dominant_colors: dominantColors,
        language,
        aspect_ratio: aspectRatio,
        analyzed_at: new Date().toISOString(),
      },
      { onConflict: 'creative_id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert analysis: ${error.message}`);
  }

  return data.id;
}

/**
 * Get creative variants
 */
export async function getCreativeVariants(creativeId: string): Promise<CreativeVariant[]> {
  const { data, error } = await supabaseAdmin
    .from('creative_variants')
    .select('*')
    .eq('creative_id', creativeId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch variants: ${error.message}`);
  }

  return data || [];
}

/**
 * Create creative variant
 */
export async function createCreativeVariant(
  creativeId: string,
  analysisId: string | null,
  variantType: string,
  stylePreset: string,
  language: string,
  backgroundPath: string | null,
  renderedPath: string,
  textsJson: {
    texts: Record<string, string>;
    meta?: {
      llm_model?: string;
      temperature?: number;
      copy_mode?: CopyMode;
    };
  },
  copyMode: CopyMode | null
): Promise<CreativeVariant> {
  const { data, error } = await supabaseAdmin
    .from('creative_variants')
    .insert({
      creative_id: creativeId,
      analysis_id: analysisId,
      variant_type: variantType,
      style_preset: stylePreset,
      language,
      background_path: backgroundPath,
      rendered_path: renderedPath,
      texts_json: textsJson,
      copy_mode: copyMode,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create variant: ${error.message}`);
  }

  return data;
}

