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
1. **Characters/People**: MUST preserve EXACTLY:
   - Exact gender (male/female/child)
   - Exact age category (child/teen/adult/elderly)
   - Exact ethnicity and race (skin tone, facial features, hair type)
   - Exact pose and body position (standing/sitting/jumping, arm positions, leg positions)
   - Exact clothing style and colors (shirts, pants, accessories - keep identical)
   - Exact facial expression (smiling/serious/surprised)
   - Exact number of characters (if 2 people, generate exactly 2 people)
   - Exact positioning and spacing (if character is on left side, keep on left side)
   - Exact size/scale of characters relative to banner

2. **Objects/Items**: MUST preserve EXACTLY:
   - Exact object types (laptop stays laptop, phone stays phone, book stays book)
   - Exact colors of all objects (if laptop is silver, keep it silver)
   - Exact positions and layout (if object is top-right, keep it top-right)
   - Exact sizes and proportions (maintain relative scale)
   - Exact number of objects (if 3 items, generate exactly 3 items)
   - Exact orientation (if tilted 45°, keep at 45°)

3. **Buttons, CTAs, and UI Elements**: MUST preserve EXACTLY:
   - Exact position of all buttons (if button is bottom-right, keep it bottom-right)
   - Exact size and shape of buttons (rounded/square, dimensions)
   - Exact colors of buttons and CTAs
   - Exact text on buttons (e.g., "Sign Up", "Learn More")
   - Exact spacing between UI elements
   - If there's a CTA in a specific corner, keep it in that exact corner

4. **Layout and Positioning**: MUST preserve EXACTLY:
   - Exact composition and element placement (nothing should move)
   - Exact background style and colors
   - Exact text positioning and hierarchy (if headline is top-center, keep it top-center)
   - Exact spacing and margins (maintain all gaps between elements)
   - EVERY element must stay in its EXACT original position
   - Think of the layout as a grid - each element must stay in its cell

5. **Text Content**: Include exact text that should appear (with typography and placement)

6. **LOGO REPLACEMENT - ABSOLUTELY CRITICAL**:

   **STEP 1 - REMOVE COMPETITOR LOGO COMPLETELY:**
   - Identify where the competitor logo/brand appears in the original
   - COMPLETELY REMOVE the competitor logo and ALL its decorative elements
   - If the original logo had: shields, icons, emblems, badges, letters, symbols → REMOVE ALL OF THEM
   - Clear the entire logo area to just background

   **STEP 2 - ADD ONLY "ALGONOVA" TEXT IN PURPLE:**
   - In the logo area, place ONLY the word "Algonova"
   - Color: MUST be purple (#833AE0) or purple-like (violet, lavender, magenta)
   - IMPORTANT: Algonova logo ALWAYS uses purple/purple-like colors - NEVER other colors
   - The Algonova logo = JUST THE TEXT "Algonova" in PURPLE - ABSOLUTELY NOTHING ELSE

   **STEP 3 - ENSURE CLEAN LOGO AREA:**
   - NO decorative letters near "Algonova" (especially NO large "A" letters)
   - NO symbols, icons, emblems, or shapes adjacent to "Algonova"
   - NO shields, badges, circles, stars, or decorative frames around "Algonova"
   - NO design elements that "look like a logo" near "Algonova"
   - The space around "Algonova" should be EMPTY (just background)

   **FORBIDDEN EXAMPLES (DO NOT GENERATE):**
   - ❌ Large decorative "A" letter next to "Algonova"
   - ❌ "A" in a circle/shield next to "Algonova"
   - ❌ Any icon, symbol, or graphic near "Algonova"
   - ❌ "A Algonova" or "A | Algonova" or "A + Algonova"
   - ❌ Shield/badge containing or next to "Algonova"

   **CORRECT EXAMPLE:**
   - ✅ Just the word "Algonova" in purple text, clean background around it

7. **Art Style**: Maintain the EXACT same art style (anime/realistic/cartoon/3D/illustration)

Your task: Write a 300-400 word prompt that describes EVERY visual detail precisely.
Be extremely specific about what should NOT change (gender, ethnicity, race, pose, colors, objects, button positions, layout).
Focus on preservation and accuracy over creativity.

**CRITICAL REMINDERS FOR YOUR PROMPT:**

1. **For Element Positioning**: You MUST explicitly state the exact position of EVERY element:
   - "Character is positioned on the LEFT SIDE of the banner"
   - "Button is in the BOTTOM-RIGHT CORNER at coordinates..."
   - "CTA is in the TOP-CENTER area"
   - Describe positions using terms: top/bottom, left/right/center, upper/lower, corner locations

2. **For Character Details**: You MUST explicitly state:
   - Ethnicity and race (e.g., "Asian woman", "Black man", "Caucasian child")
   - Exact pose (e.g., "standing with arms crossed", "sitting with laptop")
   - Exact position (e.g., "positioned on left third of banner")

3. **For Logo**: You MUST explicitly state:
   - "Remove all competitor logo decorations completely"
   - "The logo shows ONLY the word 'Algonova' in PURPLE color (#833AE0)"
   - "NO decorative letters, symbols, or icons appear near or adjacent to 'Algonova'"
   - "The area around 'Algonova' is clean with just the background"

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
