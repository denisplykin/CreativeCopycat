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

    const imageUrl = response.data[0].url;
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
    const imageFile = new File([params.image], 'image.png', { type: 'image/png' });
    const maskFile = new File([params.mask], 'mask.png', { type: 'image/png' });

    const response = await openai.images.edit({
      model: 'dall-e-2', // dall-e-3 doesn't support edit yet
      image: imageFile,
      mask: maskFile,
      prompt: params.prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    });

    const imageUrl = response.data[0].url;
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
 */
export async function createTextMask(
  width: number,
  height: number,
  textBoxes: Array<{ x: number; y: number; width: number; height: number }>
): Promise<Buffer> {
  // Dynamic import to avoid issues with canvas in browser
  const { createCanvas } = await import('canvas');
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill with black (keep these areas)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Draw white rectangles for text areas (remove these areas)
  ctx.fillStyle = 'white';
  textBoxes.forEach((box) => {
    // Add some padding to ensure text is fully covered
    const padding = 5;
    ctx.fillRect(
      Math.max(0, box.x - padding),
      Math.max(0, box.y - padding),
      box.width + padding * 2,
      box.height + padding * 2
    );
  });

  return canvas.toBuffer('image/png');
}

