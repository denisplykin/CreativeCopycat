import type { OCRResult, TextBlock } from '@/types/creative';

/**
 * Run OCR on image using Tesseract.js
 * TEMPORARILY DISABLED: Tesseract.js doesn't work in Vercel serverless (worker threads issue)
 * Using stub data until we integrate Google Vision API
 */
export async function runOCR(imageBuffer: Buffer): Promise<OCRResult> {
  console.log('⚠️ OCR: Using stub data (Tesseract disabled for serverless compatibility)');
  
  // TODO: Replace with Google Vision API
  // For now, return stub data to test the rest of the flow
  return getStubOCRResult();

  /* DISABLED - Worker threads don't work in Vercel serverless
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
