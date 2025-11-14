// Database types matching your Supabase schema
export interface Creative {
  id: string;
  competitor_name: string | null;
  original_image_url: string;
  analysis: AnalysisData | null;
  generated_character_url: string | null;
  generated_background_url: string | null;
  generated_image_url: string | null;
  figma_file_id: string | null;
  status: 'pending' | 'analyzing' | 'generating' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisData {
  ocr?: OCRResult;
  layout?: {
    elements: LayoutElement[];
    canvasSize: { width: number; height: number };
  };
  roles?: TextRole[];
  dominant_colors?: string[];
  language?: string;
  aspect_ratio?: string;
}

export interface Pattern {
  pattern_id: string;
  name: string | null;
  file_key: string | null;
  node_id: string | null;
  template_yaml: any;
  preferred_bg: string | null;
  sizes: string[] | null;
  weights: any;
  inserted_at: string;
}

export interface Run {
  run_id: string;
  input: any;
  output: any;
  status: string | null;
  latency_ms: number | null;
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

export type CopyMode = 'simple_overlay' | 'dalle_inpaint' | 'bg_regen' | 'new_text_pattern';

export type GenerationType = 'character' | 'background' | 'full_creative';

export type StylePreset = 'anime' | 'sakura' | 'realistic' | 'original' | '3d' | 'minimal';

// API Request/Response types
export interface AnalyzeRequest {
  creativeId: string;
}

export interface AnalyzeResponse {
  creative: Creative;
  analysis: AnalysisData;
}

export interface GenerateRequest {
  creativeId: string;
  generationType: GenerationType;
  stylePreset?: StylePreset;
  texts?: Record<string, string>;
  patternId?: string;
  llmModel?: string;
  temperature?: number;
  language?: string;
}

export interface GenerateResponse {
  creative: Creative;
  generated_url: string;
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

