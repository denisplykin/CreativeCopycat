import type { LayoutElement } from '@/types/creative';

/**
 * Render text over background image using sharp
 * Creates SVG text and composites it over the image
 */
export async function renderCreative(
  layout: {
    elements: LayoutElement[];
    canvasSize: { width: number; height: number };
  },
  texts: Record<string, string>,
  background: Buffer
): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  
  console.log('🎨 Rendering creative with texts:', texts);
  console.log('📐 Layout elements:', layout.elements.length);

  try {
    // Create SVG overlay with text elements
    const svgTexts = layout.elements.map((element, index) => {
      const text = texts[`text${index}`] || texts[index] || element.text || '';
      if (!text) return '';

      const { bbox, font_style, color } = element;
      // Parse font_style (e.g., "bold sans-serif")
      const fontWeight = font_style?.includes('bold') ? 'bold' : 'normal';
      const fontFamily = font_style?.replace('bold', '').trim() || 'Arial, sans-serif';
      const fontSize = Math.floor(bbox.height * 0.7);
      const textColor = color || '#FFFFFF';
      
      // Center text in bounding box
      const x = bbox.x + bbox.width / 2;
      const y = bbox.y + bbox.height / 2 + fontSize / 3; // Adjust for vertical centering

      // Add text shadow for better visibility
      return `
        <text
          x="${x}"
          y="${y}"
          font-size="${fontSize}"
          font-family="${fontFamily}"
          font-weight="${fontWeight}"
          fill="${textColor}"
          text-anchor="middle"
          stroke="#000000"
          stroke-width="2"
          paint-order="stroke"
        >${escapeXml(text)}</text>
      `;
    }).join('');

    const svg = `
      <svg width="${layout.canvasSize.width}" height="${layout.canvasSize.height}">
        ${svgTexts}
      </svg>
    `;

    console.log('📝 Generated SVG overlay');

    // Composite SVG over background
    const result = await sharp(background)
      .composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0,
        }
      ])
      .png()
      .toBuffer();

    console.log('✅ Rendering complete');
    return result;
  } catch (error) {
    console.error('❌ Rendering error:', error);
    console.warn('⚠️ Returning background without text overlay');
    return background;
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
  const elements: LayoutElement[] = ocrBlocks.map((block, idx) => ({
    id: `text_${idx}`,
    type: 'text' as const,
    role: 'body' as const,
    text: block.text,
    subtext: null,
    font_style: 'bold sans-serif',
    color: '#FFFFFF',
    description: null,
    bbox: block.bbox,
    z_index: idx + 1,
  }));

  return {
    elements,
    canvasSize: {
      width: canvasWidth,
      height: canvasHeight,
    },
  };
}
