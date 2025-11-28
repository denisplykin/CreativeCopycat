import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Disable caching for this route - we need fresh data every time
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('📊 GET /api/runs - Fetching runs...');
    const supabase = supabaseAdmin;

    // Fetch all runs (without JOIN since we removed foreign key)
    const { data: runs, error } = await supabase
      .from('creative_runs')
      .select(`
        id,
        creative_id,
        generation_type,
        copy_mode,
        config,
        status,
        created_at,
        result_url
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Supabase error:', error.message);
      throw error;
    }

    console.log(`✅ Found ${runs?.length || 0} runs`);

    // Enrich runs with creative info from competitor_creatives
    const enrichedRuns = await Promise.all(
      (runs || []).map(async (run) => {
        try {
          // Try to get creative from competitor_creatives first
          const { data: creative } = await supabase
            .from('competitor_creatives')
            .select('competitor_name, image_url')
            .eq('id', run.creative_id)
            .single();

          return {
            ...run,
            creative: creative ? {
              competitor_name: creative.competitor_name,
              original_image_url: creative.image_url,
            } : null,
            progress: run.status === 'running' ? Math.floor(Math.random() * 100) : undefined,
          };
        } catch (err) {
          // If not found in competitor_creatives, return without creative info
          return {
            ...run,
            creative: null,
            progress: run.status === 'running' ? Math.floor(Math.random() * 100) : undefined,
          };
        }
      })
    );

    if (enrichedRuns.length > 0) {
      console.log('📋 First run:', JSON.stringify(enrichedRuns[0], null, 2));
    }

    return NextResponse.json(
      { runs: enrichedRuns },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('❌ Get runs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch runs' },
      { status: 500 }
    );
  }
}

