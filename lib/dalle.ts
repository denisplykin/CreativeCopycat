import OpenAI from 'openai';
import type { GenerateBackgroundParams, EditImageParams } from '@/types/creative';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// DALL·E API limits
const DALLE_EDIT_MAX_PROMPT_LENGTH = 1000; // DALL·E 2 edit/inpaint limit
const DALLE_GENERATE_MAX_PROMPT_LENGTH = 4000; // DALL·E 3 generate limit

/**
 * Intelligently truncate a prompt to fit DALL·E limits
 * Preserves the most important information
 */
function truncatePrompt(prompt: string, maxLength: number): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }

  // Try to cut at sentence boundaries
  const sentences = prompt.split('. ');
  let truncated = '';
  
  for (const sentence of sentences) {
    if ((truncated + sentence + '. ').length > maxLength - 50) {
      break;
    }
    truncated += sentence + '. ';
  }
  
  // If still too long, hard cut with ellipsis
  if (truncated.length === 0 || truncated.length > maxLength) {
    truncated = prompt.substring(0, maxLength - 3) + '...';
  }
  
  console.log(`⚠️ Prompt truncated from ${prompt.length} to ${truncated.length} chars`);
  return truncated.trim();
}

/**
 * Generate background image using DALL·E
 */
export async function generateBackground(
  params: GenerateBackgroundParams
): Promise<Buffer> {
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: params.prompt,
      size: getSizeString(params.width, params.height),
      quality: 'standard',
      n: 1,
      response_format: 'url',
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No data returned from DALL·E');
    }

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL·E');
    }

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('DALL·E generation error:', error);
    throw new Error('Failed to generate background with DALL·E');
  }
}

/**
 * Edit image using DALL·E inpainting
 */
