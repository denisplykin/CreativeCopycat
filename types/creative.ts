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
  // Text analysis
  ocr?: OCRResult;
  roles?: TextRole[];
  language?: string;
  
  // Layout and elements
  layout?: {
    elements: LayoutElement[];
    canvasSize: { width: number; height: number };
  };
  
  // Visual design
  design?: {
    background: BackgroundInfo;
    characters: CharacterInfo[];
    graphics: GraphicElement[];
    color_palette: ColorPalette;
    typography: TypographyInfo[];
  };
  
  // Colors
  dominant_colors?: string[];
  
  // Metadata
  aspect_ratio?: string;
  
  // Full description for recreation
  description?: string;
}

export interface BackgroundInfo {
  type: 'solid' | 'gradient' | 'image' | 'pattern';
  colors: string[];
  description: string;
  position?: BoundingBox; // If background is not full canvas
}

export interface CharacterInfo {
  description: string;
  position: BoundingBox;
  pose?: string;
  clothing?: string;
  accessories?: string[];
  facial_expression?: string;
}

export interface GraphicElement {
  type: 'icon' | 'shape' | 'decoration' | 'logo' | 'illustration';
  description: string;
  position: BoundingBox;
  colors?: string[];
  style?: string; // e.g., "flat", "3D", "outlined"
}

export interface ColorPalette {
  primary: string;
  secondary?: string;
  accent?: string[];
  text_colors: string[];
  background_colors: string[];
}

export interface TypographyInfo {
  text: string;
  font_family?: string;
  font_size: number;
  font_weight: string; // 'normal', 'bold', 'black'
  color: string;
  position: BoundingBox;
  alignment?: 'left' | 'center' | 'right';
  line_height?: number;
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
  confidence?: number; // Overall OCR confidence (0-1)
  language?: string; // Detected language code
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

export type CopyMode = 'simple_overlay' | 'dalle_inpaint' | 'gpt_image' | 'style_variations';

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
  copyMode?: CopyMode;
  stylePreset?: StylePreset;
  texts?: Record<string, string>;
  patternId?: string;
  llmModel?: string;
  temperature?: number;
  language?: string;
  aspectRatio?: string;
  numVariations?: number;
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

