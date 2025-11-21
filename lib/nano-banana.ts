/**
 * Nano Banana Pro (Gemini 3 Pro Image Preview) Integration
 * Image generation via OpenRouter
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const NANO_BANANA_MODEL = 'google/gemini-3-pro-image-preview';

export interface NanoBananaOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface NanoBananaResponse {
  imageUrl: string; // Base64 data URL
  rawResponse: any;
}

/**
 * Generate an image using Nano Banana Pro via OpenRouter
 * @param options - Generation options including prompt
 * @returns Base64 encoded image data URL
 */
export async function generateImageWithNanoBanana(
  options: NanoBananaOptions
): Promise<NanoBananaResponse> {
  const { prompt, temperature = 0.7, maxTokens = 4096 } = options;

  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://creativecopycat.app',
        'X-Title': 'CreativeCopycat',
      },
      body: JSON.stringify({
        model: NANO_BANANA_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        modalities: ['image', 'text'],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}. ${
          errorData.error?.message || JSON.stringify(errorData)
        }`
      );
    }

    const result = await response.json();

    // Extract image from response
    const message = result.choices?.[0]?.message;
    if (!message?.images || message.images.length === 0) {
      throw new Error('No images returned from Nano Banana Pro');
    }

    // Get the first generated image
    const imageUrl = message.images[0].image_url.url;

    return {
      imageUrl,
      rawResponse: result,
    };
  } catch (error) {
    console.error('Error generating image with Nano Banana Pro:', error);
    throw error;
  }
}

/**
 * Generate a creative banner using Nano Banana Pro
 * @param description - Detailed description of the banner to generate
 * @param brandInfo - Brand information to include
 * @returns Base64 encoded image data URL
 */
export async function generateCreativeBanner(
  description: string,
  brandInfo?: {
    name?: string;
    colors?: string[];
    style?: string;
  }
): Promise<NanoBananaResponse> {
  let prompt = description;

  // Enhance prompt with brand information
  if (brandInfo) {
    const brandDetails = [];
    if (brandInfo.name) {
      brandDetails.push(`Brand: ${brandInfo.name}`);
    }
    if (brandInfo.colors && brandInfo.colors.length > 0) {
      brandDetails.push(`Brand colors: ${brandInfo.colors.join(', ')}`);
    }
    if (brandInfo.style) {
      brandDetails.push(`Style: ${brandInfo.style}`);
    }

    if (brandDetails.length > 0) {
      prompt = `${description}\n\n${brandDetails.join('\n')}`;
    }
  }

  return generateImageWithNanoBanana({
    prompt,
    temperature: 0.8, // Slightly higher for creative generation
  });
}

/**
 * Convert base64 data URL to Buffer
 * @param dataUrl - Base64 data URL (e.g., "data:image/png;base64,...")
 * @returns Buffer containing the image data
 */
export function dataUrlToBuffer(dataUrl: string): Buffer {
  // Extract base64 data from data URL
  const matches = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!matches || matches.length < 2) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(matches[1], 'base64');
}

/**
 * Generate an image and return as Buffer for upload
 * @param options - Generation options
 * @returns Buffer containing the generated image
 */
export async function generateImageBuffer(
  options: NanoBananaOptions
): Promise<Buffer> {
  const result = await generateImageWithNanoBanana(options);
  return dataUrlToBuffer(result.imageUrl);
}

/**
 * Analyze an existing image and generate a new creative using Nano Banana Pro
 * Similar to generateWithDallE3 but uses Nano Banana Pro via OpenRouter
 *
 * @param params - Image buffer, modifications, and aspect ratio
 * @returns Buffer containing the generated image
 */
export async function generateWithNanoBanana(params: {
  imageBuffer: Buffer;
  modifications: string;
  aspectRatio?: string;
  analysis?: any; // Optional pre-existing analysis data
}): Promise<Buffer> {
  const { imageBuffer, modifications, aspectRatio = '1:1', analysis } = params;

  try {
    console.log('🍌 NANO BANANA PRO PIPELINE: Starting...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    console.log(`📝 Modifications: ${modifications}`);

    // Get original dimensions from image metadata
    const sharp = (await import('sharp')).default;
    const originalMetadata = await sharp(imageBuffer).metadata();
    const originalWidth = originalMetadata.width!;
    const originalHeight = originalMetadata.height!;

    console.log(`📏 Original dimensions: ${originalWidth}x${originalHeight}`);

    // Convert image to base64 for analysis
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // ========== STEP 1: Analyze image and generate detailed prompt ==========
    console.log('\n👁️ STEP 1: Analyzing image and generating prompt...');

    const promptGenerationRequest = `You are an expert at analyzing advertising banners and writing detailed image generation prompts for EXACT recreation.

Analyze this banner image and create a detailed prompt to recreate it AS CLOSELY AS POSSIBLE with only the specified modifications.

ORIGINAL IMAGE DIMENSIONS: ${originalWidth}x${originalHeight} pixels
USER MODIFICATIONS: ${modifications}

CRITICAL PRESERVATION RULES:
1. **Characters/People**: MUST preserve:
   - Exact gender (male/female/child)
   - Exact age category (child/teen/adult/elderly)
   - Exact pose and body position
   - Exact clothing style and colors
   - Exact facial expression
   - Exact number of characters
   - Exact positioning and spacing

2. **Objects/Items**: MUST preserve:
   - Exact object types (don't change laptop to tablet, etc.)
   - Exact colors of all objects
   - Exact positions and layout
   - Exact sizes and proportions
   - Exact number of objects

3. **Layout**: MUST preserve:
   - Exact composition and element placement
   - Exact background style and colors
   - Exact text positioning and hierarchy
   - Exact spacing and margins

4. **Text Content**: Include exact text that should appear (with typography and placement)

5. **Brand Replacement**: Replace any competitor brand names/logos with "Algonova" (use purple #833AE0)

6. **Art Style**: Maintain the EXACT same art style (anime/realistic/cartoon/3D/illustration)

Your task: Write a 300-400 word prompt that describes EVERY visual detail precisely.
Be extremely specific about what should NOT change (gender, pose, colors, objects, layout).
Focus on preservation and accuracy over creativity.

Format: Return ONLY the prompt text, no JSON, no explanations.`;

    // Use OpenRouter with Claude for prompt generation (better understanding)
    const step1Response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
              {
                type: 'text',
                text: promptGenerationRequest,
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
        max_tokens: 1500,
        temperature: 0.1, // Lower temperature for more precise preservation
      }),
    });

    if (!step1Response.ok) {
      const errorText = await step1Response.text();
      console.error('❌ Step 1 error:', step1Response.status, errorText);
      throw new Error(`Prompt generation error: ${step1Response.status}`);
    }

    const step1Data: any = await step1Response.json();
    const generationPrompt = step1Data.choices?.[0]?.message?.content;

    if (!generationPrompt) {
      throw new Error('No prompt returned from analysis step');
    }

    console.log('✅ STEP 1 COMPLETE! Generated prompt:');
    console.log(generationPrompt.substring(0, 300) + '...');

    // ========== STEP 2: Generate image with Nano Banana Pro ==========
    console.log('\n🍌 STEP 2: Generating image with Nano Banana Pro...');

    // Add dimension hint to prompt for better size matching
    const enhancedPrompt = `${generationPrompt}\n\nIMPORTANT: Create this banner at ${originalWidth}x${originalHeight} pixels with the exact layout and proportions described above.`;

    const result = await generateImageWithNanoBanana({
      prompt: enhancedPrompt,
      temperature: 0.5, // Lower temperature for more consistent preservation
    });

    console.log('✅ STEP 2 COMPLETE! Image generated');

    // Convert base64 data URL to Buffer
    let resultBuffer = dataUrlToBuffer(result.imageUrl);

    console.log(`✅ Generated: ${resultBuffer.length} bytes`);

    // ========== STEP 3: Resize to original dimensions ==========
    if (aspectRatio === 'original') {
      console.log('\n📐 STEP 3: Resizing to EXACT original dimensions...');

      let generatedMetadata = await sharp(resultBuffer).metadata();
      console.log(`  Generated size: ${generatedMetadata.width}x${generatedMetadata.height}`);
      console.log(`  Target size: ${originalWidth}x${originalHeight}`);

      // STRICT: Always resize to exact dimensions (no tolerance)
      if (generatedMetadata.width !== originalWidth || generatedMetadata.height !== originalHeight) {
        console.log(`  📏 Forcing resize to exact dimensions...`);

        const currentAspect = generatedMetadata.width! / generatedMetadata.height!;
        const targetAspect = originalWidth / originalHeight;
        const aspectDiff = Math.abs(currentAspect - targetAspect) / targetAspect;

        console.log(`  Current aspect: ${currentAspect.toFixed(3)}, Target: ${targetAspect.toFixed(3)}`);
        console.log(`  Aspect difference: ${(aspectDiff * 100).toFixed(2)}%`);

        // ALWAYS use 'fill' to match exact dimensions
        console.log(`  🎯 Using 'fill' mode for exact ${originalWidth}x${originalHeight} dimensions`);
        const resized = await sharp(resultBuffer)
          .resize(originalWidth, originalHeight, {
            fit: 'fill', // Force exact dimensions (may stretch if needed)
            kernel: 'lanczos3'
          })
          .toBuffer();
        resultBuffer = resized as Buffer;

        // Verify final dimensions
        const finalMetadata = await sharp(resultBuffer).metadata();
        console.log(`  ✅ Resized to ${finalMetadata.width}x${finalMetadata.height}`);

        // CRITICAL: Verify dimensions are EXACTLY correct
        if (finalMetadata.width !== originalWidth || finalMetadata.height !== originalHeight) {
          console.error(`  ❌ DIMENSION MISMATCH! Got ${finalMetadata.width}x${finalMetadata.height}, expected ${originalWidth}x${originalHeight}`);
          throw new Error(`Failed to resize to exact dimensions: ${originalWidth}x${originalHeight}`);
        }

        console.log(`  ✅ VERIFIED: Dimensions are exactly ${originalWidth}x${originalHeight}`);
      } else {
        console.log(`  ✅ Size already exact match: ${originalWidth}x${originalHeight}`);
      }

      console.log('✅ STEP 3 COMPLETE!');
    }

    console.log('🎉 Nano Banana Pro pipeline successful!\n');

    return resultBuffer;
  } catch (error) {
    console.error('❌ Nano Banana Pro pipeline error:', error);
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
