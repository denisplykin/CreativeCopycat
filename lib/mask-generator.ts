import sharp from 'sharp';
import { BoundingBox } from '@/types/creative';

interface MaskOptions {
  width: number;
  height: number;
  boxes: BoundingBox[];
  padding?: number; // Extra pixels around each box
}

/**
 * Generate a PNG mask image for image editing
 * White areas = regions to edit
 * Black areas = regions to preserve
 * 
 * Based on the instruction from ai_banner_editing_instruction.md
 */
export async function generateMask(options: MaskOptions): Promise<Buffer> {
  const { width, height, boxes, padding = 20 } = options;

  console.log(`🎭 Generating mask: ${width}x${height} with ${boxes.length} boxes`);
  console.log(`📦 Boxes:`, JSON.stringify(boxes, null, 2));
  console.log(`📏 Padding: ${padding}px`);

  try {
    // Create a black background (RGB, fully opaque)
    const blackBackground = Buffer.alloc(width * height * 3, 0);

    // Create base image
    let maskImage = sharp(blackBackground, {
      raw: {
        width,
        height,
        channels: 3,
      },
    });

    // For each box, we need to create a white rectangle overlay
    const overlays: sharp.OverlayOptions[] = [];

    for (const box of boxes) {
      const x = Math.max(0, Math.floor(box.x - padding));
      const y = Math.max(0, Math.floor(box.y - padding));
      const rectWidth = Math.min(width - x, Math.ceil(box.width + padding * 2));
      const rectHeight = Math.min(height - y, Math.ceil(box.height + padding * 2));

      // Skip invalid boxes
      if (rectWidth <= 0 || rectHeight <= 0) {
        console.warn(`⚠️ Skipping invalid box:`, box);
        continue;
      }

      console.log(`  📍 Box at (${x}, ${y}) size ${rectWidth}x${rectHeight}`);

      // Create white rectangle
      const whiteRect = Buffer.alloc(rectWidth * rectHeight * 3, 255);
      
      const rectBuffer = await sharp(whiteRect, {
        raw: {
          width: rectWidth,
          height: rectHeight,
          channels: 3,
        },
      })
        .png()
        .toBuffer();

      overlays.push({
        input: rectBuffer,
        top: y,
        left: x,
      });
    }

    // Apply all overlays
    if (overlays.length > 0) {
      maskImage = maskImage.composite(overlays);
    }

    // Convert to PNG
    const maskBuffer = await maskImage.png().toBuffer();

    console.log(`✅ Mask generated: ${maskBuffer.length} bytes`);

    return maskBuffer;
  } catch (error) {
    console.error('❌ Mask generation error:', error);
    throw error;
  }
}

/**
 * Helper: Generate mask for specific element types
 * e.g., only 'character', or 'character' + 'logo'
 */
export function filterBoxesByType(
  elements: Array<{ type: string; bbox: BoundingBox }>,
  types: string[]
): BoundingBox[] {
  return elements
    .filter((el) => types.includes(el.type))
    .map((el) => el.bbox);
}

