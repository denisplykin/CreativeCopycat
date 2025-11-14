import { NextResponse } from 'next/server';
import { getCreatives } from '@/lib/db';
import { getPublicUrl } from '@/lib/supabase';

export async function GET() {
  try {
    const creatives = await getCreatives();

    // Add public URLs for images
    const creativesWithUrls = creatives.map((creative) => ({
      ...creative,
      imageUrl: getPublicUrl('creatives', creative.source_image_path),
    }));

    return NextResponse.json({ creatives: creativesWithUrls });
  } catch (error) {
    console.error('Error fetching creatives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creatives' },
      { status: 500 }
    );
  }
}

