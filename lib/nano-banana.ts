/**
 * Nano Banana Pro (Gemini 3 Pro Image Preview) Integration
 * Image generation via OpenRouter
 */

const getOpenRouterKey = () => process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Calculate target dimensions based on aspect ratio setting
 */
function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  aspectRatio: string
): { width: number; height: number } {
  if (aspectRatio === 'original') {
    return { width: originalWidth, height: originalHeight };
  }
  
  // Parse aspect ratio (e.g., '16:9' -> [16, 9])
  const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
  if (!ratioW || !ratioH) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const targetRatio = ratioW / ratioH;
  const originalRatio = originalWidth / originalHeight;
  
  // Keep the larger dimension, adjust the smaller one
  if (originalRatio > targetRatio) {
    // Original is wider - keep width, adjust height
    return {
      width: originalWidth,
      height: Math.round(originalWidth / targetRatio)
    };
  } else {
    // Original is taller - keep height, adjust width
    return {
      width: Math.round(originalHeight * targetRatio),
      height: originalHeight
    };
  }
}

/**
 * Analyze an existing image and generate a new creative using Nano Banana Pro
 */
export async function generateWithNanaBanana(params: {
  imageBuffer: Buffer;
  modifications: string;
  aspectRatio?: string;
  analysis?: any;
  copyMode?: string;
}): Promise<Buffer> {
  const { imageBuffer, modifications, aspectRatio = '1:1', copyMode = 'simple_copy' } = params;

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
    
    // Calculate target dimensions based on aspect ratio
    const targetDimensions = calculateTargetDimensions(originalWidth, originalHeight, aspectRatio);
    const targetWidth = targetDimensions.width;
    const targetHeight = targetDimensions.height;
    console.log(`🎯 Target dimensions: ${targetWidth}x${targetHeight} (ratio: ${aspectRatio})`);

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // Step 1: Generate prompt via Claude
    console.log(`👁️ Step 1: Analyzing image for mode: ${copyMode}...`);
    
    // Different prompt strategies for different modes
    let promptRequest = '';
    
    switch (copyMode) {
      case 'simple_copy':
        promptRequest = `You are a graphic designer working on image modification. Look at this image and help recreate it with a minor change.

TASK: Create a detailed prompt to recreate this image with MINIMAL changes - ONLY replace any visible company logo or brand name with "Algonova". Everything else must stay EXACTLY the same.

PRESERVE EXACTLY:
- Character appearance, age, gender, ethnicity, clothing, pose, position, expression
- Background colors, style, patterns, decorations
- Text content, placement, fonts, colors, sizes
- Layout and composition
- All visual elements and decorations
- Dimensions: ${targetWidth}x${targetHeight}px (aspect ratio ${(targetWidth/targetHeight).toFixed(2)}:1)

CHANGE ONLY:
- Replace any visible company logo or brand name with "Algonova"

Return a detailed prompt for image generation that preserves the original design exactly.`;
        break;

      case 'slightly_different':
        promptRequest = `You are a graphic designer working on image modification. Look at this image and help recreate it with a slight variation.

TASK: Create a prompt to recreate this image with a SLIGHTLY DIFFERENT character while keeping the same style.

PRESERVE EXACTLY:
- Art style and illustration technique
- Background colors, style, patterns, decorations  
- Text content, placement, fonts, colors, sizes
- Layout and composition
- Character position in frame
- Dimensions: ${targetWidth}x${targetHeight}px (aspect ratio ${(targetWidth/targetHeight).toFixed(2)}:1)

MODIFY:
- Character: Keep same age group and gender, but change facial features, hairstyle, expression, pose slightly
- Replace any visible company logo or brand name with "Algonova"

IMPORTANT: The character should feel like a different person but in the same art style and similar pose.

Return a detailed prompt for image generation.`;
        break;

      default:
        // Fallback to generic prompt
        promptRequest = `You are a graphic designer analyzing an image to create a recreation prompt.

ANALYZE THIS IMAGE and describe all elements.

MODIFICATIONS NEEDED: ${modifications}

CRITICAL REQUIREMENTS:
- Target dimensions: ${targetWidth}x${targetHeight}px (aspect ratio ${(targetWidth/targetHeight).toFixed(2)}:1)
- Generated image MUST match these EXACT dimensions
- Replace brand names with "Algonova"

Return ONLY the detailed prompt for image generation.`;
    }

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
    let prompt = step1Data.choices?.[0]?.message?.content;

    if (!prompt) {
      throw new Error('No prompt generated');
    }

    console.log(`✅ Prompt generated: ${prompt.substring(0, 100)}...`);

    // ✅ Validate that prompt includes "Algonova" for logo replacement
    if (copyMode === 'simple_copy' || copyMode === 'slightly_different') {
      if (!prompt.toLowerCase().includes('algonova')) {
        console.log('⚠️ Prompt missing "Algonova", retrying with stronger instruction...');
        
        // Retry with more explicit prompt
        const retryPromptRequest = `CRITICAL: Your previous response did not include instructions to change the brand to "Algonova".

You MUST include "Algonova" as a replacement for any existing brand/logo in the image.

Look at the image again and provide a complete prompt that:
1. Describes all visual elements accurately
2. EXPLICITLY states to replace the "${copyMode === 'simple_copy' ? 'logo/brand' : 'logo'}" with "Algonova"

This is mandatory. Return the complete prompt now.`;

        const retryResponse = await fetch(OPENROUTER_BASE_URL, {
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
                  { type: 'text', text: retryPromptRequest },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${base64Image}` },
                  },
                ],
              },
            ],
            max_tokens: 1000,
            temperature: 0.5, // Slightly higher for better compliance
          }),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryPrompt = retryData.choices?.[0]?.message?.content;
          
          if (retryPrompt && retryPrompt.toLowerCase().includes('algonova')) {
            prompt = retryPrompt;
            console.log(`✅ Retry successful! Prompt now includes Algonova: ${prompt.substring(0, 100)}...`);
          } else {
            console.log('⚠️ Retry still missing Algonova, proceeding with original prompt');
          }
        } else {
          console.log('⚠️ Retry failed, proceeding with original prompt');
        }
      }
    }

    // Step 2: Generate image with Nano Banana Pro
    // For slightly_different: text-only (generate from scratch for more variation)
    // For other modes: text + image (modify original for accuracy)
    const useImageReference = copyMode !== 'slightly_different';
    
    console.log(`🍌 Step 2: Generating image ${useImageReference ? 'with original as reference' : 'from text description only'}...`);

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
            content: useImageReference
              ? [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${base64Image}` },
                  },
                ]
              : prompt, // Text only for slightly_different
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

    // Step 3: Resize to match target dimensions
    console.log('\n📐 Step 3: Resizing to match target dimensions...');
    console.log(`  Requested aspectRatio: ${aspectRatio}`);

    const generatedMetadata = await sharp(resultBuffer).metadata();
    console.log(`  Generated size: ${generatedMetadata.width}x${generatedMetadata.height}`);
    console.log(`  Target size: ${targetWidth}x${targetHeight}`);

    // Only resize if dimensions are different (10px tolerance)
    if (Math.abs(generatedMetadata.width! - targetWidth) > 10 ||
        Math.abs(generatedMetadata.height! - targetHeight) > 10) {

      const currentAspect = generatedMetadata.width! / generatedMetadata.height!;
      const targetAspect = targetWidth / targetHeight;
      const aspectDiff = Math.abs(currentAspect - targetAspect) / targetAspect;

      console.log(`  Current aspect: ${currentAspect.toFixed(3)}, Target: ${targetAspect.toFixed(3)}`);
      console.log(`  Aspect difference: ${(aspectDiff * 100).toFixed(2)}%`);

      // Always use 'cover' to match exact dimensions
      console.log(`  🎯 Using 'cover' to match exact dimensions`);
      const resized = await sharp(resultBuffer)
        .resize(targetWidth, targetHeight, {
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
