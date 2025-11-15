interface GPTImageParams {
  imageBuffer: Buffer;
  modifications?: string;
  aspectRatio?: string;
}

/**
 * Generate creative using OpenAI DIRECTLY (2-step process)
 * 
 * Step 1: GPT-4o Vision analyzes image and creates detailed prompt
 * Step 2: DALL-E 3 generates image from that prompt
 */
export async function generateWithGPTImage(params: GPTImageParams): Promise<Buffer> {
  const { imageBuffer: inputBuffer, modifications = 'keep the same composition and style', aspectRatio = '9:16' } = params;

  try {
    console.log('🤖 Starting OpenAI Direct generation (GPT-4o + DALL-E 3)...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    
    // Convert image to base64
    const base64Image = inputBuffer.toString('base64');
    const mimeType = detectMimeType(inputBuffer);

    // === STEP 1: GPT-4o Vision analyzes image and creates prompt ===
    console.log('👁️ Step 1: GPT-4o Vision analyzing image...');
    
    const analysisPrompt = `You are analyzing an advertising banner. Create a detailed DALL-E prompt (200-300 words) that will recreate this banner.

IMPORTANT: Describe EXACTLY what you see:
- Layout (where each element is positioned)
- All text blocks (exact words, positions, font style)
- Colors (background, text, accents)
- Characters/people (age, pose, clothing, expression, ethnicity)
- Icons and UI elements
- Decorative elements
- Overall style

MODIFICATIONS to include in the prompt:
- Change brand to "Algonova"
- ${modifications}

Output ONLY the DALL-E prompt text, no other commentary.`;

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
            content: 'You are a professional graphic designer creating detailed prompts for image generation.',
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
      console.error('❌ GPT-4o Vision error:', visionResponse.status, errorText);
      throw new Error(`GPT-4o Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const detailedPrompt = visionData.choices?.[0]?.message?.content;

    if (!detailedPrompt) {
      throw new Error('No prompt generated from GPT-4o Vision');
    }

    console.log('✅ Step 1 complete! Generated prompt:');
    console.log('📝', detailedPrompt.substring(0, 200) + '...');

    // === STEP 2: DALL-E 3 generates image from prompt ===
    console.log('🎨 Step 2: DALL-E 3 generating image...');

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

    const imageBuffer = Buffer.from(b64Image, 'base64');
    console.log(`✅ Step 2 complete! Image generated: ${imageBuffer.length} bytes`);
    console.log('🎉 Two-step generation successful!');

    return imageBuffer;
  } catch (error) {
    console.error('❌ OpenAI Direct generation error:', error);
    throw new Error('Failed to generate image with OpenAI Direct');
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

