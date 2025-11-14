// Database types
export interface Creative {
  id: string;
  source_image_path: string;
  platform: string;
  source_url: string | null;
  width: number;
  height: number;
  created_at: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextBlock {
  text: string;
  bbox: BoundingBox;
  confidence?: number;
}

export interface OCRResult {
  blocks: TextBlock[];
  fullText: string;
}

export interface TextRole {
  role: 'hook' | 'twist' | 'cta' | 'body' | 'headline' | 'subheadline';
  text: string;
  bbox?: BoundingBox;
}

export interface LayoutElement {
  type: 'text' | 'image' | 'character' | 'logo';
  bbox: BoundingBox;
  style?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    align?: 'left' | 'center' | 'right';
    fontWeight?: 'normal' | 'bold';
  };
}

export interface CreativeAnalysis {
  id: string;
  creative_id: string;
  ocr_json: OCRResult;
  layout_json: {
    elements: LayoutElement[];
    canvasSize: { width: number; height: number };
  };
  roles_json: TextRole[];
  dominant_colors: string[];
  language: string;
  aspect_ratio: string;
  analyzed_at: string;
}

export type CopyMode = 'simple_overlay' | 'dalle_inpaint' | 'bg_regen' | 'new_text_pattern';

export type VariantType = 'copy' | 'variation_text' | 'variation_style' | 'variation_structure';

export type StylePreset = 'anime' | 'sakura' | 'realistic' | 'original' | '3d' | 'minimal';

export interface CreativeVariant {
  id: string;
  creative_id: string;
  analysis_id: string | null;
  variant_type: VariantType;
  style_preset: StylePreset;
  language: string;
  background_path: string | null;
  rendered_path: string;
  texts_json: {
    texts: Record<string, string>;
    meta?: {
      llm_model?: string;
      temperature?: number;
      copy_mode?: CopyMode;
    };
  };
  copy_mode: CopyMode | null;
  created_at: string;
}

// API Request/Response types
export interface AnalyzeRequest {
  creativeId: string;
}

export interface AnalyzeResponse {
  analysisId: string;
  analysis: CreativeAnalysis;
}

export interface GenerateCopyRequest {
  creativeId: string;
  copyMode: CopyMode;
  texts?: Record<string, string>;
  stylePreset?: StylePreset;
  llmModel?: string;
  temperature?: number;
  language?: string;
}

export interface GenerateCopyResponse {
  variantId: string;
  imageUrl: string;
  variant: CreativeVariant;
}

export interface GenerateVariationRequest {
  creativeId: string;
  variantType: 'variation_text' | 'variation_style' | 'variation_structure';
  stylePreset?: StylePreset;
  language?: string;
  niche?: string;
  llmModel?: string;
  temperature?: number;
}

export interface GenerateVariationResponse {
  variantId: string;
  imageUrl: string;
  variant: CreativeVariant;
}

// LLM types
export interface RolesJSON {
  roles: TextRole[];
}

export interface TextsJSON {
  texts: Record<string, string>;
}

// DALL·E types
export interface GenerateBackgroundParams {
  stylePreset: StylePreset;
  prompt: string;
  width: number;
  height: number;
}

export interface EditImageParams {
  image: Buffer;
  mask: Buffer;
  prompt: string;
}

