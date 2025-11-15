import { NextResponse } from 'next/server';
import { getCreativeById, updateCreativeStatus, updateCreativeAnalysis, createRun } from '@/lib/db';
import { runOCR, extractDominantColors, extractImageMetadata } from '@/lib/ocr';
import { analyzeCreativeDesign } from '@/lib/design-analysis';
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

    // Extract image metadata
    const imageMetadata = await extractImageMetadata(imageBuffer);
    const { width, height } = imageMetadata;

    console.log(`📐 Image size: ${width}x${height}`);

    // Run OCR
    console.log('🔍 Running OCR...');
    const ocrResult = await runOCR(imageBuffer);
    console.log(`✅ OCR complete: ${ocrResult.blocks.length} text blocks, confidence: ${(ocrResult.confidence! * 100).toFixed(1)}%`);

    // Extract text roles using LLM
    console.log('🤖 Extracting text roles with LLM...');
    const rolesJson = await extractRoles(ocrResult.fullText);
    console.log(`✅ Roles extracted: ${rolesJson.roles.length} roles`);

    // Full design analysis (background, characters, graphics, colors, typography)
    console.log('🎨 Running full design analysis...');
    const designAnalysis = await analyzeCreativeDesign(imageBuffer);
    console.log(`✅ Design analysis complete!`);

    // Convert OCR blocks to new mask-based layout format
    const layoutJson = {
      image_size: { width, height },
      background: {
        color: designAnalysis.color_palette.background_colors?.[0] || '#FFFFFF',
        description: designAnalysis.background?.description || 'Solid background',
      },
      elements: ocrResult.blocks.map((block, idx) => ({
        id: `text_${idx}`,
        type: 'text' as const,
        role: 'body' as const,
        text: block.text,
        subtext: null,
        font_style: 'normal sans-serif',
        color: '#000000',
        description: null,
        bbox: block.bbox,
        z_index: idx + 1,
      })),
    };

    // Extract dominant colors from color palette
    const dominantColors = [
      designAnalysis.color_palette.primary,
      ...(designAnalysis.color_palette.accent || []),
      designAnalysis.color_palette.secondary,
    ].filter(Boolean) as string[];

    // Calculate aspect ratio
    const aspectRatio = `${width}x${height}`;
    const ratio = width / height;
    const ratioLabel = ratio > 1.5 ? 'landscape' : ratio < 0.7 ? 'portrait' : 'square';

    // Prepare analysis data (will be saved to Supabase JSONB field)
    const analysis: AnalysisData = {
      // Text analysis
      ocr: ocrResult,
      roles: rolesJson.roles,
      language: ocrResult.language || 'en',
      
      // Layout
      layout: layoutJson,
      
      // Design analysis
      design: designAnalysis,
      
      // Colors
      dominant_colors: dominantColors.slice(0, 5), // Top 5 colors
      
      // Metadata
      aspect_ratio: `${aspectRatio} (${ratioLabel})`,
      
      // Full description
      description: designAnalysis.description,
    };

    console.log('💾 Saving analysis to Supabase...');

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
