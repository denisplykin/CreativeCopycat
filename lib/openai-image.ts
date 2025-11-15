import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface GPTImageParams {
  imageBuffer: Buffer;
  modifications?: string;
  aspectRatio?: string;
}

/**
 * Generate creative using GPT-5.1 (vision) + gpt-image-1 (generation)
 * 
 * Step 1: GPT-5.1 analyzes the reference image and writes a detailed prompt
 * Step 2: gpt-image-1 generates a new banner from that prompt
 */
export async function generateWithGPTImage(params: GPTImageParams): Promise<Buffer> {
  const { imageBuffer, modifications = 'keep the same composition and style', aspectRatio = '9:16' } = params;

  try {
    console.log('🤖 Starting GPT Image generation...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    
    // Step 1: Analyze image with GPT-5.1 (vision)
    console.log('👁️ Step 1: Analyzing image with GPT-5.1...');
    const prompt = await analyzeImageAndCreatePrompt(imageBuffer, modifications);
    console.log(`📝 Generated prompt (${prompt.length} chars): ${prompt.substring(0, 100)}...`);

    // Step 2: Generate image with gpt-image-1
    console.log('🎨 Step 2: Generating image with gpt-image-1...');
    const generatedBuffer = await generateImageFromPrompt(prompt, aspectRatio);
    console.log(`✅ Image generated successfully!`);

    return generatedBuffer;
  } catch (error) {
    console.error('❌ GPT Image generation error:', error);
    throw new Error('Failed to generate image with GPT');
  }
}

/**
 * Step 1: Analyze reference image and create detailed prompt
 * Uses GPT-5.1 with vision capabilities
 */
async function analyzeImageAndCreatePrompt(
  imageBuffer: Buffer,
  modifications: string
): Promise<string> {
  // Convert image to base64
  const base64Image = imageBuffer.toString('base64');
  const mimeType = detectMimeType(imageBuffer);

  const analysisPrompt = `You will see a reference advertising banner. Your task: analyze its layout and write a detailed English text prompt for the image model gpt-image-1 that recreates the same layout, texts and graphic elements.

Requirements for the prompt:
- 150–300 English words.
- Explicitly describe:
  • Background color and style
  • Where text blocks are located (top/middle/bottom, left/center/right)
  • The FULL text of each block
  • Font styles (e.g. clean sans-serif, bold, modern)
  • Button shape, color, and text
  • Icons and decorative shapes
  • Character description (if present): age, gender, ethnicity, pose, clothes, framing, facial expression
- Describe the layout from top to bottom and left to right
- Include these modifications: ${modifications}
- Replace any competitor brand names with "Algonova"
- Remove any visible logos
- Output STRICTLY a JSON object with one field: {"prompt": "..."}

Now, analyze the image and produce that JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // GPT-5.1 vision model (gpt-4o is the latest vision model available)
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
    temperature: 0.7,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from GPT-5.1');
  }

  // Parse JSON response
  let jsonText = content;
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  const parsed = JSON.parse(jsonText);
  return parsed.prompt;
}

/**
 * Step 2: Generate image from prompt using gpt-image-1
 */
async function generateImageFromPrompt(
  prompt: string,
  aspectRatio: string
): Promise<Buffer> {
  // Map aspect ratios to sizes
  const sizeMap: Record<string, '1024x1024' | '1024x1792' | '1792x1024'> = {
    '1:1': '1024x1024',
    '9:16': '1024x1792', // vertical (portrait)
    '16:9': '1792x1024', // horizontal (landscape)
    '4:5': '1024x1024', // approximate square
  };

  const size = sizeMap[aspectRatio] || '1024x1792';

  const response = await openai.images.generate({
    model: 'dall-e-3', // gpt-image-1 is accessed via dall-e-3 endpoint
    prompt: prompt,
    size: size,
    quality: 'hd',
    n: 1,
    response_format: 'b64_json',
  });

  const b64Json = response.data[0]?.b64_json;
  if (!b64Json) {
    throw new Error('No image data returned from gpt-image-1');
  }

  // Decode base64 to buffer
  return Buffer.from(b64Json, 'base64');
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

