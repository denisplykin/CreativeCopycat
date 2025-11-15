import { NextRequest, NextResponse } from 'next/server';
import { generateDalleSimple, generateCharacterSwap, generateOpenAI2Step } from '@/lib/openai-image';
import { uploadFile, getPublicUrl } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];

  const addLog = (message: string) => {
    console.log(message);
    logs.push(message);
  };

  try {
    const mode = request.headers.get('X-Generation-Mode') as 'dalle_simple' | 'character_swap' | 'openai_2step';
    
    if (!mode || !['dalle_simple', 'character_swap', 'openai_2step'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid generation mode' },
        { status: 400 }
      );
    }

    addLog(`🎨 Mode: ${mode}`);

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

    let resultBuffer: Buffer;

    // Generate based on mode
    switch (mode) {
      case 'dalle_simple': {
        const description = (formData.get('description') as string) || 'Modern tech education platform advertisement';
        addLog(`📝 Description: ${description}`);
        addLog(`🎨 Generating with DALL-E 3...`);
        
        resultBuffer = await generateDalleSimple({
          description,
          aspectRatio: '9:16',
        });
        
        addLog(`✅ DALL-E generation complete: ${resultBuffer.length} bytes`);
        break;
      }

      case 'character_swap': {
        addLog(`👧 Character swap: 25yo Indonesian woman...`);
        
        resultBuffer = await generateCharacterSwap({
          imageBuffer,
          aspectRatio: '9:16',
        });
        
        addLog(`✅ Character swap complete: ${resultBuffer.length} bytes`);
        break;
      }

      case 'openai_2step': {
        const modifications = (formData.get('modifications') as string) || 'Keep everything the same';
        addLog(`🤖 OpenAI 2-Step with modifications: ${modifications}`);
        
        resultBuffer = await generateOpenAI2Step({
          imageBuffer,
          modifications,
          aspectRatio: '9:16',
        });
        
        addLog(`✅ OpenAI 2-Step complete: ${resultBuffer.length} bytes`);
        break;
      }

      default:
        throw new Error('Invalid mode');
    }

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

