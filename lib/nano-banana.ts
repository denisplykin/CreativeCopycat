/**
 * Nano Banana Pro (Gemini 3 Pro Image Preview) Integration
 * Image generation via OpenRouter
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const NANO_BANANA_MODEL = 'google/gemini-3-pro-image-preview';

// Pricing per million tokens (as of documentation)
const PRICING = {
  'nano-banana-pro': {
    input: 2.0,   // $2/M tokens
    output: 12.0  // $12/M tokens
  },
  'claude-3.5-sonnet': {
    input: 3.0,   // $3/M tokens
    output: 15.0  // $15/M tokens
  }
};

/**
 * Calculate cost from token usage
 */
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: 'nano-banana-pro' | 'claude-3.5-sonnet'
): CostBreakdown {
  const pricing = PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return {
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost
  };
}

export interface NanoBananaOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface NanoBananaResponse {
  imageUrl: string; // Base64 data URL
  rawResponse: any;
  cost?: CostBreakdown;
}

export interface NanoBananaPipelineCost {
  step1_analysis: CostBreakdown;
  step2_generation: CostBreakdown;
  totalCost: number;
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

    // Extract usage data and calculate cost
    let cost: CostBreakdown | undefined;
    if (result.usage) {
      const inputTokens = result.usage.prompt_tokens || 0;
      const outputTokens = result.usage.completion_tokens || 0;
      cost = calculateCost(inputTokens, outputTokens, 'nano-banana-pro');

      console.log('💰 Nano Banana Pro Cost:');
      console.log(`   Input tokens: ${inputTokens.toLocaleString()}`);
      console.log(`   Output tokens: ${outputTokens.toLocaleString()}`);
      console.log(`   Input cost: $${cost.inputCost.toFixed(6)}`);
      console.log(`   Output cost: $${cost.outputCost.toFixed(6)}`);
      console.log(`   Total cost: $${cost.totalCost.toFixed(6)}`);
    }

    return {
      imageUrl,
      rawResponse: result,
      cost,
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
 * @returns Object containing the generated image buffer and cost breakdown
 */
export async function generateWithNanoBanana(params: {
  imageBuffer: Buffer;
  modifications: string;
  aspectRatio?: string;
  analysis?: any; // Optional pre-existing analysis data
}): Promise<{ buffer: Buffer; cost: NanoBananaPipelineCost }> {
  const { imageBuffer, modifications, aspectRatio = '1:1', analysis } = params;

  try {
    console.log('🍌 NANO BANANA PRO PIPELINE: Starting...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    console.log(`📝 Modifications: ${modifications}`);

    // Convert image to base64 for analysis
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // ========== STEP 1: Analyze image and generate detailed prompt ==========
    console.log('\n👁️ STEP 1: Analyzing image and generating prompt...');

    const promptGenerationRequest = `You are an expert at analyzing advertising banners and writing detailed image generation prompts.

Analyze this banner image and create a detailed prompt to recreate it with modifications.

USER MODIFICATIONS: ${modifications}

Your task:
1. Describe ALL visual elements in detail (layout, colors, text, characters, objects, style)
2. Include the exact text content that should appear (including proper typography and placement)
3. Apply the user's modifications
4. IMPORTANT: Replace any competitor brand names with "Algonova" (use purple #833AE0 for brand elements)
5. Keep the same composition, style, and visual language as the original
6. For Nano Banana Pro: Be specific about text rendering, layout, and design elements

Return a detailed prompt (200-300 words) that will recreate this banner.
The prompt should be descriptive, specific, and focus on visual details, text placement, and design style.

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
        max_tokens: 1000,
        temperature: 0.3,
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

    // Extract cost from step 1
    let step1Cost: CostBreakdown;
    if (step1Data.usage) {
      const inputTokens = step1Data.usage.prompt_tokens || 0;
      const outputTokens = step1Data.usage.completion_tokens || 0;
      step1Cost = calculateCost(inputTokens, outputTokens, 'claude-3.5-sonnet');

      console.log('✅ STEP 1 COMPLETE! Generated prompt:');
      console.log(generationPrompt.substring(0, 300) + '...');
      console.log('💰 Step 1 (Claude Analysis) Cost:');
      console.log(`   Input tokens: ${inputTokens.toLocaleString()}`);
      console.log(`   Output tokens: ${outputTokens.toLocaleString()}`);
      console.log(`   Cost: $${step1Cost.totalCost.toFixed(6)}`);
    } else {
      console.log('⚠️ No usage data available for step 1');
      step1Cost = {
        inputTokens: 0,
        outputTokens: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0
      };
    }

    // ========== STEP 2: Generate image with Nano Banana Pro ==========
    console.log('\n🍌 STEP 2: Generating image with Nano Banana Pro...');

    const result = await generateImageWithNanoBanana({
      prompt: generationPrompt,
      temperature: 0.8, // Creative generation
    });

    console.log('✅ STEP 2 COMPLETE! Image generated');

    // Get cost from step 2
    const step2Cost = result.cost || {
      inputTokens: 0,
      outputTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0
    };

    // Calculate total pipeline cost
    const totalCost = step1Cost.totalCost + step2Cost.totalCost;

    console.log('\n💰 TOTAL PIPELINE COST:');
    console.log(`   Step 1 (Analysis): $${step1Cost.totalCost.toFixed(6)}`);
    console.log(`   Step 2 (Generation): $${step2Cost.totalCost.toFixed(6)}`);
    console.log(`   ================================`);
    console.log(`   TOTAL: $${totalCost.toFixed(6)}`);

    // Convert base64 data URL to Buffer
    const generatedBuffer = dataUrlToBuffer(result.imageUrl);

    console.log(`✅ Generated: ${generatedBuffer.length} bytes`);
    console.log('🎉 Nano Banana Pro pipeline successful!\n');

    return {
      buffer: generatedBuffer,
      cost: {
        step1_analysis: step1Cost,
        step2_generation: step2Cost,
        totalCost
      }
    };
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
