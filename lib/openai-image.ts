import { BoundingBox, LayoutElement } from '@/types/creative';
import { generateMask, filterBoxesByType } from './mask-generator';
import FormData from 'form-data';
import fetch from 'node-fetch';

interface BannerLayout {
  image_size: { width: number; height: number };
  background: {
    color: string;
    description: string;
  };
  elements: LayoutElement[];
}

interface MaskEditParams {
  imageBuffer: Buffer;
  modifications: string; // User's instruction: what to change and how
  editTypes?: string[]; // Which element types to edit (e.g., ['character', 'logo'])
  aspectRatio?: string;
}

/**
 * MASK-BASED EDITING PIPELINE (3 steps)
 * Based on ai_banner_editing_instruction.md
 * 
 * Step 1: Analyze banner → extract layout JSON with bounding boxes
 * Step 2: Generate mask PNG from bounding boxes
 * Step 3: Edit image using /v1/images/edits with mask
 */
export async function generateMaskEdit(params: MaskEditParams): Promise<Buffer> {
  const { imageBuffer, modifications, editTypes = ['character'], aspectRatio = '9:16' } = params;

  try {
    console.log('🎭 MASK EDIT PIPELINE: Starting...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    console.log(`📝 Modifications: ${modifications}`);
    console.log(`🎯 Edit types: ${editTypes.join(', ')}`);

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // ========== STEP 1: Analyze banner → JSON layout with bbox ==========
    console.log('\n👁️ STEP 1: Analyzing banner structure...');

    const analysisPrompt = `You will see a SINGLE advertising banner image. Ignore any surrounding UI.
Your job is to analyze it and return a STRICT JSON description of its layout and main elements.

Use this EXACT JSON shape:
{
  "image_size": { "width": 0, "height": 0 },
  "background": {
    "color": "string",
    "description": "string"
  },
  "elements": [
    {
      "id": "string",
      "type": "text | character | logo | button | decor | other",
      "role": "headline | body | cta | brand | primary | shape | other",
      "text": "string | null",
      "subtext": "string | null",
      "font_style": "string | null",
      "color": "string | null",
      "description": "string | null",
      "bbox": { "x": 0, "y": 0, "width": 0, "height": 0 },
      "z_index": 0
    }
  ]
}

Rules:
- Coordinates must be in pixels.
- x,y = top-left corner of element.
- Copy ALL text exactly as it appears.
- Identify all main elements: headline, body text, CTA button, character/person, logo, decorative shapes.
- Provide font_style and color for text elements (e.g., "bold sans-serif", "pink").
- Expand bounding boxes slightly to fully include each element.
- z_index: larger numbers = on top (e.g., character=10, background shapes=1).
- Return ONLY valid JSON, no explanations.`;

    const step1Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!step1Response.ok) {
      const errorText = await step1Response.text();
      console.error('❌ Step 1 error:', step1Response.status, errorText);
      throw new Error(`Step 1 API error: ${step1Response.status}`);
    }

    const step1Data: any = await step1Response.json();
    const layoutRaw = step1Data.choices?.[0]?.message?.content;

    if (!layoutRaw) {
      throw new Error('No layout returned from Step 1');
    }

    // Parse layout JSON
    let layout: BannerLayout;
    try {
      const jsonMatch = layoutRaw.match(/```json\s*([\s\S]*?)\s*```/) || layoutRaw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : layoutRaw;
      layout = JSON.parse(jsonStr);
    } catch (e) {
      console.error('❌ Failed to parse layout JSON:', layoutRaw);
      throw new Error('Invalid layout JSON from Step 1');
    }

    console.log('✅ STEP 1 COMPLETE! Layout extracted:');
    console.log(JSON.stringify(layout, null, 2));

    // ========== STEP 2: Generate mask from bounding boxes ==========
    console.log('\n🎨 STEP 2: Generating mask...');

    const editBoxes = filterBoxesByType(layout.elements, editTypes);

    if (editBoxes.length === 0) {
      console.warn('⚠️ No elements found for editing types:', editTypes);
      throw new Error(`No elements of type [${editTypes.join(', ')}] found in the banner`);
    }

    const maskBuffer = await generateMask({
      width: layout.image_size.width,
      height: layout.image_size.height,
      boxes: editBoxes,
      padding: 30, // Extra pixels around each element
    });

    console.log('✅ STEP 2 COMPLETE! Mask generated.');

    // ========== STEP 3: Edit image with mask using /v1/images/edits ==========
    console.log('\n✏️ STEP 3: Editing image with mask...');

    // Build edit prompt
    const editPrompt = buildEditPrompt(layout, modifications, editTypes);
    console.log('📝 Edit prompt:', editPrompt);

    // Map aspect ratio to size
    let imageSize: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024';
    if (aspectRatio === '9:16' || aspectRatio === '1080x1920') {
      imageSize = '1024x1792'; // vertical
    } else if (aspectRatio === '16:9') {
      imageSize = '1792x1024'; // horizontal
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('model', 'dall-e-2'); // Note: edits endpoint uses dall-e-2
    formData.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png',
    });
    formData.append('mask', maskBuffer, {
      filename: 'mask.png',
      contentType: 'image/png',
    });
    formData.append('prompt', editPrompt);
    formData.append('n', '1');
    formData.append('size', imageSize);

    const editResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    if (!editResponse.ok) {
      const errorText = await editResponse.text();
      console.error('❌ Step 3 error:', editResponse.status, errorText);
      throw new Error(`Image edit API error: ${editResponse.status}`);
    }

    const editData: any = await editResponse.json();
    const resultUrl = editData.data?.[0]?.url;

    if (!resultUrl) {
      throw new Error('No edited image URL returned from API');
    }

    // Download the result
    console.log('⬇️ Downloading edited image...');
    const imageResponse = await fetch(resultUrl);
    const resultBuffer = Buffer.from(await imageResponse.arrayBuffer());

    console.log(`✅ STEP 3 COMPLETE! Image edited: ${resultBuffer.length} bytes`);
    console.log('🎉 Mask edit pipeline successful!\n');

    return resultBuffer;
  } catch (error) {
    console.error('❌ Mask edit pipeline error:', error);
    throw error;
  }
}

