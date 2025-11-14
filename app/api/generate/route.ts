import { NextResponse } from 'next/server';
import { getCreativeById, updateCreativeStatus, updateGeneratedUrls, createRun } from '@/lib/db';
import { uploadFile, getPublicUrl } from '@/lib/supabase';
import { generateTexts, generateImagePrompt } from '@/lib/llm';
import { generateBackground, editImageWithMask, createTextMask, generateBackgroundPrompt, generateInpaintPrompt } from '@/lib/dalle';
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
          case 'simple_overlay': {
            // Clone: Just use original image
            console.log('🎯 Mode: Simple Overlay (Clone)');
            bgBuffer = originalBuffer;
            break;
          }

          case 'dalle_inpaint': {
            // Similar: Remove text + logos using DALL·E inpaint
            console.log('✨ Mode: DALL·E Inpaint (Similar Style)');
            
            // Create mask from OCR text blocks + logos
            const textBlocks = creative.analysis.ocr?.blocks || [];
            const textBoxes = textBlocks.map(block => block.bbox);
            
            // Add logo bounding boxes to mask
            const logoBoxes = getLogoBoundingBoxes(creative.analysis, metadata.width, metadata.height);
            const allBoxes = [...textBoxes, ...logoBoxes];
            
            console.log(`🎭 Creating mask for ${textBoxes.length} text blocks + ${logoBoxes.length} logos...`);
            const maskBuffer = await createTextMask(
              metadata.width,
              metadata.height,
              allBoxes
            );
            
            // Generate inpaint prompt (handle undefined design)
            const inpaintPrompt = generateInpaintPrompt(creative.analysis?.design || null);
            
            console.log('🎨 Running DALL·E inpaint...');
            bgBuffer = await editImageWithMask({
              image: originalBuffer,
              mask: maskBuffer,
              prompt: inpaintPrompt,
            });
            
            console.log('✅ Inpaint complete!');
            break;
          }

          case 'bg_regen': {
            // New Background: Generate completely new background
            console.log('🌈 Mode: Background Regeneration (New BG)');
            
            // Generate background prompt from design analysis (handle undefined)
            const bgPrompt = generateBackgroundPrompt(
              creative.analysis?.design || null,
              stylePreset
            );
            
            console.log('🎨 Generating new background with DALL·E...');
            bgBuffer = await generateBackground({
              stylePreset,
              prompt: bgPrompt,
              width: metadata.width,
              height: metadata.height,
            });
            
            console.log('✅ Background generation complete!');
            break;
          }

          case 'old_style': {
            // Old Style: Use prompts from Claude analysis (Midjourney/Flux approach)
            console.log('🎨 Mode: Old Style (Midjourney/Flux)');
            
            // Check if analysis has imageGenerationPrompts
            const prompts = (creative.analysis as any).imageGenerationPrompts;
            
            if (!prompts || !prompts.background) {
              console.warn('⚠️ No imageGenerationPrompts in analysis, using design description');
              
              // Fallback: generate prompt from design analysis (handle undefined)
              const bgPrompt = generateBackgroundPrompt(
                creative.analysis?.design || null,
                'realistic photorealistic studio lighting'
              );
              
              bgBuffer = await generateBackground({
                stylePreset: 'realistic',
                prompt: bgPrompt,
                width: metadata.width,
                height: metadata.height,
              });
            } else {
              // Use Claude's generated prompt
              console.log(`📝 Using Claude prompt: ${prompts.background.substring(0, 100)}...`);
              
              bgBuffer = await generateBackground({
                stylePreset: 'realistic',
                prompt: prompts.background,
                width: metadata.width,
                height: metadata.height,
              });
            }
            
            console.log('✅ Old Style background generated!');
            break;
          }

          case 'style_variations': {
            // Style Variations: Generate multiple creative styles (anime, asian, western, 3d, realistic)
            console.log('🎨✨ Mode: Style Variations (Multiple Styles)');
            
            // Get base prompts from analysis
            const analysisPrompts = (creative.analysis as any).imageGenerationPrompts || {};
            const baseCharacterPrompt = analysisPrompts.character || 'portrait of person with surprised expression';
            const baseBackgroundPrompt = analysisPrompts.background || generateBackgroundPrompt(creative.analysis?.design || null);
            
            console.log('🎭 Generating 5 style variations...');
            
            // Generate ALL style variations
            const generatedVariants: string[] = [];
            
            for (let i = 0; i < STYLE_VARIANTS.length; i++) {
              const styleVariant = STYLE_VARIANTS[i];
              console.log(`\n${i + 1}/${STYLE_VARIANTS.length} 🎨 Generating ${styleVariant.emoji} ${styleVariant.name}...`);
              
              // Apply style modifiers
              const styledCharacterPrompt = applyStyleToCharacterPrompt(baseCharacterPrompt, styleVariant.id);
              const styledBackgroundPrompt = applyStyleToBackgroundPrompt(baseBackgroundPrompt, styleVariant.id);
              
              // For anime style, extract character and composite over original background
              if (styleVariant.id === 'anime') {
                // Generate anime character
                console.log('👤 Generating anime character...');
                const animeCharacterPrompt = `${styledCharacterPrompt}, isolated character on white background, transparent background style`;
                const animeCharBuffer = await generateBackground({
                  stylePreset: 'anime',
                  prompt: animeCharacterPrompt,
                  width: metadata.width,
                  height: metadata.height,
                });
                
                // Composite over original background (keep cosmic stars, etc)
                bgBuffer = originalBuffer; // Use original background
                const styledBuffer = await renderCreative(
                  creative.analysis.layout!,
                  finalTexts,
                  bgBuffer
                );
                
                // Upload anime variant
                const animePath = `style-variations/${creativeId}_anime_${Date.now()}.png`;
                await uploadFile('generated-creatives', animePath, styledBuffer, 'image/png');
                const animeUrl = getPublicUrl('generated-creatives', animePath);
                generatedVariants.push(animeUrl);
                console.log(`✅ Anime style complete: ${animeUrl}`);
              } else {
                // For other styles, generate full scene
                console.log(`🌈 Generating ${styleVariant.name} background...`);
                const styledBgBuffer = await generateBackground({
                  stylePreset: styleVariant.id as any,
                  prompt: styledBackgroundPrompt,
                  width: metadata.width,
                  height: metadata.height,
                });
                
                // Render text over styled background
                const styledBuffer = await renderCreative(
                  creative.analysis.layout!,
                  finalTexts,
                  styledBgBuffer
                );
                
                // Upload variant
                const variantPath = `style-variations/${creativeId}_${styleVariant.id}_${Date.now()}.png`;
                await uploadFile('generated-creatives', variantPath, styledBuffer, 'image/png');
                const variantUrl = getPublicUrl('generated-creatives', variantPath);
                generatedVariants.push(variantUrl);
                console.log(`✅ ${styleVariant.name} complete: ${variantUrl}`);
              }
              
              // Small delay between generations to avoid rate limits
              if (i < STYLE_VARIANTS.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            console.log(`\n🎉 All ${STYLE_VARIANTS.length} style variations generated!`);
            console.log('Generated URLs:', generatedVariants);
            
            // Store all variants in generated_image_url (last one)
            // In the future, we could create a separate table for style_variations
            bgBuffer = originalBuffer; // Use original for final render
            
            break;
          }

          default: {
            // Fallback to simple overlay
            console.log('⚠️ Unknown copyMode, falling back to simple overlay');
            bgBuffer = originalBuffer;
          }
        }

        // Render text over background
        console.log('📝 Rendering text overlay...');
        const finalBuffer = await renderCreative(
          creative.analysis.layout!,
          finalTexts,
          bgBuffer
        );

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

