import { NextResponse } from 'next/server';
import { getCreatives, createCreative } from '@/lib/db';

export async function GET() {
  try {
    const creatives = await getCreatives();
    return NextResponse.json({ creatives });
  } catch (error) {
    console.error('Error fetching creatives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creatives' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { original_image_url, competitor_name } = body;

    if (!original_image_url) {
      return NextResponse.json(
        { error: 'original_image_url is required' },
        { status: 400 }
      );
    }

    const creative = await createCreative(original_image_url, competitor_name);
    return NextResponse.json({ creative }, { status: 201 });
  } catch (error) {
    console.error('Error creating creative:', error);
    return NextResponse.json(
      { error: 'Failed to create creative' },
      { status: 500 }
    );
  }
}
