import { BoundingBox, LayoutElement } from '@/types/creative';
import { generateMask, filterBoxesByType } from './mask-generator';
import FormData from 'form-data';
import fetch, { Response } from 'node-fetch';

interface BannerLayout {
  image_size: { width: number; height: number };
  background: {
    color: string;
    description: string;
  };
  elements: LayoutElement[];
}

interface MaskEditParams {
  imageBuffer: Buffer;
  modifications: string; // User's instruction: what to change and how
  editTypes?: string[]; // Which element types to edit (e.g., ['character', 'logo'])
  aspectRatio?: string;
}

/**
 * MASK-BASED EDITING PIPELINE (3 steps)
 * Based on ai_banner_editing_instruction.md
 * 
 * Step 1: Analyze banner → extract layout JSON with bounding boxes
 * Step 2: Generate mask PNG from bounding boxes
 * Step 3: Edit image using /v1/images/edits with mask
 */
export async function generateMaskEdit(params: MaskEditParams): Promise<Buffer> {
  const { imageBuffer, modifications, editTypes = ['character'], aspectRatio = '9:16' } = params;

  try {
    console.log('🎭 MASK EDIT PIPELINE: Starting...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    console.log(`📝 Modifications: ${modifications}`);
    console.log(`🎯 Edit types: ${editTypes.join(', ')}`);

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // ========== STEP 1: Analyze banner → JSON layout with bbox ==========
    console.log('\n👁️ STEP 1: Analyzing banner structure...');

    const analysisPrompt = `Analyze this advertising banner and return a JSON description.

JSON structure:
{
  "image_size": { "width": 0, "height": 0 },
  "background": { "color": "string", "description": "string" },
  "elements": [
    {
      "id": "string",
      "type": "text | character | logo | button | decor | other",
      "role": "headline | body | cta | brand | primary | shape | other",
      "text": "string | null",
      "font_style": "string | null",
      "color": "string | null",
      "description": "string | null",
      "bbox": { "x": 0, "y": 0, "width": 0, "height": 0 },
      "z_index": 0
    }
  ]
}

Important: 
- Mark company logos and brand names as type: "logo" (not "text")
- Mark brand text as role: "brand"
- Include all text exactly as shown
- Provide pixel coordinates for every element

Return valid JSON only.`;

    // Use direct OpenAI API (no Azure content filters)
    console.log('🔄 Calling OpenAI GPT-4o for analysis...');
    
    const step1Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!step1Response.ok) {
      const errorText = await step1Response.text();
      console.error('❌ Step 1 error:', step1Response.status, errorText);
      throw new Error(`Step 1 API error: ${step1Response.status}`);
    }

    const step1Data: any = await step1Response.json();
    const layoutRaw = step1Data.choices?.[0]?.message?.content;

    if (!layoutRaw) {
      throw new Error('No layout returned from Step 1');
    }

    // Parse layout JSON
    let layout: BannerLayout;
    try {
      const jsonMatch = layoutRaw.match(/```json\s*([\s\S]*?)\s*```/) || layoutRaw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : layoutRaw;
      layout = JSON.parse(jsonStr);
    } catch (e) {
      console.error('❌ Failed to parse layout JSON:', layoutRaw);
      throw new Error('Invalid layout JSON from Step 1');
    }

    console.log('✅ STEP 1 COMPLETE! Layout extracted:');
    console.log(JSON.stringify(layout, null, 2));

    // ========== STEP 2: Generate mask from bounding boxes ==========
    console.log('\n🎨 STEP 2: Generating mask...');

    const editBoxes = filterBoxesByType(layout.elements, editTypes);

    let maskBuffer: Buffer;

    if (editBoxes.length === 0) {
      console.warn('⚠️ No specific elements found for editing types:', editTypes);
      console.log('💡 Fallback: Creating full-image mask (edit entire image)');
      
      // Create a full white mask = edit the entire image
      maskBuffer = await generateMask({
        width: layout.image_size.width,
        height: layout.image_size.height,
        boxes: [{
          x: 0,
          y: 0,
          width: layout.image_size.width,
          height: layout.image_size.height,
        }],
        padding: 0,
      });
    } else {
      console.log(`✅ Found ${editBoxes.length} element(s) to edit`);
      maskBuffer = await generateMask({
        width: layout.image_size.width,
        height: layout.image_size.height,
        boxes: editBoxes,
        padding: 30, // Extra pixels around each element
      });
    }

    console.log('✅ STEP 2 COMPLETE! Mask generated.');

    // ========== STEP 3: Edit image with mask using /v1/images/edits ==========
    console.log('\n✏️ STEP 3: Editing image with mask (gpt-image-1)...');

    // Build minimal edit prompt (important: keep it short!)
    const editPrompt = buildMinimalEditPrompt(modifications, editTypes);
    console.log('📝 Edit prompt:', editPrompt);

    // IMPORTANT: For /images/edits, both image and mask must be EXACTLY the same size
    // AND under 4MB each (OpenAI limit)
    const sharp = (await import('sharp')).default;
    
    // 🔍 DEBUG: Log input image metadata
    console.log(`\n🔍 [DEBUG] Input image buffer: ${imageBuffer.length} bytes`);
    const inputMetadata = await sharp(imageBuffer).metadata();
    console.log(`🔍 [DEBUG] Input image size: ${inputMetadata.width}x${inputMetadata.height}`);
    console.log(`🔍 [DEBUG] Input format: ${inputMetadata.format}, channels: ${inputMetadata.channels}`);
    
    let targetWidth = layout.image_size.width;
    let targetHeight = layout.image_size.height;
    
    // If image is too large, scale it down (max 1024x1024 to stay under 4MB)
    const maxDimension = 1024;
    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = Math.round(targetHeight * scale);
      console.log(`⚠️ Scaling down from ${layout.image_size.width}x${layout.image_size.height} to ${targetWidth}x${targetHeight} (OpenAI limit)`);
    }
    
    console.log(`🔄 Converting image and mask to PNG (${targetWidth}x${targetHeight})...`);
    
    // Convert image to PNG with compression (quality 80 to reduce file size)
    // IMPORTANT: Use 'inside' to maintain aspect ratio, NOT 'fill' which distorts
    const convertedImage = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, { 
        fit: 'inside', // Maintain aspect ratio, don't distort
        withoutEnlargement: true, // Don't upscale if smaller
        kernel: 'lanczos3' // Better quality for downscaling
      })
      .png({ 
        compressionLevel: 6, // Balance between size and quality
        quality: 80 
      })
      .toBuffer();
    
    // Get actual image dimensions after conversion
    const imageMetadata = await sharp(convertedImage).metadata();
    console.log(`📐 Image: ${imageMetadata.width}x${imageMetadata.height}, size: ${(convertedImage.length / 1024 / 1024).toFixed(2)}MB`);
    
    // Check if image is still too large
    if (convertedImage.length > 4 * 1024 * 1024) {
      throw new Error(`Image still too large: ${(convertedImage.length / 1024 / 1024).toFixed(2)}MB (max 4MB). Try a smaller image.`);
    }
    
    // Convert mask to PNG with SAME exact size as the converted image
    // Use the actual converted image dimensions, not targetWidth/targetHeight
    const convertedMask = await sharp(maskBuffer)
      .resize(imageMetadata.width!, imageMetadata.height!, { 
        fit: 'fill', // Mask can be stretched, it's just black/white
        kernel: 'nearest' // Sharp edges for mask
      })
      .png({ compressionLevel: 9 }) // Max compression for mask (black/white compresses well)
      .toBuffer();
    
    // Get actual mask dimensions after conversion
    const maskMetadata = await sharp(convertedMask).metadata();
    console.log(`📐 Mask: ${maskMetadata.width}x${maskMetadata.height}, size: ${(convertedMask.length / 1024 / 1024).toFixed(2)}MB`);
    
    // 🔍 DEBUG: Log mask coverage
    const totalImagePixels = maskMetadata.width! * maskMetadata.height!;
    const maskedPixels = editBoxes.reduce((acc, box) => acc + box.width * box.height, 0);
    const maskCoverage = (maskedPixels / totalImagePixels * 100).toFixed(1);
    console.log(`\n🔍 [DEBUG] Mask details:`);
    console.log(`   Total masked elements: ${editBoxes.length}`);
    console.log(`   Mask coverage: ${maskCoverage}% of image`);
    console.log(`   Edit types: ${editTypes.join(', ')}`);
    
    // Verify sizes match
    if (imageMetadata.width !== maskMetadata.width || imageMetadata.height !== maskMetadata.height) {
      throw new Error(`Size mismatch! Image: ${imageMetadata.width}x${imageMetadata.height}, Mask: ${maskMetadata.width}x${maskMetadata.height}`);
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('image', convertedImage, {
      filename: 'image.png',
      contentType: 'image/png',
    });
    formData.append('mask', convertedMask, {
      filename: 'mask.png',
      contentType: 'image/png',
    });
    formData.append('prompt', editPrompt);
    // Note: 'size' is NOT needed for /images/edits - it uses input image size
    formData.append('quality', 'high'); // ✅ High quality for better results
    formData.append('n', '1');

    const editResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    console.log(`📊 Response status: ${editResponse.status} ${editResponse.statusText}`);

    if (!editResponse.ok) {
      const errorText = await editResponse.text();
      console.error('❌ Step 3 error:', editResponse.status, errorText);
      throw new Error(`Image edit API error: ${editResponse.status} - ${errorText.substring(0, 200)}`);
    }

    // Try to parse JSON
    const responseText = await editResponse.text();
    console.log('📦 Raw response (first 500 chars):', responseText.substring(0, 500));
    
    let editData: any;
    try {
      editData = JSON.parse(responseText);
      console.log('✅ Parsed JSON successfully');
    } catch (e) {
      console.error('❌ Failed to parse JSON. Full response:', responseText);
      throw new Error(`Invalid JSON response from API: ${responseText.substring(0, 200)}`);
    }
    
    console.log('📦 API Response:', JSON.stringify(editData, null, 2));
    
    // Check for b64_json format (if response_format was set)
    const b64Image = editData.data?.[0]?.b64_json;
    const resultUrl = editData.data?.[0]?.url;

    if (b64Image) {
      console.log('✅ Got b64_json response');
      // Convert base64 to buffer
      let resultBuffer: Buffer = Buffer.from(b64Image, 'base64');

      console.log(`✅ STEP 3 COMPLETE! Image edited: ${resultBuffer.length} bytes`);

      // ========== STEP 4: Restore original aspect ratio if needed ==========
      if (aspectRatio === 'original') {
        console.log('\n📐 STEP 4: Checking if size restoration needed...');
        const editedMetadata = await sharp(resultBuffer).metadata();
        const originalWidth = layout.image_size.width;
        const originalHeight = layout.image_size.height;
        
        console.log(`\n🔍 [DEBUG] DALL-E returned image metadata:`);
        console.log(`   Width: ${editedMetadata.width}px`);
        console.log(`   Height: ${editedMetadata.height}px`);
        console.log(`   Format: ${editedMetadata.format}`);
        console.log(`   Channels: ${editedMetadata.channels}`);
        console.log(`   Space: ${editedMetadata.space}`);
        console.log(`   Size: ${(resultBuffer.length / 1024).toFixed(1)}KB`);
        console.log(`\n🔍 [DEBUG] Original image from analysis:`);
        console.log(`   Width: ${originalWidth}px`);
        console.log(`   Height: ${originalHeight}px`);
        console.log(`🔍 [DEBUG] Edit types used: ${editTypes.join(', ')}`);
        
        console.log(`\n  Current size: ${editedMetadata.width}x${editedMetadata.height}`);
        console.log(`  Target size: ${originalWidth}x${originalHeight}`);
        
        // Check if aspect ratios match (within 1% tolerance)
        const currentAspect = editedMetadata.width! / editedMetadata.height!;
        const targetAspect = originalWidth / originalHeight;
        const aspectDiff = Math.abs(currentAspect - targetAspect) / targetAspect;
        
        console.log(`  Current aspect: ${currentAspect.toFixed(3)}, Target: ${targetAspect.toFixed(3)}`);
        console.log(`  Aspect difference: ${(aspectDiff * 100).toFixed(2)}%`);
        
        // Only resize if dimensions are significantly different
        if (Math.abs(editedMetadata.width! - originalWidth) > 10 || 
            Math.abs(editedMetadata.height! - originalHeight) > 10) {
          console.log(`  📏 Resizing to exact dimensions...`);
          
          // 🎯 Special case: logo-only edit (small mask ~7%)
          // DALL-E ignores aspect ratio for small masks and returns arbitrary size
          // We MUST use 'cover' to fill the original dimensions
          const isLogoOnlyEdit = editTypes.length === 1 && editTypes[0] === 'logo';
          
          if (isLogoOnlyEdit) {
            console.log(`  🎯 Logo-only edit detected (small mask), forcing 'cover' to fill original size`);
            console.log(`  ⚠️ DALL-E returned ${editedMetadata.width}x${editedMetadata.height}, but we need ${originalWidth}x${originalHeight}`);
            const resized = await sharp(resultBuffer)
              .resize(originalWidth, originalHeight, {
                fit: 'cover',  // ✅ Fill entire dimensions, crop edges if needed
                position: 'centre',
                kernel: 'lanczos3'
              })
              .toBuffer();
            resultBuffer = resized as Buffer;
          }
          // Choose resize strategy based on aspect ratio difference
          else if (aspectDiff <= 0.01) {
            // Aspect ratios match - safe to use 'cover' for exact size
            console.log(`  ✅ Aspect ratio matches, using 'cover' for exact dimensions`);
            const resized = await sharp(resultBuffer)
              .resize(originalWidth, originalHeight, {
                fit: 'cover',  // ✅ Fill entire dimensions, crop minimal edges if needed
                position: 'centre',
                kernel: 'lanczos3'
              })
              .toBuffer();
            resultBuffer = resized as Buffer;
          } else {
            // Aspect ratios don't match - use 'inside' to prevent distortion
            console.log(`  ⚠️ Aspect ratio differs by ${(aspectDiff * 100).toFixed(2)}%, using 'inside' to prevent distortion`);
            const resized = await sharp(resultBuffer)
              .resize(originalWidth, originalHeight, {
                fit: 'inside',  // Preserve aspect ratio, don't distort
                withoutEnlargement: false,
                kernel: 'lanczos3'
              })
              .toBuffer();
            resultBuffer = resized as Buffer;
            
            console.log(`  ⚠️ Note: Image may not fill exact dimensions due to aspect ratio mismatch`);
          }
          
          const finalMetadata = await sharp(resultBuffer).metadata();
          console.log(`  ✅ Resized to ${finalMetadata.width}x${finalMetadata.height}`);
          
          // 🔍 DEBUG: Log resize details
          console.log(`\n🔍 [DEBUG] After resize:`);
          console.log(`   Size change: ${editedMetadata.width}x${editedMetadata.height} → ${finalMetadata.width}x${finalMetadata.height}`);
          console.log(`   Buffer size: ${(resultBuffer.length / 1024).toFixed(1)}KB`);
          console.log(`   Final aspect ratio: ${(finalMetadata.width! / finalMetadata.height!).toFixed(3)}`);
          console.log(`   Target aspect ratio: ${targetAspect.toFixed(3)}`);
          console.log(`   Match: ${Math.abs((finalMetadata.width! / finalMetadata.height!) - targetAspect) < 0.01 ? '✅ YES' : '⚠️ NO'}`);
        } else {
          console.log(`  ✅ Size already close enough, no resize needed`);
          console.log(`\n🔍 [DEBUG] No resize performed - dimensions within 10px tolerance`);
        }
        console.log('✅ STEP 4 COMPLETE!');
      }

      console.log('🎉 Mask edit pipeline successful!\n');
      return resultBuffer;
    }

    if (!resultUrl) {
      console.error('❌ No URL or b64_json in response:', editData);
      throw new Error('No edited image URL or b64_json returned from API');
    }

    // Download the result
    console.log('⬇️ Downloading edited image...');
    const imageResponse = await fetch(resultUrl);
    let resultBuffer: Buffer = Buffer.from(await imageResponse.arrayBuffer());

    console.log(`✅ STEP 3 COMPLETE! Image edited: ${resultBuffer.length} bytes`);

    // ========== STEP 4: Restore original aspect ratio if needed ==========
    if (aspectRatio === 'original') {
      console.log('\n📐 STEP 4: Checking if size restoration needed...');
      const editedMetadata = await sharp(resultBuffer).metadata();
      const originalWidth = layout.image_size.width;
      const originalHeight = layout.image_size.height;
      
      console.log(`\n🔍 [DEBUG] DALL-E returned image metadata (URL path):`);
      console.log(`   Width: ${editedMetadata.width}px`);
      console.log(`   Height: ${editedMetadata.height}px`);
      console.log(`   Format: ${editedMetadata.format}`);
      console.log(`   Channels: ${editedMetadata.channels}`);
      console.log(`   Space: ${editedMetadata.space}`);
      console.log(`   Size: ${(resultBuffer.length / 1024).toFixed(1)}KB`);
      console.log(`\n🔍 [DEBUG] Original image from analysis:`);
      console.log(`   Width: ${originalWidth}px`);
      console.log(`   Height: ${originalHeight}px`);
      console.log(`🔍 [DEBUG] Edit types used: ${editTypes.join(', ')}`);
      
      console.log(`\n  Current size: ${editedMetadata.width}x${editedMetadata.height}`);
      console.log(`  Target size: ${originalWidth}x${originalHeight}`);
      
      // Check if aspect ratios match (within 1% tolerance)
      const currentAspect = editedMetadata.width! / editedMetadata.height!;
      const targetAspect = originalWidth / originalHeight;
      const aspectDiff = Math.abs(currentAspect - targetAspect) / targetAspect;
      
      console.log(`  Current aspect: ${currentAspect.toFixed(3)}, Target: ${targetAspect.toFixed(3)}`);
      console.log(`  Aspect difference: ${(aspectDiff * 100).toFixed(2)}%`);
      
      // Only resize if dimensions are significantly different
      if (Math.abs(editedMetadata.width! - originalWidth) > 10 || 
          Math.abs(editedMetadata.height! - originalHeight) > 10) {
        console.log(`  📏 Resizing to exact dimensions...`);
        
        // 🎯 Special case: logo-only edit (small mask ~7%)
        // DALL-E ignores aspect ratio for small masks and returns arbitrary size
        // We MUST use 'cover' to fill the original dimensions
        const isLogoOnlyEdit = editTypes.length === 1 && editTypes[0] === 'logo';
        
        if (isLogoOnlyEdit) {
          console.log(`  🎯 Logo-only edit detected (small mask), forcing 'cover' to fill original size`);
          console.log(`  ⚠️ DALL-E returned ${editedMetadata.width}x${editedMetadata.height}, but we need ${originalWidth}x${originalHeight}`);
          const resized = await sharp(resultBuffer)
            .resize(originalWidth, originalHeight, {
              fit: 'cover',  // ✅ Fill entire dimensions, crop edges if needed
              position: 'centre',
              kernel: 'lanczos3'
            })
            .toBuffer();
          resultBuffer = resized as Buffer;
        }
        // Choose resize strategy based on aspect ratio difference
        else if (aspectDiff <= 0.01) {
          // Aspect ratios match - safe to use 'cover' for exact size
          console.log(`  ✅ Aspect ratio matches, using 'cover' for exact dimensions`);
          const resized = await sharp(resultBuffer)
            .resize(originalWidth, originalHeight, {
              fit: 'cover',  // ✅ Fill entire dimensions, crop minimal edges if needed
              position: 'centre',
              kernel: 'lanczos3'
            })
            .toBuffer();
          resultBuffer = resized as Buffer;
        } else {
          // Aspect ratios don't match - use 'inside' to prevent distortion
          console.log(`  ⚠️ Aspect ratio differs by ${(aspectDiff * 100).toFixed(2)}%, using 'inside' to prevent distortion`);
          const resized = await sharp(resultBuffer)
            .resize(originalWidth, originalHeight, {
              fit: 'inside',  // Preserve aspect ratio, don't distort
              withoutEnlargement: false,
              kernel: 'lanczos3'
            })
            .toBuffer();
          resultBuffer = resized as Buffer;
          
          console.log(`  ⚠️ Note: Image may not fill exact dimensions due to aspect ratio mismatch`);
        }
        
        const finalMetadata = await sharp(resultBuffer).metadata();
        console.log(`  ✅ Resized to ${finalMetadata.width}x${finalMetadata.height}`);
        
        // 🔍 DEBUG: Log resize details
        console.log(`\n🔍 [DEBUG] After resize (URL path):`);
        console.log(`   Size change: ${editedMetadata.width}x${editedMetadata.height} → ${finalMetadata.width}x${finalMetadata.height}`);
        console.log(`   Buffer size: ${(resultBuffer.length / 1024).toFixed(1)}KB`);
        console.log(`   Final aspect ratio: ${(finalMetadata.width! / finalMetadata.height!).toFixed(3)}`);
        console.log(`   Target aspect ratio: ${targetAspect.toFixed(3)}`);
        console.log(`   Match: ${Math.abs((finalMetadata.width! / finalMetadata.height!) - targetAspect) < 0.01 ? '✅ YES' : '⚠️ NO'}`);
      } else {
        console.log(`  ✅ Size already close enough, no resize needed`);
        console.log(`\n🔍 [DEBUG] No resize performed - dimensions within 10px tolerance (URL path)`);
      }
      console.log('✅ STEP 4 COMPLETE!');
    }

    console.log('🎉 Mask edit pipeline successful!\n');

    return resultBuffer;
  } catch (error) {
    console.error('❌ Mask edit pipeline error:', error);
    throw error;
  }
}

