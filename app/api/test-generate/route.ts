import { NextRequest, NextResponse } from 'next/server';
import { generateMaskEdit } from '@/lib/openai-image';
import { uploadFile, getPublicUrl } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];

  const addLog = (message: string) => {
    console.log(message);
    logs.push(message);
  };

  try {
    const mode = request.headers.get('X-Generation-Mode') as 'mask_edit';
    
    if (!mode || mode !== 'mask_edit') {
      return NextResponse.json(
        { error: 'Invalid generation mode. Only mask_edit is supported.' },
        { status: 400 }
      );
    }

    addLog(`🎭 Mode: Mask Edit`);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    addLog(`📁 File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Get modifications from form data
    const modifications = (formData.get('modifications') as string) || 
      'Replace the main character with a confident 25-year-old Indonesian woman. Update brand names to Algonova.';
    
    addLog(`🔧 Modifications: ${modifications}`);
    addLog(`🎭 Starting mask-based editing pipeline...`);

    const resultBuffer = await generateMaskEdit({
      imageBuffer,
      modifications,
      editTypes: ['character', 'logo'], // Default: edit character and logo
      aspectRatio: '9:16',
    });

    addLog(`✅ Mask edit complete: ${resultBuffer.length} bytes`);

    // Upload to Supabase
    addLog(`📤 Uploading to storage...`);
    const filename = `test/${mode}_${Date.now()}.png`;
    await uploadFile('generated-creatives', filename, resultBuffer, 'image/png');
    const imageUrl = getPublicUrl('generated-creatives', filename);
    
    addLog(`✅ Upload complete: ${imageUrl}`);

    const duration = Date.now() - startTime;
    addLog(`⏱️ Total time: ${(duration / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      imageUrl,
      logs,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    addLog(`❌ Error: ${errorMessage}`);
    console.error('Test generation error:', error);

    return NextResponse.json(
      {
        error: errorMessage,
        logs,
        duration,
      },
      { status: 500 }
    );
  }
}

