import type { LayoutElement } from '@/types/creative';

/**
 * Render text over background image
 */
export async function renderCreative(
  layout: {
    elements: LayoutElement[];
    canvasSize: { width: number; height: number };
  },
  texts: Record<string, string>,
  background: Buffer
): Promise<Buffer> {
  // Dynamic import to avoid issues with canvas in browser
  const { createCanvas, loadImage } = await import('canvas');

  const { width, height } = layout.canvasSize;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Load and draw background
  const bgImage = await loadImage(background);
  ctx.drawImage(bgImage, 0, 0, width, height);

  // Draw text elements
  const textElements = layout.elements.filter((el) => el.type === 'text');

  let textIndex = 0;
  const textValues = Object.values(texts);

  for (const element of textElements) {
    const text = textValues[textIndex] || '';
    if (!text) continue;

    const { bbox, style } = element;

    // Set text style
    const fontSize = style?.fontSize || Math.floor(bbox.height * 0.7);
    const fontFamily = style?.fontFamily || 'Arial, sans-serif';
    const fontWeight = style?.fontWeight || 'bold';
    const color = style?.color || '#000000';
    const align = style?.align || 'center';

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = align as CanvasTextAlign;
    ctx.textBaseline = 'middle';

    // Add text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Word wrap if text is too long
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > bbox.width - 20 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // Draw lines
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = bbox.y + bbox.height / 2 - totalHeight / 2 + lineHeight / 2;

    let textX: number;
    switch (align) {
      case 'left':
        textX = bbox.x + 10;
        break;
      case 'right':
        textX = bbox.x + bbox.width - 10;
        break;
      default:
        textX = bbox.x + bbox.width / 2;
    }

    lines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      ctx.fillText(line, textX, y);
    });

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    textIndex++;
  }

  return canvas.toBuffer('image/png');
}

/**
 * Generate layout from OCR results
 */
export function generateLayout(
  ocrBlocks: Array<{ text: string; bbox: { x: number; y: number; width: number; height: number } }>,
  canvasWidth: number,
  canvasHeight: number
): {
  elements: LayoutElement[];
  canvasSize: { width: number; height: number };
} {
  const elements: LayoutElement[] = ocrBlocks.map((block) => ({
    type: 'text',
    bbox: block.bbox,
    style: {
      fontSize: Math.floor(block.bbox.height * 0.7),
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      align: 'center',
      fontWeight: 'bold',
    },
  }));

  return {
    elements,
    canvasSize: {
      width: canvasWidth,
      height: canvasHeight,
    },
  };
}

