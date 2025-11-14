import type { OCRResult, TextBlock } from '@/types/creative';

/**
 * Run OCR on image (MVP: stub implementation)
 * In production, integrate with PaddleOCR or similar service
 */
export async function runOCR(file: Buffer): Promise<OCRResult> {
  // TODO: Integrate real OCR service
  // For now, return stub data for testing

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

  const fullText = stubBlocks.map((block) => block.text).join('\n');

  return {
    blocks: stubBlocks,
    fullText,
  };
}

/**
 * Extract dominant colors from image
 * TODO: Implement actual color extraction
 */
export async function extractDominantColors(file: Buffer): Promise<string[]> {
  // Stub implementation
  return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
}

/**
 * Detect language from text
 */
export function detectLanguage(text: string): string {
  // Simple detection based on character sets
  // TODO: Use proper language detection library
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  return 'en';
}

/**
 * Calculate aspect ratio
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;

  // Common aspect ratios
  if (Math.abs(ratioW / ratioH - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratioW / ratioH - 4 / 3) < 0.1) return '4:3';
  if (Math.abs(ratioW / ratioH - 1) < 0.1) return '1:1';
  if (Math.abs(ratioW / ratioH - 9 / 16) < 0.1) return '9:16';

  return `${ratioW}:${ratioH}`;
}

