import OpenAI from 'openai';
import type { GenerateBackgroundParams, EditImageParams } from '@/types/creative';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
    // Convert buffers to File objects for DALL·E API
    // Use Uint8Array to properly convert Buffer to BlobPart
    const imageBlob = new Blob([new Uint8Array(params.image)], { type: 'image/png' });
    const maskBlob = new Blob([new Uint8Array(params.mask)], { type: 'image/png' });
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
 * Creates a detailed DALL·E prompt for background generation
 */
export function generateBackgroundPrompt(designAnalysis: any, styleDescription?: string): string {
  const background = designAnalysis.background;
  const colorPalette = designAnalysis.color_palette;
  
  let prompt = '';
  
  // Background type and colors
  if (background?.type === 'gradient') {
    prompt += `${background.type} background with colors ${background.colors.join(', ')}. `;
  } else if (background?.type === 'solid') {
    prompt += `Solid ${background.colors[0]} background. `;
  } else {
    prompt += `${background?.description || 'Abstract background'}. `;
  }
  
  // Add color palette
  if (colorPalette) {
    prompt += `Color palette: primary ${colorPalette.primary}`;
    if (colorPalette.secondary) {
      prompt += `, secondary ${colorPalette.secondary}`;
    }
    if (colorPalette.accent && colorPalette.accent.length > 0) {
      prompt += `, accents ${colorPalette.accent.slice(0, 2).join(', ')}`;
    }
    prompt += '. ';
  }
  
  // Style
  if (styleDescription) {
    prompt += `Style: ${styleDescription}. `;
  } else {
    prompt += 'Modern, clean, professional. ';
  }
  
  // For EdTech
  prompt += 'Educational technology advertising style, vibrant and engaging. ';
  
  // Technical requirements
  prompt += 'High quality, well-lit, suitable for text overlay.';
  
  console.log(`📝 Generated background prompt: ${prompt.substring(0, 100)}...`);
  
  return prompt;
}

/**
 * Generate inpaint prompt to remove text and maintain style
 * Creates a prompt for DALL·E edit to remove text while keeping background
 */
export function generateInpaintPrompt(designAnalysis: any): string {
  const background = designAnalysis.background;
  const colorPalette = designAnalysis.color_palette;
  
  let prompt = 'Remove all text and fill the area seamlessly with the background. ';
  
  // Describe what to keep
  if (background?.description) {
    prompt += background.description + '. ';
  }
  
  // Maintain colors
  if (colorPalette) {
    prompt += `Keep the color scheme: ${colorPalette.primary}`;
    if (colorPalette.secondary) {
      prompt += `, ${colorPalette.secondary}`;
    }
    prompt += '. ';
  }
  
  // Keep graphics and characters
  if (designAnalysis.graphics && designAnalysis.graphics.length > 0) {
    prompt += 'Preserve all graphics, icons, and illustrations. ';
  }
  
  if (designAnalysis.characters && designAnalysis.characters.length > 0) {
    prompt += 'Preserve all characters and people. ';
  }
  
  prompt += 'Maintain the overall style and mood. Natural and seamless blending.';
  
  console.log(`📝 Generated inpaint prompt: ${prompt.substring(0, 100)}...`);
  
  return prompt;
}

