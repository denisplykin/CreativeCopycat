import { NextResponse } from 'next/server';
import { getCreativeById, updateCreativeStatus, updateGeneratedUrls, createRun } from '@/lib/db';
import { uploadFile, getPublicUrl } from '@/lib/supabase';
import { generateTexts, generateImagePrompt } from '@/lib/llm';
import { generateBackground, editImageWithMask, createTextMask, generateBackgroundPrompt, generateInpaintPrompt } from '@/lib/dalle';
import { generateDalleSimple, generateCharacterSwap } from '@/lib/openai-image';
import { renderCreative } from '@/lib/render';
import { extractImageMetadata } from '@/lib/ocr';
import { replaceBrandsInTexts, getLogoBoundingBoxes } from '@/lib/brand-replacement';
import { STYLE_VARIANTS, applyStyleToCharacterPrompt, applyStyleToBackgroundPrompt } from '@/lib/style-modifiers';
import type { GenerateRequest, GenerateResponse } from '@/types/creative';

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const body: GenerateRequest = await request.json();
    const {
      creativeId,
      generationType,
      copyMode = 'simple_overlay',
      stylePreset = 'original',
      texts,
      llmModel,
      temperature,
      language = 'en',
      aspectRatio = '1:1',
      numVariations = 1,
    } = body;

    console.log(`🎨 Generating creative: ${generationType}, copyMode: ${copyMode}, aspectRatio: ${aspectRatio}`);

    // Get creative
    const creative = await getCreativeById(creativeId);
    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    if (!creative.analysis) {
      return NextResponse.json(
        { error: 'Creative not analyzed yet. Run analysis first.' },
        { status: 400 }
      );
    }

    // Update status to generating
    await updateCreativeStatus(creativeId, 'generating');

    let generatedUrl: string;
    const updates: any = {};

    switch (generationType) {
      case 'character': {
        // Generate character image
        const prompt = `${stylePreset} style character, isolated on transparent background, high quality`;
        const characterBuffer = await generateBackground({
          stylePreset,
          prompt,
          width: 1024,
          height: 1024,
        });

        // Upload to storage
        const characterPath = `characters/${creativeId}_${Date.now()}.png`;
        await uploadFile('assets', characterPath, characterBuffer, 'image/png');
        generatedUrl = getPublicUrl('assets', characterPath);
        updates.generated_character_url = generatedUrl;
        break;
      }

      case 'background': {
        // Generate background image
        const prompt = generateImagePrompt(stylePreset, undefined, 'clean background, no text');
        const bgBuffer = await generateBackground({
          stylePreset,
          prompt,
          width: 1080,
          height: 1080,
        });

        // Upload to storage
        const bgPath = `backgrounds/${creativeId}_${Date.now()}.png`;
        await uploadFile('backgrounds', bgPath, bgBuffer, 'image/png');
        generatedUrl = getPublicUrl('backgrounds', bgPath);
        updates.generated_background_url = generatedUrl;
        break;
      }

      case 'full_creative': {
        // Download original image
        console.log('📥 Downloading original image...');
        const imageResponse = await fetch(creative.original_image_url);
        const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const metadata = await extractImageMetadata(originalBuffer);
        
        console.log(`📐 Original size: ${metadata.width}x${metadata.height}`);

        // Generate new texts if not provided
        let finalTexts = texts || {};
        if (!texts || Object.keys(texts).length === 0) {
          if (creative.analysis.roles && creative.analysis.roles.length > 0) {
            console.log('📝 Generating new texts...');
            const generated = await generateTexts(
              creative.analysis.roles,
              undefined,
              language,
              llmModel,
              temperature
            );
            finalTexts = generated.texts;
          }
        }

        // IMPORTANT: Replace competitor brands with Algonova in ALL texts
        console.log('🏢 Replacing competitor brands with Algonova...');
        finalTexts = replaceBrandsInTexts(finalTexts);

        let bgBuffer: Buffer;

        // Different strategies based on copyMode
        switch (copyMode) {
          case 'dalle_simple': {
            // VARIANT 1: Simple DALL-E 3 text-to-image
            console.log('🎨 Mode: DALL-E Simple');
            
            // Build description from analysis
            const description = creative.analysis.description || 
              `Tech education platform advertisement with modern design`;
            
            bgBuffer = await generateDalleSimple({
              description,
              aspectRatio,
            });
            
            console.log('✅ DALL-E Simple complete!');
            break;
          }

          case 'character_swap': {
            // VARIANT 2: Character swap via OpenRouter
            console.log('👧 Mode: Character Swap (25yo Indonesian woman)');
            
            bgBuffer = await generateCharacterSwap({
              imageBuffer: originalBuffer,
              aspectRatio,
            });
            
            console.log('✅ Character swap complete!');
            break;
          }

          default: {
            console.log('⚠️ Unknown copyMode:', copyMode);
            throw new Error(`Unknown copyMode: ${copyMode}`);
          }
        }

        // For DALL-E Simple and Character Swap, we already have the final image
        // No need to render text overlay
        const finalBuffer = bgBuffer;

        // Upload to storage
        const creativePath = `generated-creatives/${creativeId}_${Date.now()}.png`;
        await uploadFile('generated-creatives', creativePath, finalBuffer, 'image/png');
        generatedUrl = getPublicUrl('generated-creatives', creativePath);
        updates.generated_image_url = generatedUrl;
        
        console.log(`✅ Creative generated: ${generatedUrl}`);
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });
    }

    // Update creative with generated URLs
    await updateGeneratedUrls(creativeId, updates);

    // Log run
    const latency = Date.now() - startTime;
    await createRun(
      { creativeId, generationType, stylePreset },
      { generatedUrl },
      'success',
      latency
    );

    // Get updated creative
    const updatedCreative = await getCreativeById(creativeId);

    const response: GenerateResponse = {
      creative: updatedCreative!,
      generated_url: generatedUrl,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log failed run
    const latency = Date.now() - startTime;
    try {
      await createRun(
        { action: 'generate', error: 'failed' },
        { error: errorMessage },
        'failed',
        latency
      );
    } catch (logError) {
      console.error('Failed to log error run:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to generate', details: errorMessage },
      { status: 500 }
    );
  }
}

