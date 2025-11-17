import { NextResponse } from 'next/server';
import { getCreativeById, updateCreativeStatus, updateGeneratedUrls, createRun, createCreativeRun, updateCreativeRun } from '@/lib/db';
import { uploadFile, getPublicUrl, supabaseAdmin } from '@/lib/supabase';
import { generateTexts, generateImagePrompt } from '@/lib/llm';
import { generateBackground, editImageWithMask, createTextMask, generateBackgroundPrompt, generateInpaintPrompt } from '@/lib/dalle';
import { generateMaskEdit, generateWithDallE3 } from '@/lib/openai-image';
import { renderCreative } from '@/lib/render';
import { extractImageMetadata } from '@/lib/ocr';
import { replaceBrandsInTexts, getLogoBoundingBoxes } from '@/lib/brand-replacement';
import { STYLE_VARIANTS, applyStyleToCharacterPrompt, applyStyleToBackgroundPrompt } from '@/lib/style-modifiers';
import type { GenerateRequest, GenerateResponse } from '@/types/creative';

export async function POST(request: Request) {
  const startTime = Date.now();
  let runId: string | null = null;
  
  try {
    const body: GenerateRequest = await request.json();
    const {
      creativeId,
      generationType,
      copyMode = 'mask_edit',
      stylePreset = 'original',
      texts,
      llmModel,
      temperature,
      language = 'en',
      aspectRatio = 'original',
      numVariations = 1,
      configGenerationType,
      customPrompt,
    } = body;

    console.log(`🎨 Generating creative: ${generationType}, copyMode: ${copyMode}, aspectRatio: ${aspectRatio}`);

    // Get creative
    const creative = await getCreativeById(creativeId);
    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // If not analyzed, run analysis first
    if (!creative.analysis) {
      console.log('⚠️ Creative not analyzed, running analysis first...');
      try {
        await updateCreativeStatus(creativeId, 'analyzing');
        
        // Download original image
        const imageResponse = await fetch(creative.original_image_url);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        // Extract metadata
        const metadata = await extractImageMetadata(imageBuffer);
        
        // Store analysis
        const analysisData = {
          ocr: { blocks: [], fullText: '' },
          layout: {
            image_size: { width: metadata.width, height: metadata.height },
            background: { color: '#FFFFFF', description: 'Auto-analyzed background' },
            elements: []
          },
          roles: [],
          dominant_colors: [],
          language: 'en',
          aspect_ratio: `${metadata.width}:${metadata.height}`,
        };
        
        const { error: updateError } = await supabaseAdmin
          .from('creatives')
          .update({ 
            analysis: analysisData,
            status: 'completed'
          })
          .eq('id', creativeId);
        
        if (updateError) {
          throw new Error(`Failed to save analysis: ${updateError.message}`);
        }
        
        console.log('✅ Auto-analysis complete');
        
        // Re-fetch creative with analysis
        const updatedCreative = await getCreativeById(creativeId);
        Object.assign(creative, updatedCreative);
      } catch (analysisError) {
        console.error('❌ Auto-analysis failed:', analysisError);
        return NextResponse.json(
          { error: 'Failed to analyze creative', details: analysisError instanceof Error ? analysisError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // ✅ CREATE RUN RECORD FIRST (shows in history with "running" status)
    console.log('📝 Creating run record in history...');
    runId = await createCreativeRun({
      creative_id: creativeId,
      generation_type: generationType,
      copy_mode: copyMode,
      config: {
        aspectRatio,
        stylePreset,
        numVariations,
        language,
      },
    });
    console.log(`✅ Run ${runId} created, starting generation...`);

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
          if (creative.analysis?.roles && creative.analysis.roles.length > 0) {
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

        // MASK-BASED EDITING
        console.log(`🎭 Mode: ${copyMode}`);
        
        // Determine modifications and edit types based on copyMode
        let modifications: string;
        let editTypes: string[];

        switch (copyMode) {
          case 'simple_copy':
            console.log('📝 Simple Copy: Logo only');
            modifications = `If there is a company logo or brand name visible, update it to Algonova branding. Otherwise, keep the design as is.`;
            editTypes = ['logo'];
            break;

          case 'copy_with_color':
            console.log('🎨 Copy + Color: Logo + colors');
            modifications = `If there is a company logo, update it to Algonova. Apply brand colors (orange, pink, purple, cyan) to decorative elements if present.`;
            editTypes = ['logo', 'decor'];
            break;

          case 'slightly_different':
            console.log('👤 Slightly Different: Minor character modifications + logo');
            modifications = `Update logo to Algonova. For character(s): keep EXACT same art style, number of characters, and composition. ONLY minor expression or pose variation. Maintain character type (age/gender category).`;
            editTypes = ['character', 'logo'];  // ✅ Only character and logo, preserve background!
            break;

          case 'mask_edit':
            if (configGenerationType === 'custom' && customPrompt) {
              console.log('✏️ Custom Prompt Mode');
              modifications = `${customPrompt}. Also, if there is a company logo visible, update it to Algonova branding.`;
              editTypes = ['character', 'logo', 'text', 'button', 'decor', 'background'];
            } else {
              console.log('⚙️ Default Mode');
              modifications = `If there is a company logo or brand name visible, update it to Algonova branding. Otherwise, keep the design as is.`;
              editTypes = ['character', 'logo'];
            }
            break;

          default:
            console.log('⚠️ Unknown mode, using default');
            modifications = `If there is a company logo visible, update it to Algonova. Otherwise, keep the design as is.`;
            editTypes = ['logo'];
        }

        console.log(`📝 Modifications: ${modifications.substring(0, 100)}...`);
        console.log(`🎯 Edit types: ${editTypes.join(', ')}`);
        
        bgBuffer = await generateMaskEdit({
          imageBuffer: originalBuffer,
          modifications,
          editTypes,
          aspectRatio,
        });
        
        console.log('✅ Mask edit complete!');

        // Mask edit returns the final image
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

    // ✅ UPDATE RUN STATUS TO COMPLETED
    if (runId) {
      await updateCreativeRun(runId, 'completed', generatedUrl);
    }

    // Log run (old format for backward compatibility)
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
    
    // ✅ UPDATE RUN STATUS TO FAILED
    if (runId) {
      try {
        await updateCreativeRun(runId, 'failed', undefined, errorMessage);
      } catch (updateError) {
        console.error('Failed to update run status:', updateError);
      }
    }
    
    // Log failed run (old format for backward compatibility)
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

