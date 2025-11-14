import { NextResponse } from 'next/server';
import { getCreativeById, updateCreativeStatus, updateGeneratedUrls, createRun } from '@/lib/db';
import { uploadFile, getPublicUrl } from '@/lib/supabase';
import { generateTexts, generateImagePrompt } from '@/lib/llm';
import { generateBackground } from '@/lib/dalle';
import { renderCreative } from '@/lib/render';
import type { GenerateRequest, GenerateResponse } from '@/types/creative';

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const body: GenerateRequest = await request.json();
    const {
      creativeId,
      generationType,
      stylePreset = 'original',
      texts,
      llmModel,
      temperature,
      language = 'en',
    } = body;

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
        // Generate new texts if not provided
        let finalTexts = texts || {};
        if (!texts || Object.keys(texts).length === 0) {
          if (creative.analysis.roles && creative.analysis.roles.length > 0) {
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

        // Generate background
        const prompt = generateImagePrompt(stylePreset, undefined, 'with space for text overlay');
        const bgBuffer = await generateBackground({
          stylePreset,
          prompt,
          width: 1080,
          height: 1080,
        });

        // Render text over background (for MVP just returns background)
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
    
    // Log failed run
    const latency = Date.now() - startTime;
    try {
      await createRun(
        { request: body },
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'failed',
        latency
      );
    } catch (logError) {
      console.error('Failed to log error run:', logError);
    }

    // Update status to failed
    try {
      const body: GenerateRequest = await request.json();
      if (body.creativeId) {
        await updateCreativeStatus(
          body.creativeId,
          'failed',
          error instanceof Error ? error.message : 'Generation failed'
        );
      }
    } catch {}

    return NextResponse.json(
      { error: 'Failed to generate', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

