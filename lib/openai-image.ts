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
    console.log('\n✏️ STEP 3: Editing image with mask (gpt-image-1)...');

    // Build minimal edit prompt (important: keep it short!)
    const editPrompt = buildMinimalEditPrompt(modifications, editTypes);
    console.log('📝 Edit prompt:', editPrompt);

    // IMPORTANT: For /images/edits, both image and mask must be EXACTLY the same size
    const sharp = (await import('sharp')).default;
    
    const targetWidth = layout.image_size.width;
    const targetHeight = layout.image_size.height;
    
    console.log(`🔄 Converting image and mask to PNG (${targetWidth}x${targetHeight})...`);
    
    // Convert image to PNG with explicit size (ensure exact dimensions)
    const convertedImage = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, { 
        fit: 'fill', // Force exact dimensions
        kernel: 'nearest' 
      })
      .png()
      .toBuffer();
    
    // Get actual image dimensions after conversion
    const imageMetadata = await sharp(convertedImage).metadata();
    console.log(`📐 Image after conversion: ${imageMetadata.width}x${imageMetadata.height}`);
    
    // Convert mask to PNG with SAME exact size
    const convertedMask = await sharp(maskBuffer)
      .resize(targetWidth, targetHeight, { 
        fit: 'fill',
        kernel: 'nearest' 
      })
      .png()
      .toBuffer();
    
    // Get actual mask dimensions after conversion
    const maskMetadata = await sharp(convertedMask).metadata();
    console.log(`📐 Mask after conversion: ${maskMetadata.width}x${maskMetadata.height}`);
    
    console.log(`✅ Converted: image=${convertedImage.length} bytes, mask=${convertedMask.length} bytes`);
    
    // Verify sizes match
    if (imageMetadata.width !== maskMetadata.width || imageMetadata.height !== maskMetadata.height) {
      throw new Error(`Size mismatch! Image: ${imageMetadata.width}x${imageMetadata.height}, Mask: ${maskMetadata.width}x${maskMetadata.height}`);
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('image', convertedImage, {
      filename: 'image.png',
      contentType: 'image/png',
    });
    formData.append('mask', convertedMask, {
      filename: 'mask.png',
      contentType: 'image/png',
    });
    formData.append('prompt', editPrompt);
    // Note: 'size' is NOT needed for /images/edits - it uses input image size
    formData.append('quality', 'high');
    formData.append('n', '1');

    const editResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    console.log(`📊 Response status: ${editResponse.status} ${editResponse.statusText}`);

    if (!editResponse.ok) {
      const errorText = await editResponse.text();
      console.error('❌ Step 3 error:', editResponse.status, errorText);
      throw new Error(`Image edit API error: ${editResponse.status} - ${errorText.substring(0, 200)}`);
    }

    // Try to parse JSON
    const responseText = await editResponse.text();
    console.log('📦 Raw response (first 500 chars):', responseText.substring(0, 500));
    
    let editData: any;
    try {
      editData = JSON.parse(responseText);
      console.log('✅ Parsed JSON successfully');
    } catch (e) {
      console.error('❌ Failed to parse JSON. Full response:', responseText);
      throw new Error(`Invalid JSON response from API: ${responseText.substring(0, 200)}`);
    }
    
    console.log('📦 API Response:', JSON.stringify(editData, null, 2));
    
    // Check for b64_json format (if response_format was set)
    const b64Image = editData.data?.[0]?.b64_json;
    const resultUrl = editData.data?.[0]?.url;

    if (b64Image) {
      console.log('✅ Got b64_json response');
      // Convert base64 to buffer and return directly
      return Buffer.from(b64Image, 'base64');
    }

    if (!resultUrl) {
      console.error('❌ No URL or b64_json in response:', editData);
      throw new Error('No edited image URL or b64_json returned from API');
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
 * Build a MINIMAL edit prompt for gpt-image-1
 * According to docs: short prompts work better, model doesn't need detailed layout description
 */
function buildMinimalEditPrompt(modifications: string, editTypes: string[]): string {
  // Super minimal prompt - only what needs to change
  let prompt = `Replace ONLY the masked areas (${editTypes.join(', ')}). `;
  prompt += modifications;
  prompt += ` Do NOT change layout, text, colors, logo, or decorative shapes. Match lighting and perspective.`;
  
  return prompt;
}

/**
 * Build a precise edit prompt based on layout and user modifications (OLD VERSION - TOO VERBOSE)
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
