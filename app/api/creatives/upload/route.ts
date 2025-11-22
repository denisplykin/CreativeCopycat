import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('📤 File upload request received');

    // Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const competitorName = formData.get('competitor_name') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`📁 File received: ${file.name} (${file.size} bytes)`);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'png';
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = `original/${fileName}`;

    console.log(`💾 Uploading to Supabase Storage: ${filePath}`);

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('creatives')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ File uploaded to storage:', uploadData.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('creatives')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('🔗 Public URL:', publicUrl);

    // Create creative record in competitor_creatives table
    const { data: creative, error: dbError } = await supabase
      .from('competitor_creatives')
      .insert({
        competitor_name: competitorName || 'My Upload',
        image_url: publicUrl,
        active_days: 0,
        ad_id: null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      // Try to delete uploaded file
      await supabase.storage.from('creatives').remove([filePath]);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Creative created:', creative.id);

    return NextResponse.json({ creative }, { status: 201 });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

