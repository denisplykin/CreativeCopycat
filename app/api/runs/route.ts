import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('📊 GET /api/runs - Fetching runs...');
    const supabase = supabaseAdmin;

    // Fetch all runs with creative info
    const { data: runs, error } = await supabase
      .from('creative_runs')
      .select(`
        id,
        creative_id,
        generation_type,
        copy_mode,
        status,
        created_at,
        result_url,
        creative:creatives (
          competitor_name,
          original_image_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Supabase error:', error.message);
      throw error;
    }

    console.log(`✅ Found ${runs?.length || 0} runs`);
    if (runs && runs.length > 0) {
      console.log('📋 First run:', JSON.stringify(runs[0], null, 2));
    }

    // Calculate progress for running items (mock for now)
    const runsWithProgress = (runs || []).map((run) => ({
      ...run,
      progress: run.status === 'running' ? Math.floor(Math.random() * 100) : undefined,
    }));

    return NextResponse.json({ runs: runsWithProgress });
  } catch (error: any) {
    console.error('❌ Get runs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch runs' },
      { status: 500 }
    );
  }
}

