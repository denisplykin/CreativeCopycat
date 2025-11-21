/**
 * Nano Banana Pro (Gemini 3 Pro Image Preview) Integration
 * Image generation via OpenRouter
 */

const getOpenRouterKey = () => process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Analyze an existing image and generate a new creative using Nano Banana Pro
 */
export async function generateWithNanaBanana(params: {
  imageBuffer: Buffer;
  modifications: string;
  aspectRatio?: string;
  analysis?: any;
}): Promise<Buffer> {
  const { imageBuffer, modifications, aspectRatio = '1:1' } = params;

  const OPENROUTER_API_KEY = getOpenRouterKey();
  
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  try {
    console.log('🍌 NANO BANANA PRO: Starting generation...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    console.log(`📝 Modifications: ${modifications.substring(0, 100)}...`);

    // Get original dimensions from image metadata
    const sharp = (await import('sharp')).default;
    const originalMetadata = await sharp(imageBuffer).metadata();
    const originalWidth = originalMetadata.width!;
    const originalHeight = originalMetadata.height!;
    console.log(`📏 Original dimensions: ${originalWidth}x${originalHeight}`);

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // Step 1: Generate prompt via Claude
    console.log('👁️ Step 1: Analyzing image...');
    
    const promptRequest = `Analyze this banner and create a detailed prompt to recreate it with these modifications: ${modifications}. 

CRITICAL: The original image is ${originalWidth}x${originalHeight} pixels (aspect ratio ${(originalWidth/originalHeight).toFixed(2)}:1). The generated image MUST match these EXACT dimensions and aspect ratio.

Replace any brand names with "Algonova". Return ONLY the prompt text for image generation.`;

    const step1Response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://creativecopycat.app',
        'X-Title': 'CreativeCopycat',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptRequest },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!step1Response.ok) {
      throw new Error(`Prompt generation failed: ${step1Response.status}`);
    }

    const step1Data = await step1Response.json();
    const prompt = step1Data.choices?.[0]?.message?.content;

    if (!prompt) {
      throw new Error('No prompt generated');
    }

    console.log(`✅ Prompt generated: ${prompt.substring(0, 100)}...`);

    // Step 2: Generate image with Nano Banana Pro
    console.log('🍌 Step 2: Generating image...');

    const step2Response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://creativecopycat.app',
        'X-Title': 'CreativeCopycat',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        modalities: ['image', 'text'],
        temperature: 0.8,
        max_tokens: 4096,
      }),
    });

    if (!step2Response.ok) {
      throw new Error(`Image generation failed: ${step2Response.status}`);
    }

    const step2Data = await step2Response.json();
    const imageUrl = step2Data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    // Convert data URL to Buffer
    const matches = imageUrl.match(/^data:image\/\w+;base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid image data URL');
    }

    let resultBuffer = Buffer.from(matches[1], 'base64');
    console.log(`✅ Generated: ${resultBuffer.length} bytes`);

    // Step 3: Resize to match original dimensions (ALWAYS, not just for 'original')
    console.log('\n📐 Step 3: Resizing to match source dimensions...');
    console.log(`  Requested aspectRatio: ${aspectRatio}`);

    const sharp = (await import('sharp')).default;
    const generatedMetadata = await sharp(resultBuffer).metadata();
    console.log(`  Generated size: ${generatedMetadata.width}x${generatedMetadata.height}`);
    console.log(`  Original size: ${originalWidth}x${originalHeight}`);

    // Only resize if dimensions are different (10px tolerance)
    if (Math.abs(generatedMetadata.width! - originalWidth) > 10 ||
        Math.abs(generatedMetadata.height! - originalHeight) > 10) {

      const currentAspect = generatedMetadata.width! / generatedMetadata.height!;
      const targetAspect = originalWidth / originalHeight;
      const aspectDiff = Math.abs(currentAspect - targetAspect) / targetAspect;

      console.log(`  Current aspect: ${currentAspect.toFixed(3)}, Target: ${targetAspect.toFixed(3)}`);
      console.log(`  Aspect difference: ${(aspectDiff * 100).toFixed(2)}%`);

      // Always use 'cover' to match exact dimensions
      console.log(`  🎯 Using 'cover' to match exact dimensions`);
      const resized = await sharp(resultBuffer)
        .resize(originalWidth, originalHeight, {
          fit: 'cover',
          position: 'centre',
          kernel: 'lanczos3'
        })
        .toBuffer();
      // @ts-ignore - Sharp Buffer type compatibility
      resultBuffer = resized;

      const finalMetadata = await sharp(resultBuffer).metadata();
      console.log(`  ✅ Resized to ${finalMetadata.width}x${finalMetadata.height}`);
    } else {
      console.log(`  ✅ Size already matches, no resize needed`);
    }

    console.log('✅ Step 3 complete!');

    return resultBuffer;
  } catch (error) {
    console.error('❌ Nano Banana Pro error:', error);
    throw error;
  }
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
