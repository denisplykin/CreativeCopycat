import type { BackgroundInfo, CharacterInfo, GraphicElement, ColorPalette, TypographyInfo } from '@/types/creative';

/**
 * Full creative design analysis using Gemini 2.5 Flash Image
 * Extracts all visual elements, colors, typography, characters, and layout
 */
export async function analyzeCreativeDesign(imageBuffer: Buffer): Promise<{
  background: BackgroundInfo;
  characters: CharacterInfo[];
  graphics: GraphicElement[];
  color_palette: ColorPalette;
  typography: TypographyInfo[];
  description: string;
}> {
  try {
    console.log('🎨 Starting full design analysis with Gemini Vision...');

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // Call Gemini Vision for comprehensive analysis
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert design analyst. Analyze this advertising creative in EXTREME DETAIL.

I need to be able to RECREATE this creative 100% based on your analysis.

Provide a comprehensive JSON analysis with:

1. **Background**:
   - Type: solid/gradient/image/pattern
   - All colors (hex codes)
   - Detailed description
   - Position (if not full canvas): {x_percent, y_percent, width_percent, height_percent}

2. **Characters** (people, mascots, illustrations of beings):
   - Description (gender, age, ethnicity, style)
   - Position: {x_percent, y_percent, width_percent, height_percent}
   - Pose (sitting, standing, pointing, etc)
   - Clothing (colors, style, details)
   - Accessories (glasses, hat, props)
   - Facial expression

3. **Graphics** (icons, shapes, decorations, logos):
   - Type: icon/shape/decoration/logo/illustration
   - Description
   - Position: {x_percent, y_percent, width_percent, height_percent}
   - Colors (hex codes)
   - Style: flat/3D/outlined/realistic

4. **Color Palette**:
   - Primary color (hex)
   - Secondary color (hex)
   - Accent colors (hex array)
   - Text colors used (hex array)
   - Background colors (hex array)

5. **Typography** (ALL text elements):
   - Text content
   - Font family (or closest generic: sans-serif/serif/display/script)
   - Font size (in pixels, estimate based on image size)
   - Font weight: normal/bold/black/light
   - Color (hex)
   - Position: {x_percent, y_percent, width_percent, height_percent}
   - Alignment: left/center/right
   - Line height (estimate)

6. **Description**: A comprehensive paragraph describing the overall design, composition, mood, style, and how all elements work together. This should be detailed enough to recreate the creative.

Return ONLY valid JSON in this structure:
{
  "background": {
    "type": "gradient",
    "colors": ["#FF0000", "#0000FF"],
    "description": "Vertical gradient from red to blue",
    "position": {"x_percent": 0, "y_percent": 0, "width_percent": 100, "height_percent": 100}
  },
  "characters": [
    {
      "description": "Young Asian woman, 20s, friendly expression",
      "position": {"x_percent": 10, "y_percent": 20, "width_percent": 30, "height_percent": 60},
      "pose": "Standing, arms crossed",
      "clothing": "Blue t-shirt, jeans",
      "accessories": ["Glasses", "Smartwatch"],
      "facial_expression": "Smiling confidently"
    }
  ],
  "graphics": [
    {
      "type": "icon",
      "description": "Computer monitor icon",
      "position": {"x_percent": 50, "y_percent": 10, "width_percent": 10, "height_percent": 10},
      "colors": ["#00FF00"],
      "style": "flat"
    }
  ],
  "color_palette": {
    "primary": "#FF5500",
    "secondary": "#0055FF",
    "accent": ["#FFFF00", "#00FFFF"],
    "text_colors": ["#000000", "#FFFFFF"],
    "background_colors": ["#F0F0F0", "#E0E0E0"]
  },
  "typography": [
    {
      "text": "Learn Coding Today!",
      "font_family": "sans-serif",
      "font_size": 48,
      "font_weight": "bold",
      "color": "#000000",
      "position": {"x_percent": 30, "y_percent": 5, "width_percent": 40, "height_percent": 8},
      "alignment": "center",
      "line_height": 1.2
    }
  ],
  "description": "This is an EdTech advertising creative featuring..."
}

IMPORTANT:
- Use hex color codes (e.g., #FF5500, not "orange")
- Positions are percentages of image dimensions (0-100)
- Be extremely detailed and precise
- Include ALL visible elements
- Estimate sizes, fonts, and colors as accurately as possible
- The description should be comprehensive enough to recreate the entire creative`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        temperature: 0.2, // Low temperature for detailed, consistent analysis
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('⚠️ No content from Gemini');
      return getStubDesignAnalysis();
    }

    console.log('📝 Gemini design analysis response received');

    // Parse JSON from Gemini's response
    let jsonText = content;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const designData = JSON.parse(jsonText);

    // Convert percentage-based positions to pixel positions (approximate)
    const imageWidth = 1080; // Will be corrected by actual image size
    const imageHeight = 1080;

    // Convert background position
    if (designData.background.position) {
      designData.background.position = convertPercentToPixels(
        designData.background.position,
        imageWidth,
        imageHeight
      );
    }

    // Convert character positions
    designData.characters = (designData.characters || []).map((char: any) => ({
      ...char,
      position: convertPercentToPixels(char.position, imageWidth, imageHeight),
    }));

    // Convert graphic positions
    designData.graphics = (designData.graphics || []).map((graphic: any) => ({
      ...graphic,
      position: convertPercentToPixels(graphic.position, imageWidth, imageHeight),
    }));

    // Convert typography positions
    designData.typography = (designData.typography || []).map((typo: any) => ({
      ...typo,
      position: convertPercentToPixels(typo.position, imageWidth, imageHeight),
    }));

    console.log(`✅ Design analysis complete:`);
    console.log(`   📦 Background: ${designData.background.type}`);
    console.log(`   👤 Characters: ${designData.characters.length}`);
    console.log(`   🎨 Graphics: ${designData.graphics.length}`);
    console.log(`   🎨 Color palette: ${designData.color_palette.primary}`);
    console.log(`   📝 Typography: ${designData.typography.length} elements`);

    return designData;
  } catch (error) {
    console.error('❌ Design analysis error:', error);
    console.warn('⚠️ Falling back to stub design analysis');
    return getStubDesignAnalysis();
  }
}

/**
 * Convert percentage-based position to pixel position
 */
function convertPercentToPixels(
  position: { x_percent: number; y_percent: number; width_percent: number; height_percent: number },
  imageWidth: number,
  imageHeight: number
) {
  return {
    x: Math.round((position.x_percent / 100) * imageWidth),
    y: Math.round((position.y_percent / 100) * imageHeight),
    width: Math.round((position.width_percent / 100) * imageWidth),
    height: Math.round((position.height_percent / 100) * imageHeight),
  };
}

/**
 * Detect MIME type from buffer
 */
function detectMimeType(buffer: Buffer): string {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  return 'image/png';
}

/**
 * Stub design analysis for fallback
 */
function getStubDesignAnalysis() {
  return {
    background: {
      type: 'gradient' as const,
      colors: ['#FF6B6B', '#4ECDC4'],
      description: 'Vibrant gradient background',
      position: { x: 0, y: 0, width: 1080, height: 1080 },
    },
    characters: [],
    graphics: [],
    color_palette: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      accent: ['#FFE66D', '#A8DADC'],
      text_colors: ['#000000', '#FFFFFF'],
      background_colors: ['#FF6B6B', '#4ECDC4'],
    },
    typography: [],
    description: 'Stub design analysis - manual review recommended',
  };
}

