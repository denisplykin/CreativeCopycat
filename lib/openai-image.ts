interface GPTImageParams {
  imageBuffer: Buffer;
  modifications?: string;
  aspectRatio?: string;
}

/**
 * Generate creative using GPT-5 Image via OpenRouter
 * 
 * GPT-5 Image combines vision + generation in ONE model!
 * - Accepts input image (sees the original)
 * - Generates output image based on prompt + input
 */
export async function generateWithGPTImage(params: GPTImageParams): Promise<Buffer> {
  const { imageBuffer: inputBuffer, modifications = 'keep the same composition and style', aspectRatio = '9:16' } = params;

  try {
    console.log('🤖 Starting GPT-5 Image generation via OpenRouter...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    
    // Convert image to base64
    const base64Image = inputBuffer.toString('base64');
    const mimeType = detectMimeType(inputBuffer);

    // Build detailed prompt with better instructions
    const prompt = `You are seeing an advertising creative banner. Your task is to generate a NEW version of this banner that:

1. ANALYZES the original banner and understands:
   - The overall layout and composition
   - All visual elements (characters, icons, UI elements, shapes, decorations)
   - The color scheme and design style
   - Text placement and hierarchy
   - The mood and atmosphere
   - What product/service it's advertising

2. RECREATES the banner with these EXACT requirements:
   - Match the same layout structure and composition
   - Keep all design elements in similar positions
   - Preserve the color palette and visual style
   - Maintain the same aspect ratio (${aspectRatio})
   - Use high-quality, professional advertising creative quality
   - Keep the same mood and energy

3. MODIFICATIONS to apply:
   - Replace ANY competitor brand names with "Algonova"
   - Remove ANY visible competitor logos
   - ${modifications}

4. TEXT REQUIREMENTS:
   - If you see text in the original, recreate similar text blocks
   - Keep text in the SAME language as the original
   - Maintain text hierarchy (headlines vs body text)
   - Use clean, readable fonts appropriate for the style

IMPORTANT: Generate a complete, professional advertising banner that looks like a polished recreation of the original with the modifications applied. The output should be a full banner image, not a description.`;


    console.log('🎨 Calling GPT-5 Image via OpenRouter...');
    console.log('📝 Prompt:', prompt);
    console.log('📷 Image size:', inputBuffer.length, 'bytes');
    console.log('🎯 MIME type:', mimeType);

    // Call GPT-5 Image via OpenRouter
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
    
    console.log('📦 Full response:', JSON.stringify(data, null, 2));
    
    // Log response metadata
    if (data.usage) {
      console.log('💰 Token usage:', data.usage);
    }
    if (data.model) {
      console.log('🤖 Model used:', data.model);
    }
    
    // GPT-5 Image returns image in content
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('❌ No content from GPT-5 Image');
      console.error('❌ Full data:', JSON.stringify(data, null, 2));
      throw new Error('No content returned from GPT-5 Image');
    }

    console.log('📦 Response content type:', typeof content);
    console.log('📦 Response content (first 500 chars):', JSON.stringify(content).substring(0, 500));

    // Check if content contains image data
    // GPT-5 Image may return base64 or URL
    let imageBuffer: Buffer;

    if (Array.isArray(content)) {
      // Content is array of parts (text + image)
      const imagePart = content.find((part: any) => part.type === 'image_url');
      if (imagePart?.image_url?.url) {
        const imageUrl = imagePart.image_url.url;
        if (imageUrl.startsWith('data:')) {
          // Base64 data URL
          const base64Data = imageUrl.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          // HTTP URL - download it
          const imgResponse = await fetch(imageUrl);
          imageBuffer = Buffer.from(await imgResponse.arrayBuffer());
        }
      } else {
        throw new Error('No image found in response');
      }
    } else if (typeof content === 'string') {
      if (content.startsWith('data:')) {
        // Base64 data URL
        const base64Data = content.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else if (content.startsWith('http')) {
        // HTTP URL
        const imgResponse = await fetch(content);
        imageBuffer = Buffer.from(await imgResponse.arrayBuffer());
      } else {
        // Might be raw base64
        imageBuffer = Buffer.from(content, 'base64');
      }
    } else {
      throw new Error('Unexpected response format from GPT-5 Image');
    }

    console.log(`✅ Image generated successfully! Size: ${imageBuffer.length} bytes`);

    return imageBuffer;
  } catch (error) {
    console.error('❌ GPT-5 Image generation error:', error);
    throw new Error('Failed to generate image with GPT-5 Image');
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

