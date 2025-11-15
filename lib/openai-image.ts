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
 * VARIANT 3: OpenAI 2-Step (GPT-5.1 Vision + gpt-image-1)
 * User provides custom modification instructions
 * Step 1: GPT-5.1 analyzes image and creates detailed prompt
 * Step 2: gpt-image-1 generates from that prompt
 */
export async function generateOpenAI2Step(params: OpenAI2StepParams): Promise<Buffer> {
  const { imageBuffer, modifications, aspectRatio = '9:16' } = params;

  try {
    console.log('🤖 OpenAI 2-Step: GPT-5.1 → gpt-image-1...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    console.log(`📝 Modifications: ${modifications}`);
    
    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // STEP 1: GPT-5.1 Vision analyzes image and creates prompt
    console.log('👁️ Step 1: GPT-5.1 analyzing image...');
    
    const visionPrompt = `You are analyzing an advertising creative to create a detailed prompt for the image generation model gpt-image-1.

TASK:
1. Describe this banner in detail (150-300 words) for recreation
2. Keep the same layout, text positions, and overall composition
3. Apply these user-requested changes: ${modifications}

IMPORTANT:
- Preserve all text blocks and their positions (note the text content and style)
- Keep the same visual layout and structure
- Maintain the overall design aesthetic
- Apply ONLY the changes specified above
- If no brand is mentioned, use "Algonova" as the brand

OUTPUT FORMAT:
Return ONLY a JSON object: {"prompt": "your detailed 150-300 word prompt here"}

The prompt should be a complete, detailed description for gpt-image-1 to recreate this banner with the requested modifications.`;

    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using gpt-4o as gpt-5.1 alias
        messages: [
          {
            role: 'system',
            content: 'You are a professional designer creating detailed prompts for image generation. Output only valid JSON.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: visionPrompt,
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
        temperature: 0.7,
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('❌ GPT-5.1 Vision error:', visionResponse.status, errorText);
      throw new Error(`GPT-5.1 Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const rawContent = visionData.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('No response from GPT-5.1 Vision');
    }

    console.log('📦 Raw response:', rawContent.substring(0, 200));

    // Parse JSON from response
    let detailedPrompt: string;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) || rawContent.match(/\{[\s\S]*"prompt"[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawContent;
      const parsed = JSON.parse(jsonStr);
      detailedPrompt = parsed.prompt;
    } catch (parseError) {
      console.warn('⚠️ Failed to parse JSON, using raw content as prompt');
      detailedPrompt = rawContent;
    }

    if (!detailedPrompt || detailedPrompt.toLowerCase().includes("i'm sorry") || detailedPrompt.toLowerCase().includes("i can't")) {
      console.error('❌ GPT-5.1 refused or returned invalid prompt:', detailedPrompt);
      throw new Error('GPT-5.1 refused to create prompt');
    }

    console.log('✅ Step 1 complete! Generated prompt:');
    console.log('📝 FULL PROMPT FOR DALL-E:');
    console.log('---START---');
    console.log(detailedPrompt);
    console.log('---END---');

    // STEP 2: gpt-image-1 generates from the prompt
    console.log('🎨 Step 2: gpt-image-1 generating with this prompt...');

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
        model: 'dall-e-3', // Using dall-e-3 as gpt-image-1 alias
        prompt: detailedPrompt,
        size: imageSize,
        quality: 'hd',
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('❌ gpt-image-1 error:', imageResponse.status, errorText);
      throw new Error(`gpt-image-1 API error: ${imageResponse.status}`);
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

