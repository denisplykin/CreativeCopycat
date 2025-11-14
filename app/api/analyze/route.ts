import { NextResponse } from 'next/server';
import { getCreativeById, updateCreativeStatus, updateCreativeAnalysis, createRun } from '@/lib/db';
import { runOCR, extractDominantColors, detectLanguage, calculateAspectRatio } from '@/lib/ocr';
import { extractRoles } from '@/lib/llm';
import { generateLayout } from '@/lib/render';
import type { AnalyzeRequest, AnalyzeResponse, AnalysisData } from '@/types/creative';

export async function POST(request: Request) {
  const startTime = Date.now();
  
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

    // Update status to analyzing
    await updateCreativeStatus(creativeId, 'analyzing');

    // Download image from URL
    const imageResponse = await fetch(creative.original_image_url);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image from URL');
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Determine image dimensions
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1080;

    // Run OCR
    const ocrResult = await runOCR(imageBuffer);

    // Extract text roles using LLM
    const rolesJson = await extractRoles(ocrResult.fullText);

    // Generate layout
    const layoutJson = generateLayout(
      ocrResult.blocks,
      width,
      height
    );

    // Extract colors
    const dominantColors = await extractDominantColors(imageBuffer);

    // Detect language
    const language = detectLanguage(ocrResult.fullText);

    // Calculate aspect ratio
    const aspectRatio = calculateAspectRatio(width, height);

    // Prepare analysis data
    const analysis: AnalysisData = {
      ocr: ocrResult,
      layout: layoutJson,
      roles: rolesJson.roles,
      dominant_colors: dominantColors,
      language,
      aspect_ratio: aspectRatio,
    };

    // Save analysis
    await updateCreativeAnalysis(creativeId, analysis);

    // Log run
    const latency = Date.now() - startTime;
    await createRun(
      { creativeId, action: 'analyze' },
      { analysis },
      'success',
      latency
    );

    // Get updated creative
    const updatedCreative = await getCreativeById(creativeId);

    const response: AnalyzeResponse = {
      creative: updatedCreative!,
      analysis,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing creative:', error);
    
    // Log failed run
    const latency = Date.now() - startTime;
    try {
      await createRun(
        { creativeId: request.url },
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'failed',
        latency
      );
    } catch (logError) {
      console.error('Failed to log error run:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to analyze creative' },
      { status: 500 }
    );
  }
}
