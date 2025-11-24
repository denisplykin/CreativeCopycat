import { NextResponse } from 'next/server';
import { getCreativeById, updateCreativeStatus, updateGeneratedUrls, createRun, createCreativeRun, updateCreativeRun } from '@/lib/db';
import { uploadFile, getPublicUrl, supabaseAdmin } from '@/lib/supabase';
import { generateTexts, generateImagePrompt } from '@/lib/llm';
import { generateBackground, editImageWithMask, createTextMask, generateBackgroundPrompt, generateInpaintPrompt } from '@/lib/dalle';
import { generateMaskEdit, generateWithDallE3 } from '@/lib/openai-image';
import * as NanaBanana from '@/lib/nano-banana';
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
      imageModel = 'dall-e-2',
      temperature,
      language = 'en',
      aspectRatio = 'original',
      numVariations = 1,
      configGenerationType,
      customPrompt,
    } = body;

    console.log(`🎨 Generating creative: ${generationType}, copyMode: ${copyMode}, imageModel: ${imageModel}, aspectRatio: ${aspectRatio}`);
    console.log(`📋 Creative ID: ${creativeId}`);

    // Get creative
    console.log('🔍 Fetching creative from DB...');
    const creative = await getCreativeById(creativeId);
    if (!creative) {
      console.error(`❌ Creative ${creativeId} not found`);
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    console.log(`✅ Creative found: ${creative.competitor_name || 'Unknown'}`);
    console.log(`📸 Image URL: ${creative.original_image_url}`);

    // ✅ For competitor_creatives: analysis is optional (Nano Banana works without it)
    // If not analyzed, create minimal analysis on-the-fly
    if (!creative.analysis) {
      console.log('⚠️ Creative not analyzed, creating minimal analysis...');
      
      // Default fallback analysis
      creative.analysis = {
        ocr: { blocks: [], fullText: '' },
        layout: {
          image_size: { width: 1080, height: 1080 }, // Default size
          background: { color: '#FFFFFF', description: 'Auto-analyzed background' },
          elements: []
        },
        roles: [],
        dominant_colors: [],
        language: 'en',
        aspect_ratio: '1:1', // Default aspect ratio
      };
      
      try {
        // Try to download original image to get real metadata
        console.log('📥 Downloading image for metadata extraction...');
        const imageResponse = await fetch(creative.original_image_url);
        
        if (!imageResponse.ok) {
          console.warn(`⚠️ Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        } else {
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          console.log(`✅ Downloaded ${imageBuffer.length} bytes`);
          
          // Extract metadata
          console.log('📐 Extracting image metadata...');
          const metadata = await extractImageMetadata(imageBuffer);
          console.log(`✅ Metadata: ${metadata.width}x${metadata.height}`);
          
          // Update analysis with real dimensions
          if (creative.analysis?.layout) {
            creative.analysis.layout.image_size = { width: metadata.width, height: metadata.height };
            creative.analysis.aspect_ratio = `${metadata.width}:${metadata.height}`;
          }
        }
        
        console.log('✅ Analysis ready');
      } catch (analysisError) {
        console.error('❌ Metadata extraction failed, using defaults:', analysisError);
        console.error('Stack:', analysisError instanceof Error ? analysisError.stack : 'N/A');
        // Continue with default analysis
      }
    }

    // ✅ CREATE RUN RECORD FIRST (shows in history with "running" status)
    console.log('📝 Creating run record in history...');
    try {
      runId = await createCreativeRun({
        creative_id: creativeId,
        generation_type: generationType,
        copy_mode: copyMode,
        config: {
          aspectRatio,
          stylePreset,
          numVariations,
          language,
          imageModel,
        },
      });
      console.log(`✅ Run ${runId} created, starting generation...`);
    } catch (runError) {
      console.error('❌ Failed to create run record:', runError);
      console.error('Stack:', runError instanceof Error ? runError.stack : 'N/A');
      // Continue without run tracking if it fails
      console.log('⚠️ Continuing generation without run tracking...');
    }

    let generatedUrl: string;

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

        // Choose image generation model
        if (imageModel === 'nano-banana-pro') {
          console.log('🍌 Using Nano Banana Pro for generation...');
          bgBuffer = await NanaBanana.generateWithNanaBanana({
            imageBuffer: originalBuffer,
            modifications,
            aspectRatio,
            copyMode,
            analysis: creative.analysis,
          });
        } else if (imageModel === 'dall-e-3') {
          console.log('🎨 Using DALL-E 3 for generation...');
          bgBuffer = await generateWithDallE3({
            imageBuffer: originalBuffer,
            modifications,
            aspectRatio,
          });
        } else {
          // Default: DALL-E 2 mask editing
          console.log('✏️ Using DALL-E 2 mask editing...');
          bgBuffer = await generateMaskEdit({
            imageBuffer: originalBuffer,
            modifications,
            editTypes,
            aspectRatio,
          });
        }

        console.log('✅ Generation complete!');

        // Mask edit returns the final image
        const finalBuffer = bgBuffer;

        // Upload to storage
        const creativePath = `generated-creatives/${creativeId}_${Date.now()}.png`;
        await uploadFile('generated-creatives', creativePath, finalBuffer, 'image/png');
        generatedUrl = getPublicUrl('generated-creatives', creativePath);
        
        console.log(`✅ Creative generated: ${generatedUrl}`);
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });
    }

    // ✅ UPDATE RUN STATUS TO COMPLETED
    if (runId) {
      await updateCreativeRun(runId, 'completed', generatedUrl);
    }

    // ✅ SAVE TO "MY CREATIVES" - Auto-add generated results
    try {
      console.log('💾 Saving generated creative to My Creatives...');
      const { data: savedCreative, error: saveError } = await supabaseAdmin
        .from('competitor_creatives')
        .insert({
          competitor_name: 'My Creatives',
          image_url: generatedUrl,
          active_days: 0,
          ad_id: `gen_${Date.now()}`,
        })
        .select()
        .single();
      
      if (saveError) {
        console.error('⚠️ Failed to save to My Creatives:', saveError);
        // Don't fail the whole request, just log
      } else {
        console.log(`✅ Saved to My Creatives: ${savedCreative.id}`);
      }
    } catch (saveErr) {
      console.error('⚠️ Error saving to My Creatives:', saveErr);
      // Continue anyway
    }

    // Log run (old format for backward compatibility)
    const latency = Date.now() - startTime;
    await createRun(
      { creativeId, generationType, stylePreset },
      { generatedUrl },
      'success',
      latency
    );

    const response: GenerateResponse = {
      creative: creative,
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