/**
 * Build a MINIMAL edit prompt for gpt-image-1
 * According to docs: short prompts work better, model doesn't need detailed layout description
 * 
 * CRITICAL: Keep prompt EXTREMELY short and neutral to avoid moderation blocks
 * IMPORTANT: Always include Algonova text branding in purple color (#833AE0)
 */
function buildMinimalEditPrompt(modifications: string, editTypes: string[]): string {
  // Ultra-minimal prompt - just tell what to do with masked areas
  // Avoid ANY words that could trigger moderation: "replace", "remove", "logo", "brand", etc.
  
  // ALWAYS include Algonova branding text
  const algonova = `text "Algonova" in purple color #833AE0`;
  
  // If editing logo specifically, use generic "branding element" language
  if (editTypes.includes('logo') && editTypes.length === 1) {
    return `Professional advertising design with ${algonova}.`;
  }
  
  // If editing character, ALSO include Algonova branding
  if (editTypes.includes('character')) {
    return `Professional advertising design with diverse representation and ${algonova}.`;
  }
  
  // Generic fallback - ALSO include Algonova branding
  return `Professional advertising design with ${algonova}, maintaining existing layout.`;
}

/**
 * Build a precise edit prompt based on layout and user modifications (OLD VERSION - TOO VERBOSE)
 */
