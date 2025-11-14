import { NextResponse } from 'next/server';
import { getCreativeById, upsertCreativeAnalysis } from '@/lib/db';
import { downloadFile } from '@/lib/supabase';
import { runOCR, extractDominantColors, detectLanguage, calculateAspectRatio } from '@/lib/ocr';
import { extractRoles } from '@/lib/llm';
import { generateLayout } from '@/lib/render';
import type { AnalyzeRequest, AnalyzeResponse } from '@/types/creative';

export async function POST(request: Request) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { creativeId } = body;

    // Get creative
    const creative = await getCreativeById(creativeId);
    if (!creative) {
      return NextResponse.json(
        { error: 'Creative not found' },
        { status: 404 }
      );
    }

    // Download image
    const imageBuffer = await downloadFile('creatives', creative.source_image_path);

    // Run OCR
    const ocrResult = await runOCR(imageBuffer);

    // Extract text roles using LLM
    const rolesJson = await extractRoles(ocrResult.fullText);

    // Generate layout
    const layoutJson = generateLayout(
      ocrResult.blocks,
      creative.width,
      creative.height
    );

    // Extract colors
    const dominantColors = await extractDominantColors(imageBuffer);

    // Detect language
    const language = detectLanguage(ocrResult.fullText);

    // Calculate aspect ratio
    const aspectRatio = calculateAspectRatio(creative.width, creative.height);

    // Save analysis
    const analysisId = await upsertCreativeAnalysis(
      creativeId,
      ocrResult,
      layoutJson,
      rolesJson.roles,
      dominantColors,
      language,
      aspectRatio
    );

    const analysis = {
      id: analysisId,
      creative_id: creativeId,
      ocr_json: ocrResult,
      layout_json: layoutJson,
      roles_json: rolesJson.roles,
      dominant_colors: dominantColors,
      language,
      aspect_ratio: aspectRatio,
      analyzed_at: new Date().toISOString(),
    };

    const response: AnalyzeResponse = {
      analysisId,
      analysis,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing creative:', error);
    return NextResponse.json(
      { error: 'Failed to analyze creative' },
      { status: 500 }
    );
  }
}

