import { NextResponse } from 'next/server';
import { getCreativeById, getCreativeAnalysis, createCreativeVariant } from '@/lib/db';
import { downloadFile, uploadFile, getPublicUrl } from '@/lib/supabase';
import { renderCreative } from '@/lib/render';
import { generateTexts } from '@/lib/llm';
import { editImageWithMask, createTextMask, generateBackground } from '@/lib/dalle';
import { generateImagePrompt } from '@/lib/llm';
import type { GenerateCopyRequest, GenerateCopyResponse, CopyMode } from '@/types/creative';

export async function POST(request: Request) {
  try {
    const body: GenerateCopyRequest = await request.json();
    const {
      creativeId,
      copyMode,
      texts,
      stylePreset = 'original',
      llmModel,
      temperature,
      language = 'en',
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

    let finalTexts = texts || {};
    let backgroundBuffer: Buffer;
    let backgroundPath: string | null = null;

    // Process based on copy mode
    switch (copyMode as CopyMode) {
      case 'simple_overlay': {
        // Just use original image
        backgroundBuffer = await downloadFile('creatives', creative.source_image_path);

        // If no texts provided, use original texts from analysis
        if (!texts || Object.keys(texts).length === 0) {
          finalTexts = {};
          analysis.roles_json.forEach((role) => {
            finalTexts[role.role] = role.text;
          });
        }
        break;
      }

      case 'dalle_inpaint': {
        // Create mask from text bounding boxes
        const textBoxes = analysis.layout_json.elements
          .filter((el) => el.type === 'text')
          .map((el) => el.bbox);

        const mask = await createTextMask(creative.width, creative.height, textBoxes);

        // Download original image
        const originalImage = await downloadFile('creatives', creative.source_image_path);

        // Use DALL·E to inpaint (remove text)
        backgroundBuffer = await editImageWithMask({
          image: originalImage,
          mask,
          prompt: 'Same background, same composition, no text, clean background where text was',
        });

        // Upload cleaned background
        const bgPath = `backgrounds/${creativeId}_inpaint_${Date.now()}.png`;
        await uploadFile('backgrounds', bgPath, backgroundBuffer, 'image/png');
        backgroundPath = bgPath;

        // Generate texts if not provided
        if (!texts || Object.keys(texts).length === 0) {
          const generated = await generateTexts(
            analysis.roles_json,
            undefined,
            language,
            llmModel,
            temperature
          );
          finalTexts = generated.texts;
        }
        break;
      }

      case 'bg_regen': {
        // Generate new background with DALL·E
        const prompt = generateImagePrompt(
          stylePreset,
          undefined,
          'empty space for text overlay, no text'
        );

        backgroundBuffer = await generateBackground({
          stylePreset,
          prompt,
          width: creative.width,
          height: creative.height,
        });

        // Upload new background
        const bgPath = `backgrounds/${creativeId}_regen_${stylePreset}_${Date.now()}.png`;
        await uploadFile('backgrounds', bgPath, backgroundBuffer, 'image/png');
        backgroundPath = bgPath;

        // Generate texts if not provided
        if (!texts || Object.keys(texts).length === 0) {
          const generated = await generateTexts(
            analysis.roles_json,
            undefined,
            language,
            llmModel,
            temperature
          );
          finalTexts = generated.texts;
        }
        break;
      }

      case 'new_text_pattern': {
        // Generate new texts with LLM
        const generated = await generateTexts(
          analysis.roles_json,
          undefined,
          language,
          llmModel,
          temperature
        );
        finalTexts = generated.texts;

        // For MVP, use simple overlay (can be changed to dalle_inpaint)
        backgroundBuffer = await downloadFile('creatives', creative.source_image_path);
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid copy mode' }, { status: 400 });
    }

    // Render text over background
    const renderedBuffer = await renderCreative(
      analysis.layout_json,
      finalTexts,
      backgroundBuffer
    );

    // Upload rendered image
    const renderedPath = `renders/${creativeId}_${copyMode}_${Date.now()}.png`;
    await uploadFile('renders', renderedPath, renderedBuffer, 'image/png');

    // Create variant record
    const variant = await createCreativeVariant(
      creativeId,
      analysis.id,
      'copy',
      stylePreset,
      language,
      backgroundPath,
      renderedPath,
      {
        texts: finalTexts,
        meta: {
          llm_model: llmModel,
          temperature,
          copy_mode: copyMode,
        },
      },
      copyMode
    );

    const response: GenerateCopyResponse = {
      variantId: variant.id,
      imageUrl: getPublicUrl('renders', renderedPath),
      variant,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating copy:', error);
    return NextResponse.json(
      { error: 'Failed to generate copy', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