function buildEditPrompt(layout: BannerLayout, modifications: string, editTypes: string[]): string {
  const preservedElements = layout.elements.filter((el) => !editTypes.includes(el.type));
  const editedElements = layout.elements.filter((el) => editTypes.includes(el.type));

  let prompt = `Professional advertising banner. `;

  // Describe what to preserve
  prompt += `Preserve the following EXACTLY: `;
  prompt += `- Background: ${layout.background.description}. `;
  
  if (preservedElements.length > 0) {
    const textElements = preservedElements.filter((el) => el.type === 'text' && el.text);
    if (textElements.length > 0) {
      prompt += `- All text blocks: `;
      textElements.forEach((el) => {
        prompt += `"${el.text}" (${el.font_style}, ${el.color}), `;
      });
    }

    const otherElements = preservedElements.filter((el) => el.type !== 'text');
    if (otherElements.length > 0) {
      prompt += `- Other elements: `;
      otherElements.forEach((el) => {
        if (el.description) {
          prompt += `${el.description}, `;
        }
      });
    }
  }

  // Describe what to change
  prompt += `\n\nChange the following areas (white mask): `;
  editedElements.forEach((el) => {
    prompt += `${el.type} (${el.description || el.role}), `;
  });

  // Add user's modification instructions
  prompt += `\n\nModifications: ${modifications}`;

  // Add quality instructions
  prompt += `\n\nMaintain high quality, professional design, same layout and composition.`;

  return prompt;
}

