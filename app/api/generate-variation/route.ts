import { NextResponse } from 'next/server';
import { getCreativeById, getCreativeAnalysis, createCreativeVariant } from '@/lib/db';
import { downloadFile, uploadFile, getPublicUrl } from '@/lib/supabase';
import { renderCreative } from '@/lib/render';
import { generateTexts, generateImagePrompt } from '@/lib/llm';
import { generateBackground } from '@/lib/dalle';
import type { GenerateVariationRequest, GenerateVariationResponse } from '@/types/creative';

export async function POST(request: Request) {
  try {
    const body: GenerateVariationRequest = await request.json();
    const {
      creativeId,
      variantType,
      stylePreset = 'original',
      language = 'en',
      niche,
      llmModel,
      temperature,
    } = body;

    // Get creative and analysis
    const creative = await getCreativeById(creativeId);
    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    const analysis = await getCreativeAnalysis(creativeId);
    if (!analysis) {
      return NextResponse.json(
        { error: 'Creative not analyzed yet. Run analysis first.' },
        { status: 400 }
      );
    }

    let finalTexts: Record<string, string> = {};
    let backgroundBuffer: Buffer;
    let backgroundPath: string | null = null;

    // Process based on variant type
    switch (variantType) {
      case 'variation_text': {
        // Generate new texts, keep original background
        const generated = await generateTexts(
          analysis.roles_json,
          niche,
          language,
          llmModel,
          temperature
        );
        finalTexts = generated.texts;

        backgroundBuffer = await downloadFile('creatives', creative.source_image_path);
        break;
      }

      case 'variation_style': {
        // Generate new background with different style, keep texts
        const prompt = generateImagePrompt(
          stylePreset,
          niche,
          'empty space for text overlay, no text'
        );

        backgroundBuffer = await generateBackground({
          stylePreset,
          prompt,
          width: creative.width,
          height: creative.height,
        });

        // Upload background
        const bgPath = `backgrounds/${creativeId}_style_${stylePreset}_${Date.now()}.png`;
        await uploadFile('backgrounds', bgPath, backgroundBuffer, 'image/png');
        backgroundPath = bgPath;

        // Keep original texts
        analysis.roles_json.forEach((role) => {
          finalTexts[role.role] = role.text;
        });
        break;
      }

      case 'variation_structure': {
        // Complete regeneration: new texts + new background
        const generated = await generateTexts(
          analysis.roles_json,
          niche,
          language,
          llmModel,
          temperature
        );
        finalTexts = generated.texts;

        const prompt = generateImagePrompt(
          stylePreset,
          niche,
          'empty space for text overlay, no text'
        );

        backgroundBuffer = await generateBackground({
          stylePreset,
          prompt,
          width: creative.width,
          height: creative.height,
        });

        // Upload background
        const bgPath = `backgrounds/${creativeId}_structure_${stylePreset}_${Date.now()}.png`;
        await uploadFile('backgrounds', bgPath, backgroundBuffer, 'image/png');
        backgroundPath = bgPath;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid variant type' }, { status: 400 });
    }

    // Render text over background
    const renderedBuffer = await renderCreative(
      analysis.layout_json,
      finalTexts,
      backgroundBuffer
    );

    // Upload rendered image
    const renderedPath = `renders/${creativeId}_${variantType}_${Date.now()}.png`;
    await uploadFile('renders', renderedPath, renderedBuffer, 'image/png');

    // Create variant record
    const variant = await createCreativeVariant(
      creativeId,
      analysis.id,
      variantType,
      stylePreset,
      language,
      backgroundPath,
      renderedPath,
      {
        texts: finalTexts,
        meta: {
          llm_model: llmModel,
          temperature,
          niche,
        },
      },
      null // copy_mode is null for variations
    );

    const response: GenerateVariationResponse = {
      variantId: variant.id,
      imageUrl: getPublicUrl('renders', renderedPath),
      variant,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating variation:', error);
    return NextResponse.json(
      { error: 'Failed to generate variation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

