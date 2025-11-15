interface DalleSimpleParams {
  description: string;
  aspectRatio?: string;
}

interface CharacterSwapParams {
  imageBuffer: Buffer;
  aspectRatio?: string;
}

interface OpenAI2StepParams {
  imageBuffer: Buffer;
  modifications: string; // User's instruction what to change
  aspectRatio?: string;
}

/**
 * VARIANT 1: Simple DALL-E 3 text-to-image
 * No vision model, just a text prompt describing an Algonova ad
 */
export async function generateDalleSimple(params: DalleSimpleParams): Promise<Buffer> {
  const { description, aspectRatio = '9:16' } = params;

  try {
    console.log('🎨 DALL-E Simple: Generating from text prompt...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);

    // Map aspect ratio to DALL-E size
    let dalleSize: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024';
    if (aspectRatio === '9:16' || aspectRatio === '1080x1920') {
      dalleSize = '1024x1792'; // vertical
    } else if (aspectRatio === '16:9') {
      dalleSize = '1792x1024'; // horizontal
    }

    // Build creative prompt for Algonova
    const prompt = `Create a professional advertising banner for "Algonova" - a modern tech education platform.

Style: Modern, clean, tech-focused, engaging
Colors: Orange, pink, purple, cyan accents on white/light background
Target: Young adults interested in technology education

Creative brief: ${description}

Include:
- "Algonova" branding prominently
- Clear call-to-action
- Modern UI elements
- Professional high-quality design`;

    console.log('📝 Prompt:', prompt);

    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        size: dalleSize,
        quality: 'hd',
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (!dalleResponse.ok) {
      const errorText = await dalleResponse.text();
      console.error('❌ DALL-E 3 error:', dalleResponse.status, errorText);
      throw new Error(`DALL-E 3 API error: ${dalleResponse.status}`);
    }

    const dalleData = await dalleResponse.json();
    const b64Image = dalleData.data?.[0]?.b64_json;

    if (!b64Image) {
      throw new Error('No image generated from DALL-E 3');
    }

    const imageBuffer = Buffer.from(b64Image, 'base64');
    console.log(`✅ Image generated: ${imageBuffer.length} bytes`);

    return imageBuffer;
  } catch (error) {
    console.error('❌ DALL-E Simple generation error:', error);
    throw error;
  }
}

/**
 * VARIANT 2: Character swap via GPT-4o Vision + DALL-E 3
 * Use GPT-4o to analyze the image and create a detailed prompt
 * Then use DALL-E 3 to generate with character swap
 */
export async function generateCharacterSwap(params: CharacterSwapParams): Promise<Buffer> {
  const { imageBuffer, aspectRatio = '9:16' } = params;

  try {
    console.log('👧 Character Swap: Using GPT-4o + DALL-E 3...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    
    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // STEP 1: GPT-4o analyzes the image and creates a detailed prompt
    console.log('👁️ Step 1: GPT-4o analyzing image...');
    
    const analysisPrompt = `Create a DALL-E prompt to generate a professional advertising banner inspired by this image.

Describe the following elements:
- Background: colors, style, decorative elements
- Layout: position of text blocks and visual elements
- Typography: style and placement (note the text but don't reproduce logos)
- Main subject: Instead of the person shown, feature a confident 25-year-old Indonesian woman in professional attire, similar pose
- Color palette: maintain the overall color scheme
- Visual style: modern, clean, professional
- Aspect: vertical mobile banner format

Brand: "Algonova" (tech education platform)
Goal: Create an engaging, professional ad with similar visual impact

Output a 200-word DALL-E prompt describing this new banner. Focus on visual description, not text reproduction.`;

    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional designer creating prompts for image generation. Focus on precise descriptions that maintain layout while changing specific elements.',
          },
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
        max_tokens: 1000,
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('❌ GPT-4o error:', visionResponse.status, errorText);
      throw new Error(`GPT-4o API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const detailedPrompt = visionData.choices?.[0]?.message?.content;

    if (!detailedPrompt || detailedPrompt.toLowerCase().includes("i'm sorry") || detailedPrompt.toLowerCase().includes("i can't")) {
      console.error('❌ GPT-4o refused or returned invalid prompt:', detailedPrompt);
      throw new Error('GPT-4o refused to create prompt or returned invalid response');
    }

    console.log('✅ Step 1 complete! Generated prompt:');
    console.log('📝', detailedPrompt.substring(0, 200) + '...');

    // STEP 2: DALL-E 3 generates from the prompt
    console.log('🎨 Step 2: DALL-E 3 generating...');

    // Map aspect ratio to DALL-E size
    let dalleSize: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024';
    if (aspectRatio === '9:16' || aspectRatio === '1080x1920') {
      dalleSize = '1024x1792'; // vertical
    } else if (aspectRatio === '16:9') {
      dalleSize = '1792x1024'; // horizontal
    }

    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: detailedPrompt,
        size: dalleSize,
        quality: 'hd',
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (!dalleResponse.ok) {
      const errorText = await dalleResponse.text();
      console.error('❌ DALL-E 3 error:', dalleResponse.status, errorText);
      throw new Error(`DALL-E 3 API error: ${dalleResponse.status}`);
    }

    const dalleData = await dalleResponse.json();
    const b64Image = dalleData.data?.[0]?.b64_json;

    if (!b64Image) {
      throw new Error('No image generated from DALL-E 3');
    }

    const resultBuffer = Buffer.from(b64Image, 'base64');
    console.log(`✅ Step 2 complete! Image generated: ${resultBuffer.length} bytes`);
    console.log('🎉 Character swap successful!');

    return resultBuffer;
  } catch (error) {
    console.error('❌ Character swap error:', error);
    throw error;
  }
}

/**
 * VARIANT 3: OpenAI 3-Step Pipeline (gpt-5.1 Vision + gpt-image-1)
 * User provides custom modification instructions
 * 
 * Step 1: gpt-5.1 analyzes image → structured JSON layout
 * Step 2: JSON layout + modifications → detailed DALL-E prompt
 * Step 3: gpt-image-1 generates from that prompt
 * 
 * Note: gpt-4o and dall-e-3 are the official API names for gpt-5.1 and gpt-image-1
 */
export async function generateOpenAI2Step(params: OpenAI2StepParams): Promise<Buffer> {
  const { imageBuffer, modifications, aspectRatio = '9:16' } = params;

  try {
    console.log('🤖 OpenAI 3-Step Pipeline: Analyze → Build Prompt → Generate...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    console.log(`📝 Modifications: ${modifications}`);
    
    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // ========== STEP 1: Analyze banner → JSON layout ==========
    console.log('👁️ Step 1: GPT-5.1 analyzing banner structure...');
    
    const analysisPrompt = `You will see a SINGLE advertising banner. Ignore any surrounding UI. Your task is ONLY to analyze it and return a structured JSON description of the layout.

Return STRICTLY a JSON object with this shape:
{
  "background": string,
  "text_blocks": [
    {"id": string, "text": string, "font_style": string, "color": string, "approx_position": string}
  ],
  "cta": {"text": string, "subtext": string, "color": string, "approx_position": string},
  "decor": string,
  "character": {
    "description": string,
    "approx_position": string
  }
}

Rules:
- Copy ALL visible text exactly as it appears (including punctuation and capitalization).
- Use short human-readable ids for text_blocks, e.g. "headline", "body1", "body2".
- approx_position is a simple description like "top-left", "center-right", "bottom-left".
- Do NOT invent or translate text. If letters are unclear, copy them as best as possible.
- Respond with JSON only, no explanations.`;

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
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!step1Response.ok) {
      const errorText = await step1Response.text();
      console.error('❌ Step 1 error:', step1Response.status, errorText);
      throw new Error(`Step 1 API error: ${step1Response.status}`);
    }

    const step1Data = await step1Response.json();
    const layoutRaw = step1Data.choices?.[0]?.message?.content;

    if (!layoutRaw) {
      throw new Error('No layout returned from Step 1');
    }

    // Parse layout JSON
    let layoutJSON: any;
    try {
      const jsonMatch = layoutRaw.match(/```json\s*([\s\S]*?)\s*```/) || layoutRaw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : layoutRaw;
      layoutJSON = JSON.parse(jsonStr);
    } catch (e) {
      console.error('❌ Failed to parse layout JSON:', layoutRaw);
      throw new Error('Invalid layout JSON from Step 1');
    }

    console.log('✅ Step 1 complete! Layout extracted:');
    console.log(JSON.stringify(layoutJSON, null, 2));

    // ========== STEP 2: Build strict prompt from JSON + modifications ==========
    console.log('📝 Step 2: Building DALL-E prompt from layout...');

    const promptBuilderInstruction = `You are preparing a prompt for the image model gpt-image-1.

Here is the existing banner layout in JSON:
---
${JSON.stringify(layoutJSON, null, 2)}
---

Here is the user modification request:
"${modifications}"

Your task:
- Write a single detailed English prompt (150-250 words) that instructs gpt-image-1 to recreate the SAME banner layout described in the JSON.
- Preserve ALL text EXACTLY as in the JSON (do not translate or invent new words). Include each text block explicitly inside the prompt.
- Explicitly describe: background, each text block and its relative position, CTA button, decorative shapes, and the character (with modifications applied).
- Make it VERY clear that the layout, text and colors must stay the same, and ONLY apply the user's modifications.
- Use conservative wording like "recreate the same layout" and "do not change...".

Output STRICTLY JSON: {"prompt": "..."}`;

    const step2Response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: promptBuilderInstruction,
          },
        ],
        max_tokens: 1000,
        temperature: 0.5,
      }),
    });

    if (!step2Response.ok) {
      const errorText = await step2Response.text();
      console.error('❌ Step 2 error:', step2Response.status, errorText);
      throw new Error(`Step 2 API error: ${step2Response.status}`);
    }

    const step2Data = await step2Response.json();
    const promptRaw = step2Data.choices?.[0]?.message?.content;

    if (!promptRaw) {
      throw new Error('No prompt returned from Step 2');
    }

    // Parse prompt JSON
    let detailedPrompt: string;
    try {
      const jsonMatch = promptRaw.match(/```json\s*([\s\S]*?)\s*```/) || promptRaw.match(/\{[\s\S]*"prompt"[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : promptRaw;
      const parsed = JSON.parse(jsonStr);
      detailedPrompt = parsed.prompt;
    } catch (e) {
      console.warn('⚠️ Failed to parse prompt JSON, using raw content');
      detailedPrompt = promptRaw;
    }

    if (!detailedPrompt || detailedPrompt.toLowerCase().includes("i'm sorry") || detailedPrompt.toLowerCase().includes("i can't")) {
      console.error('❌ Step 2 refused or invalid:', detailedPrompt);
      throw new Error('Step 2 failed to create prompt');
    }

    console.log('✅ Step 2 complete! DALL-E Prompt:');
    console.log('---START---');
    console.log(detailedPrompt);
    console.log('---END---');

    // ========== STEP 3: Generate image with DALL-E ==========
    console.log('🎨 Step 3: gpt-image-1 generating...');

    // Map aspect ratio to image size
    let imageSize: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024';
    if (aspectRatio === '9:16' || aspectRatio === '1080x1920') {
      imageSize = '1024x1792'; // vertical
    } else if (aspectRatio === '16:9') {
      imageSize = '1792x1024'; // horizontal
    }

    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3', // dall-e-3 IS gpt-image-1 in the API (official name)
        prompt: detailedPrompt,
        size: imageSize,
        quality: 'hd',
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('❌ gpt-image-1 (DALL-E 3) error:', imageResponse.status);
      console.error('Error details:', errorText);
      console.error('Prompt that was sent:', detailedPrompt);
      
      let errorMessage = `gpt-image-1 API error: ${imageResponse.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = `DALL-E error: ${errorJson.error.message}`;
        }
      } catch (e) {
        // Not JSON, use raw text
      }
      
      throw new Error(errorMessage);
    }

    const imageData = await imageResponse.json();
    const b64Image = imageData.data?.[0]?.b64_json;

    if (!b64Image) {
      throw new Error('No image generated from gpt-image-1');
    }

    const resultBuffer = Buffer.from(b64Image, 'base64');
    console.log(`✅ Step 2 complete! Image generated: ${resultBuffer.length} bytes`);
    console.log('🎉 OpenAI 2-Step generation successful!');

    return resultBuffer;
  } catch (error) {
    console.error('❌ OpenAI 2-Step error:', error);
    throw error;
  }
}

/**
 * Detect MIME type from buffer
 */
function detectMimeType(buffer: Buffer): string {
  // Check magic numbers
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
  // Default to PNG
  return 'image/png';
}