export async function editImageWithMask(params: EditImageParams): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default;
    
    console.log('🔄 Preparing images for DALL·E (PNG + size check)...');
    
    // Convert image to PNG and ensure < 4MB
    let imagePng = await sharp(params.image)
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();
    
    // If image > 4MB, resize it down
    if (imagePng.length > 4 * 1024 * 1024) {
      console.warn(`⚠️ Image too large (${(imagePng.length / 1024 / 1024).toFixed(2)} MB), resizing...`);
      imagePng = await sharp(params.image)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 85, compressionLevel: 9 })
        .toBuffer();
      console.log(`✅ Resized to ${(imagePng.length / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Convert mask to PNG and ensure < 4MB
    let maskPng = await sharp(params.mask)
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();
    
    if (maskPng.length > 4 * 1024 * 1024) {
      console.warn(`⚠️ Mask too large (${(maskPng.length / 1024 / 1024).toFixed(2)} MB), resizing...`);
      maskPng = await sharp(params.mask)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 85, compressionLevel: 9 })
        .toBuffer();
      console.log(`✅ Mask resized to ${(maskPng.length / 1024 / 1024).toFixed(2)} MB`);
    }
    
    console.log(`📊 Final sizes: image=${(imagePng.length / 1024).toFixed(0)}KB, mask=${(maskPng.length / 1024).toFixed(0)}KB`);
    
    // Convert buffers to File objects for DALL·E API
    const imageBlob = new Blob([new Uint8Array(imagePng)], { type: 'image/png' });
    const maskBlob = new Blob([new Uint8Array(maskPng)], { type: 'image/png' });
    const imageFile = new File([imageBlob], 'image.png', { type: 'image/png' });
    const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });

    const response = await openai.images.edit({
      model: 'dall-e-2', // dall-e-3 doesn't support edit yet
      image: imageFile,
      mask: maskFile,
      prompt: params.prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No data returned from DALL·E');
    }

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL·E');
    }

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('DALL·E edit error:', error);
    throw new Error('Failed to edit image with DALL·E');
  }
}

/**
 * Convert width/height to DALL·E size string
 */
function getSizeString(width: number, height: number): '1024x1024' | '1792x1024' | '1024x1792' {
  const aspectRatio = width / height;

  if (aspectRatio > 1.5) {
    return '1792x1024'; // landscape
  } else if (aspectRatio < 0.7) {
    return '1024x1792'; // portrait
  } else {
    return '1024x1024'; // square
  }
}

/**
 * Create mask from text bounding boxes
 * Returns a white mask on black background where text should be removed
 * Uses actual OCR text positions to create precise masks
 */
export async function createTextMask(
  width: number,
  height: number,
  textBoxes: Array<{ x: number; y: number; width: number; height: number }>
): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  
  console.log(`🎭 Creating text mask for ${textBoxes.length} text blocks...`);
  
  // Create black background
  let maskImage = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();
  
  // Create white rectangles for each text box
  const whiteRects = await Promise.all(
    textBoxes.map(async (box) => {
      // Add padding around text boxes
      const padding = 10;
      const boxX = Math.max(0, Math.min(box.x - padding, width - 1));
      const boxY = Math.max(0, Math.min(box.y - padding, height - 1));
      
      // Calculate dimensions with proper bounds checking
      let boxWidth = box.width + padding * 2;
      let boxHeight = box.height + padding * 2;
      
      // Ensure the box fits within the image
      if (boxX + boxWidth > width) {
        boxWidth = width - boxX;
      }
      if (boxY + boxHeight > height) {
        boxHeight = height - boxY;
      }
      
      // Minimum size of 1x1 pixel
      boxWidth = Math.max(1, Math.floor(boxWidth));
      boxHeight = Math.max(1, Math.floor(boxHeight));
      
      // Skip boxes that are completely out of bounds
      if (boxWidth <= 0 || boxHeight <= 0 || boxX >= width || boxY >= height) {
        console.warn(`⚠️ Skipping invalid box: x=${boxX}, y=${boxY}, w=${boxWidth}, h=${boxHeight}`);
        return null;
      }
      
      return {
        input: await sharp({
          create: {
            width: boxWidth,
            height: boxHeight,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          }
        }).png().toBuffer(),
        top: boxY,
        left: boxX
      };
    })
  );
  
  // Filter out null entries (invalid boxes)
  const validRects = whiteRects.filter(rect => rect !== null) as Array<{
    input: Buffer;
    top: number;
    left: number;
  }>;
  
  // Composite all white rectangles onto black background
  if (validRects.length > 0) {
    maskImage = await sharp(maskImage)
      .composite(validRects)
      .png()
      .toBuffer();
    
    console.log(`✅ Text mask created with ${validRects.length}/${textBoxes.length} valid regions`);
  } else {
    console.warn(`⚠️ No valid text boxes found for mask creation`);
  }
  
  return maskImage;
}

/**
 * Generate background prompt from design analysis
 * Creates a VERY detailed DALL·E prompt using full Claude analysis
 */
export function generateBackgroundPrompt(designAnalysis: any, styleDescription?: string): string {
  // Handle undefined or null designAnalysis
  if (!designAnalysis) {
    console.warn('⚠️ No design analysis provided, using generic background prompt');
    return `${styleDescription || 'Modern, clean, professional'} background suitable for advertising creative. High quality, well-lit, vibrant and engaging. Educational technology style.`;
  }
  
  const background = designAnalysis.background;
  const colorPalette = designAnalysis.color_palette;
  const characters = designAnalysis.characters || [];
  const graphics = designAnalysis.graphics || [];
  const fullDescription = designAnalysis.description;
  
  let prompt = '';
  
  // Start with full description if available (most detailed!)
  if (fullDescription) {
    prompt += `${fullDescription} `;
  }
  
  // Background details
  if (background) {
    prompt += `Background: ${background.description || background.type}. `;
    if (background.colors && background.colors.length > 0) {
      prompt += `Background colors: ${background.colors.join(', ')}. `;
    }
  }
  
  // Characters (detailed descriptions)
  if (characters.length > 0) {
    prompt += `Characters: `;
    characters.forEach((char: any, i: number) => {
      prompt += `${char.description}`;
      if (char.pose) prompt += `, ${char.pose}`;
      if (char.clothing) prompt += `, wearing ${char.clothing}`;
      if (char.facial_expression) prompt += `, ${char.facial_expression}`;
      if (char.accessories) {
        const accessories = Array.isArray(char.accessories) ? char.accessories : [char.accessories];
        if (accessories.length > 0) {
          prompt += `, with ${accessories.join(', ')}`;
        }
      }
      if (i < characters.length - 1) prompt += '; ';
    });
    prompt += '. ';
  }
  
  // Graphics and visual elements
  if (graphics.length > 0) {
    prompt += `Visual elements: `;
    graphics.forEach((graphic: any, i: number) => {
      if (graphic.type !== 'logo') { // Skip logos
        prompt += `${graphic.description}`;
        if (graphic.style) prompt += ` (${graphic.style} style)`;
        if (graphic.colors && graphic.colors.length > 0) {
          prompt += `, colors: ${graphic.colors.join(', ')}`;
        }
        if (i < graphics.length - 1) prompt += '; ';
      }
    });
    prompt += '. ';
  }
  
  // Color palette (CRITICAL for matching style)
  if (colorPalette) {
    prompt += `Color scheme: `;
    prompt += `primary ${colorPalette.primary}`;
    if (colorPalette.secondary) {
      prompt += `, secondary ${colorPalette.secondary}`;
    }
    if (colorPalette.accent && colorPalette.accent.length > 0) {
      prompt += `, accents ${colorPalette.accent.join(', ')}`;
    }
    prompt += '. ';
  }
  
  // Style modifiers
  if (styleDescription) {
    prompt += `Art style: ${styleDescription}. `;
  }
  
  // Technical quality requirements
  prompt += 'High quality, professional advertising creative, well-lit, sharp focus, vibrant colors, suitable for text overlay, modern design, engaging composition, EdTech advertising style.';
  
  console.log(`📝 Generated DETAILED background prompt (${prompt.length} chars): ${prompt.substring(0, 150)}...`);
  
  // Truncate if needed for DALL·E 3 (4000 char limit)
  return truncatePrompt(prompt, DALLE_GENERATE_MAX_PROMPT_LENGTH);
}

/**
 * Generate inpaint prompt to remove text and maintain style
 * Creates a VERY detailed prompt for DALL·E edit with complete scene description
 */
export function generateInpaintPrompt(designAnalysis: any): string {
  // Handle undefined or null designAnalysis (for older creatives)
  if (!designAnalysis) {
    console.warn('⚠️ No design analysis provided, using generic inpaint prompt');
    return 'Remove all text and logos, fill the area seamlessly with the background. Preserve all visual elements except text. Natural and seamless blending. High quality inpainting.';
  }
  
  const background = designAnalysis.background;
  const colorPalette = designAnalysis.color_palette;
  const characters = designAnalysis.characters || [];
  const graphics = designAnalysis.graphics || [];
  const fullDescription = designAnalysis.description;
  
  let prompt = 'Remove all text and logos from the masked areas. Fill seamlessly. ';
  
  // CRITICAL: Describe the FULL scene so DALL·E knows what to preserve
  if (fullDescription) {
    prompt += `The scene shows: ${fullDescription} `;
  }
  
  // Background details (what to fill masked areas with)
  if (background) {
    prompt += `Fill text areas with: ${background.description || background.type}`;
    if (background.colors && background.colors.length > 0) {
      prompt += ` using colors ${background.colors.join(', ')}`;
    }
    prompt += '. ';
  }
  
  // Preserve characters
  if (characters.length > 0) {
    prompt += `PRESERVE all characters: `;
    characters.forEach((char: any, i: number) => {
      prompt += `${char.description}`;
      if (char.clothing) prompt += ` in ${char.clothing}`;
      if (i < characters.length - 1) prompt += ', ';
    });
    prompt += '. ';
  }
  
  // Preserve graphics (except logos)
  const nonLogoGraphics = graphics.filter((g: any) => g.type !== 'logo');
  if (nonLogoGraphics.length > 0) {
    prompt += `PRESERVE visual elements: `;
    nonLogoGraphics.forEach((graphic: any, i: number) => {
      prompt += `${graphic.description}`;
      if (i < nonLogoGraphics.length - 1) prompt += ', ';
    });
    prompt += '. ';
  }
  
  // Maintain exact color scheme
  if (colorPalette) {
    prompt += `Maintain exact color scheme: primary ${colorPalette.primary}`;
    if (colorPalette.secondary) {
      prompt += `, secondary ${colorPalette.secondary}`;
    }
    if (colorPalette.accent && colorPalette.accent.length > 0) {
      prompt += `, accents ${colorPalette.accent.slice(0, 3).join(', ')}`;
    }
    prompt += '. ';
  }
  
  // Technical requirements
  prompt += 'Natural and seamless blending, match lighting and shadows, maintain composition and style, high quality professional inpainting, no artifacts or distortions.';
  
  console.log(`📝 Generated DETAILED inpaint prompt (${prompt.length} chars): ${prompt.substring(0, 150)}...`);
  
  // CRITICAL: Truncate for DALL·E 2 edit (1000 char limit)
  return truncatePrompt(prompt, DALLE_EDIT_MAX_PROMPT_LENGTH);
}

