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
 * VARIANT 2: Character swap via OpenRouter
 * Send image + instruction to replace character with 25yo Indonesian woman
 */
export async function generateCharacterSwap(params: CharacterSwapParams): Promise<Buffer> {
  const { imageBuffer, aspectRatio = '9:16' } = params;

  try {
    console.log('👧 Character Swap: Sending to OpenRouter...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    
    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // Natural prompt like talking to ChatGPT
    const prompt = `Please recreate this advertising creative with these changes:

KEEP THE SAME:
- Layout and composition
- Text content and positioning
- Colors and visual style
- UI elements and graphics
- Overall design concept

CHANGES TO MAKE:
1. Replace the main character with a 25-year-old Indonesian woman
   - Keep similar pose and expression
   - Professional, friendly appearance
   - Modern casual clothing

2. Replace any brand names with "Algonova"

Create a high-quality professional result that feels natural and cohesive.`;

    console.log('📝 Prompt:', prompt);
    console.log('📷 Image size:', imageBuffer.length, 'bytes');

    // Call via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Creative Copycat AI',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-image',
        messages: [
          {
            role: 'system',
            content: 'You are a professional graphic designer helping to adapt advertising creatives for a new brand. This is legitimate commercial design work.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Response received');

    // Check for errors
    const choice = data.choices?.[0];
    if (choice?.error) {
      console.error('🚨 Error from model:', choice.error);
      throw new Error(`Model error: ${choice.error.message}`);
    }

    const content = choice?.message?.content;
    if (!content) {
      throw new Error('No content returned');
    }

    // Parse response (image data)
    let resultBuffer: Buffer;

    if (Array.isArray(content)) {
      const imagePart = content.find((part: any) => part.type === 'image_url');
      if (imagePart?.image_url?.url) {
        const imageUrl = imagePart.image_url.url;
        if (imageUrl.startsWith('data:')) {
          const base64Data = imageUrl.split(',')[1];
          resultBuffer = Buffer.from(base64Data, 'base64');
        } else {
          const imgResponse = await fetch(imageUrl);
          resultBuffer = Buffer.from(await imgResponse.arrayBuffer());
        }
      } else {
        throw new Error('No image in response');
      }
    } else if (typeof content === 'string') {
      if (content.startsWith('data:')) {
        const base64Data = content.split(',')[1];
        resultBuffer = Buffer.from(base64Data, 'base64');
      } else if (content.startsWith('http')) {
        const imgResponse = await fetch(content);
        resultBuffer = Buffer.from(await imgResponse.arrayBuffer());
      } else {
        resultBuffer = Buffer.from(content, 'base64');
      }
    } else {
      throw new Error('Unexpected response format');
    }

    console.log(`✅ Character swap complete: ${resultBuffer.length} bytes`);
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

