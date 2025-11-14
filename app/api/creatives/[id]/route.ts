import { NextResponse } from 'next/server';
import { getCreativeById, getCreativeAnalysis, getCreativeVariants } from '@/lib/db';
import { getPublicUrl } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const creativeId = params.id;

    const creative = await getCreativeById(creativeId);
    if (!creative) {
      return NextResponse.json(
        { error: 'Creative not found' },
        { status: 404 }
      );
    }

    const analysis = await getCreativeAnalysis(creativeId);
    const variants = await getCreativeVariants(creativeId);

    // Add public URLs
    const creativeWithUrl = {
      ...creative,
      imageUrl: getPublicUrl('creatives', creative.source_image_path),
    };

    const variantsWithUrls = variants.map((variant) => ({
      ...variant,
      renderedUrl: getPublicUrl('renders', variant.rendered_path),
      backgroundUrl: variant.background_path
        ? getPublicUrl('backgrounds', variant.background_path)
        : null,
    }));

    return NextResponse.json({
      creative: creativeWithUrl,
      analysis,
      variants: variantsWithUrls,
    });
  } catch (error) {
    console.error('Error fetching creative:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creative' },
      { status: 500 }
    );
  }
}