/**
 * Build a precise edit prompt based on layout and user modifications
 */
function buildEditPrompt(layout: BannerLayout, modifications: string, editTypes: string[]): string {
  const preservedElements = layout.elements.filter((el) => !editTypes.includes(el.type));
  const editedElements = layout.elements.filter((el) => editTypes.includes(el.type));

  let prompt = `Professional advertising banner. `;

  // Describe what to preserve
  prompt += `Preserve the following EXACTLY: `;
  prompt += `- Background: ${layout.background.description}. `;
  
  if (preservedElements.length > 0) {
    const textElements = preservedElements.filter((el) => el.type === 'text' && el.text);
    if (textElements.length > 0) {
      prompt += `- All text blocks: `;
      textElements.forEach((el) => {
        prompt += `"${el.text}" (${el.font_style}, ${el.color}), `;
      });
    }

    const otherElements = preservedElements.filter((el) => el.type !== 'text');
    if (otherElements.length > 0) {
      prompt += `- Other elements: `;
      otherElements.forEach((el) => {
        if (el.description) {
          prompt += `${el.description}, `;
        }
      });
    }
  }

  // Describe what to change
  prompt += `\n\nChange the following areas (white mask): `;
  editedElements.forEach((el) => {
    prompt += `${el.type} (${el.description || el.role}), `;
  });

  // Add user's modification instructions
  prompt += `\n\nModifications: ${modifications}`;

  // Add quality instructions
  prompt += `\n\nMaintain high quality, professional design, same layout and composition.`;

  return prompt;
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
