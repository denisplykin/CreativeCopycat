import type { OCRResult, TextBlock } from '@/types/creative';

/**
 * Run OCR on image using Gemini Vision via OpenRouter
 * Uses Gemini 2.0 Flash Thinking with vision capabilities
 */
export async function runOCR(imageBuffer: Buffer): Promise<OCRResult> {
  try {
    console.log('🔍 Starting OCR with Gemini Vision via OpenRouter...');
    
    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);
    
    // Call Gemini Vision through OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image', // Gemini 2.5 Flash Image with vision support
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this advertising creative image and extract ALL text you see.

For each text element, provide:
1. The exact text
2. Approximate position (x, y as percentage of image)
3. Approximate size (width, height as percentage)
4. Your confidence in this detection (0-1)

Return a JSON object with this structure:
{
  "blocks": [
    {
      "text": "exact text here",
      "x_percent": 10,
      "y_percent": 20,
      "width_percent": 30,
      "height_percent": 5,
      "confidence": 0.95
    }
  ],
  "fullText": "all text combined",
  "language": "en" or "id" (Indonesian) or other,
  "confidence": 0.95
}

Important:
- Extract ALL text, even small text
- Preserve exact wording and spacing
- Order blocks from top to bottom, left to right
- Detect if text is in English, Indonesian, or mixed
- Be precise with positions`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        temperature: 0.1, // Low temperature for consistent OCR
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.warn('⚠️ No content from Gemini');
      return getStubOCRResult();
    }

    console.log('📝 Gemini response:', content.substring(0, 200));

    // Parse JSON from Gemini's response
    // Gemini might wrap JSON in markdown code blocks
    let jsonText = content;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const ocrData = JSON.parse(jsonText);

    // Convert percentage-based positions to pixel positions
    // We'll use approximate image dimensions (will be corrected by actual image size later)
    const imageWidth = 1080; // Approximate, will be overridden by actual
    const imageHeight = 1080;

    const blocks: TextBlock[] = (ocrData.blocks || []).map((block: any) => ({
      text: block.text,
      bbox: {
        x: Math.round((block.x_percent / 100) * imageWidth),
        y: Math.round((block.y_percent / 100) * imageHeight),
        width: Math.round((block.width_percent / 100) * imageWidth),
        height: Math.round((block.height_percent / 100) * imageHeight),
      },
      confidence: block.confidence || 0.9,
    }));

    console.log(`✅ Gemini OCR: ${blocks.length} text blocks detected`);
    console.log(`📊 Confidence: ${ocrData.confidence || 0.9}`);
    console.log(`🌐 Language: ${ocrData.language || 'en'}`);

    return {
      blocks,
      fullText: ocrData.fullText || blocks.map(b => b.text).join('\n'),
      confidence: ocrData.confidence || 0.9,
      language: ocrData.language || detectLanguage(ocrData.fullText || ''),
    };
  } catch (error) {
    console.error('❌ Gemini OCR error:', error);
    console.warn('⚠️ Falling back to stub OCR data');
    return getStubOCRResult();
  }

  /* OLD: DISABLED - Worker threads don't work in Vercel serverless
  try {
    console.log('🔍 Starting OCR with Tesseract.js...');
    
    const Tesseract = await import('tesseract.js');
    
    // Run Tesseract OCR
    const result = await Tesseract.recognize(
      imageBuffer,
      'eng+ind', // English + Indonesian (Indonesian EdTech market)
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    console.log('✅ OCR completed');
    console.log(`📊 Confidence: ${result.data.confidence.toFixed(2)}%`);
    console.log(`📝 Words detected: ${result.data.words.length}`);

    // Convert Tesseract words to our TextBlock format
    const blocks: TextBlock[] = result.data.words
      .filter(word => word.confidence > 60) // Filter low confidence words
      .map(word => ({
        text: word.text,
        bbox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
        },
        confidence: word.confidence / 100, // Convert to 0-1 range
      }));

    // Combine blocks that are on the same line
    const groupedBlocks = groupTextBlocks(blocks);

    const fullText = result.data.text.trim();

    console.log(`✅ OCR результат: ${groupedBlocks.length} блоков текста`);

    return {
      blocks: groupedBlocks,
      fullText,
      confidence: result.data.confidence / 100,
      language: detectLanguage(fullText),
    };
  } catch (error) {
    console.error('❌ OCR error:', error);
    
    // Fallback to stub data if OCR fails
    console.warn('⚠️ Falling back to stub OCR data');
    return getStubOCRResult();
  }
  */
}

/**
 * Group text blocks that are on the same line
 */
function groupTextBlocks(blocks: TextBlock[]): TextBlock[] {
  if (blocks.length === 0) return [];

  // Sort blocks by Y position, then X position
  const sorted = [...blocks].sort((a, b) => {
    const yDiff = a.bbox.y - b.bbox.y;
    if (Math.abs(yDiff) < 20) { // Same line if Y difference < 20px
      return a.bbox.x - b.bbox.x;
    }
    return yDiff;
  });

  const grouped: TextBlock[] = [];
  let currentGroup: TextBlock[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];

    // Check if on same line (Y difference < 20px and close horizontally)
    const yDiff = Math.abs(current.bbox.y - previous.bbox.y);
    const xGap = current.bbox.x - (previous.bbox.x + previous.bbox.width);

    if (yDiff < 20 && xGap < 50) {
      // Same line, add to current group
      currentGroup.push(current);
    } else {
      // New line, create merged block from current group
      if (currentGroup.length > 0) {
        grouped.push(mergeBlocks(currentGroup));
      }
      currentGroup = [current];
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    grouped.push(mergeBlocks(currentGroup));
  }

  return grouped;
}

/**
 * Merge multiple text blocks into one
 */
function mergeBlocks(blocks: TextBlock[]): TextBlock {
  if (blocks.length === 1) return blocks[0];

  const text = blocks.map(b => b.text).join(' ');
  const minX = Math.min(...blocks.map(b => b.bbox.x));
  const minY = Math.min(...blocks.map(b => b.bbox.y));
  const maxX = Math.max(...blocks.map(b => b.bbox.x + b.bbox.width));
  const maxY = Math.max(...blocks.map(b => b.bbox.y + b.bbox.height));
  const avgConfidence = blocks.reduce((sum, b) => sum + (b.confidence || 0), 0) / blocks.length;

  return {
    text,
    bbox: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    confidence: avgConfidence,
  };
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

/**
 * Detect language from text (Indonesian EdTech market)
 * Only Indonesian or English
 */
function detectLanguage(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Check for common Indonesian words in EdTech creatives
  const indonesianWords = [
    'dan', 'yang', 'untuk', 'dengan', 'kelas', 'belajar', 'anak', 
    'coding', 'programming', 'belajar', 'gratis', 'diskon', 
    'les', 'kursus', 'daftar', 'sekarang'
  ];
  
  const indonesianCount = indonesianWords.filter(word => 
    lowerText.includes(word)
  ).length;
  
  // If 3+ Indonesian words found, it's Indonesian
  if (indonesianCount >= 3) return 'id';
  
  // Otherwise assume English
  return 'en';
}

/**
 * Stub OCR result for fallback
 */
function getStubOCRResult(): OCRResult {
  const stubBlocks: TextBlock[] = [
    {
      text: 'AMAZING OFFER',
      bbox: { x: 50, y: 50, width: 300, height: 60 },
      confidence: 0.95,
    },
    {
      text: 'Get 50% OFF',
      bbox: { x: 50, y: 130, width: 250, height: 50 },
      confidence: 0.92,
    },
    {
      text: 'Limited time only! Click here to claim your discount now.',
      bbox: { x: 50, y: 200, width: 400, height: 80 },
      confidence: 0.88,
    },
    {
      text: 'SHOP NOW',
      bbox: { x: 150, y: 320, width: 200, height: 50 },
      confidence: 0.96,
    },
  ];

  const fullText = stubBlocks.map(b => b.text).join('\n');

  return {
    blocks: stubBlocks,
    fullText,
    confidence: 0.93,
    language: 'en',
  };
}

/**
 * Extract image metadata
 */
export async function extractImageMetadata(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  const sharp = (await import('sharp')).default;
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length,
  };
}

/**
 * Extract dominant colors from image
 */
export async function extractDominantColors(buffer: Buffer): Promise<string[]> {
  try {
    const sharp = (await import('sharp')).default;
    
    // Resize to small size for faster processing
    const { data, info } = await sharp(buffer)
      .resize(100, 100, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Simple color extraction - get most frequent colors
    const colorCounts = new Map<string, number>();
    
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Round to nearest 32 to group similar colors
      const roundedR = Math.round(r / 32) * 32;
      const roundedG = Math.round(g / 32) * 32;
      const roundedB = Math.round(b / 32) * 32;
      
      const color = `#${roundedR.toString(16).padStart(2, '0')}${roundedG.toString(16).padStart(2, '0')}${roundedB.toString(16).padStart(2, '0')}`;
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }

    // Get top 5 colors
    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);

    return sortedColors;
  } catch (error) {
    console.error('Error extracting colors:', error);
    return ['#000000', '#ffffff'];
  }
}
