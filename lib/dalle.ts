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
    const imageBlob = new Blob([params.image], { type: 'image/png' });
    const maskBlob = new Blob([params.mask], { type: 'image/png' });
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
 * MVP: Creates a simple mask using sharp
 */
export async function createTextMask(
  width: number,
  height: number,
  textBoxes: Array<{ x: number; y: number; width: number; height: number }>
): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  
  // Create black background
  const blackBackground = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();
  
  // For MVP, create a simple mask
  // TODO: Add white rectangles for text boxes using sharp composite
  // For now, return a simple mask that covers the center area
  const maskWidth = Math.floor(width * 0.8);
  const maskHeight = Math.floor(height * 0.6);
  const maskX = Math.floor((width - maskWidth) / 2);
  const maskY = Math.floor((height - maskHeight) / 2);
  
  const whiteMask = await sharp({
    create: {
      width: maskWidth,
      height: maskHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  
  const result = await sharp(blackBackground)
    .composite([{
      input: whiteMask,
      top: maskY,
      left: maskX
    }])
    .png()
    .toBuffer();
  
  return result;
}

