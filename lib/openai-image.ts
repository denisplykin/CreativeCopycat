interface DalleSimpleParams {
  description: string;
  aspectRatio?: string;
}

interface CharacterSwapParams {
  imageBuffer: Buffer;
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
    
    const analysisPrompt = `Analyze this advertising creative and create a detailed DALL-E prompt to recreate it with these changes:

KEEP THE SAME:
- Overall layout and composition
- Text content (all words) and positioning
- Color scheme and visual style
- UI elements, icons, graphics
- Background design elements

CHANGE:
1. Replace the main character with a 25-year-old Indonesian woman
   - Keep similar pose and body language
   - Professional, friendly appearance
   - Modern casual clothing
   - Same framing and positioning

2. Replace any brand names with "Algonova"

Create a detailed 200-250 word DALL-E prompt that will recreate this creative with these changes. Output ONLY the prompt text, no other commentary.`;

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