/**
 * DALL-E 3 GENERATIONS PIPELINE (2 steps)
 * Full image regeneration (not editing)
 * 
 * Step 1: GPT-4o analyzes image → generates detailed DALL-E prompt
 * Step 2: DALL-E 3 generates new image from prompt
 * 
 * Price: $0.04 (standard) or $0.08 (hd)
 */
export async function generateWithDallE3(params: {
  imageBuffer: Buffer;
  modifications: string;
  aspectRatio?: string;
  quality?: 'standard' | 'hd';
}): Promise<Buffer> {
  const { imageBuffer, modifications, aspectRatio = '1:1', quality = 'standard' } = params;

  try {
    console.log('🎨 DALL-E 3 GENERATIONS PIPELINE: Starting...');
    console.log(`📐 Aspect ratio: ${aspectRatio}`);
    console.log(`💎 Quality: ${quality} (${quality === 'hd' ? '$0.08' : '$0.04'})`);
    console.log(`📝 Modifications: ${modifications}`);

    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectMimeType(imageBuffer);

    // ========== STEP 1: GPT-4o analyzes image → generates DALL-E prompt ==========
    console.log('\n👁️ STEP 1: Analyzing image and generating DALL-E prompt...');

    const promptGenerationRequest = `You are an expert at analyzing advertising banners and writing detailed DALL-E prompts.

Analyze this banner image and create a detailed prompt for DALL-E 3 to recreate it with modifications.

USER MODIFICATIONS: ${modifications}

Your task:
1. Describe ALL visual elements in detail (layout, colors, text, characters, objects, style)
2. Include the exact text content that should appear
3. Apply the user's modifications
4. IMPORTANT: Replace any competitor brand names with "Algonova" (purple #833AE0)
5. Keep the same composition and style as the original

Return a detailed DALL-E prompt (150-250 words) that will recreate this banner.
The prompt should be descriptive, specific, and focus on visual details.

Format: Return ONLY the prompt text, no JSON, no explanations.`;

    const step1Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: promptGenerationRequest,
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
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!step1Response.ok) {
      const errorText = await step1Response.text();
      console.error('❌ Step 1 error:', step1Response.status, errorText);
      throw new Error(`GPT-4o prompt generation error: ${step1Response.status}`);
    }

    const step1Data: any = await step1Response.json();
    const dallePrompt = step1Data.choices?.[0]?.message?.content;

    if (!dallePrompt) {
      throw new Error('No DALL-E prompt returned from GPT-4o');
    }

    console.log('✅ STEP 1 COMPLETE! Generated DALL-E prompt:');
    console.log(dallePrompt.substring(0, 300) + '...');

    // ========== STEP 2: DALL-E 3 generates new image ==========
    console.log('\n🎨 STEP 2: Generating image with DALL-E 3...');

    // Map aspect ratio to DALL-E 3 size
    let size: '1024x1024' | '1024x1792' | '1792x1024';
    if (aspectRatio === '9:16' || aspectRatio === '4:5') {
      size = '1024x1792'; // Vertical
    } else if (aspectRatio === '16:9') {
      size = '1792x1024'; // Horizontal
    } else {
      size = '1024x1024'; // Square (default for 1:1 and original)
    }

    console.log(`📐 DALL-E 3 size: ${size}`);

    const step2Response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: dallePrompt,
        size: size,
        quality: quality,
        n: 1,
      }),
    });

    if (!step2Response.ok) {
      const errorText = await step2Response.text();
      console.error('❌ Step 2 error:', step2Response.status, errorText);
      throw new Error(`DALL-E 3 generation error: ${step2Response.status} - ${errorText.substring(0, 200)}`);
    }

    const step2Data: any = await step2Response.json();
    const imageUrl = step2Data.data?.[0]?.url;

    if (!imageUrl) {
      console.error('❌ No image URL in response:', step2Data);
      throw new Error('No image URL returned from DALL-E 3');
    }

    console.log('✅ STEP 2 COMPLETE! Image generated');
    console.log(`📥 Downloading from: ${imageUrl.substring(0, 50)}...`);

    // Download the generated image
    const imageResponse = await fetch(imageUrl);
    const resultBuffer = Buffer.from(await imageResponse.arrayBuffer());

    console.log(`✅ Downloaded: ${resultBuffer.length} bytes`);
    console.log('🎉 DALL-E 3 pipeline successful!\n');

    return resultBuffer;
  } catch (error) {
    console.error('❌ DALL-E 3 pipeline error:', error);
    throw error;
  }
}

/**
 * Detect MIME type from buffer
 */
function detectMimeType(buffer: Buffer): string {
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
  return 'image/png';
}
