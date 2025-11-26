import { supabaseAdmin } from './supabase';
import type {
  Creative,
  AnalysisData,
  Pattern,
  Run,
} from '@/types/creative';

/**
 * Get all creatives
 * Includes both competitor creatives AND completed generated creatives from creative_runs
 */
export async function getCreatives(): Promise<Creative[]> {
  // 1. Fetch from competitor_creatives (uploaded + competitor data + auto-saved generated)
  const { data, error } = await supabaseAdmin
    .from('competitor_creatives')
    .select('*')
    .not('image_url', 'is', null) // ✅ Только с изображениями
    .order('created_at', { ascending: false })
    .limit(10000); // Увеличиваем лимит для отображения всех креативов

  if (error) {
    throw new Error(`Failed to fetch creatives: ${error.message}`);
  }

  // Дедупликация на клиенте по image_url (берем первое вхождение)
  const seen = new Set<string>();
  const uniqueData = (data || []).filter((item: any) => {
    if (seen.has(item.image_url)) {
      return false;
    }
    seen.add(item.image_url);
    return true;
  });

  console.log(`📊 Loaded ${data?.length || 0} competitor_creatives records, after dedup: ${uniqueData.length}`);

  // Маппинг из competitor_creatives в формат Creative
  const competitorCreatives = uniqueData.map((item: any) => ({
    id: item.id.toString(),
    competitor_name: item.competitor_name,
    original_image_url: item.image_url, // Маппинг image_url -> original_image_url
    active_days: item.active_days || 0, // ✅ Добавляем active_days из базы
    ad_id: item.ad_id, // ✅ Добавляем ad_id
    analysis: null,
    generated_character_url: null,
    generated_background_url: null,
    generated_image_url: null,
    figma_file_id: null,
    status: 'pending' as const,
    error_message: null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  // 2. Fetch completed runs from creative_runs that are NOT already in competitor_creatives
  // (These are old generations before auto-save was implemented)
  const { data: runsData, error: runsError } = await supabaseAdmin
    .from('creative_runs')
    .select('*')
    .eq('status', 'completed')
    .not('result_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (runsError) {
    console.error('⚠️ Failed to fetch creative_runs:', runsError.message);
  }

  // Filter out runs that are already in competitor_creatives (by result_url)
  const competitorUrls = new Set(uniqueData.map((item: any) => item.image_url));
  const uniqueRuns = (runsData || []).filter((run: any) => {
    return !competitorUrls.has(run.result_url) && !seen.has(run.result_url);
  });

  console.log(`📊 Found ${runsData?.length || 0} completed runs, ${uniqueRuns.length} unique (not in competitor_creatives)`);

  // Map runs to Creative format (as "My Creatives" with generated badge)
  const generatedCreatives = uniqueRuns.map((run: any) => {
    seen.add(run.result_url); // Track to avoid duplicates
    return {
      id: `run_${run.id}`, // Prefix with 'run_' to distinguish from competitor_creatives
      competitor_name: 'My Creatives',
      original_image_url: run.result_url,
      active_days: 0,
      ad_id: `gen_${run.created_at}`, // Mark as generated
      analysis: null,
      generated_character_url: null,
      generated_background_url: null,
      generated_image_url: null,
      figma_file_id: null,
      status: 'completed' as const,
      error_message: null,
      created_at: run.created_at,
      updated_at: run.updated_at || run.created_at,
    };
  });

  // Combine both sources
  const allCreatives = [...competitorCreatives, ...generatedCreatives];
  console.log(`📊 Total creatives: ${allCreatives.length} (${competitorCreatives.length} from competitor_creatives + ${generatedCreatives.length} from creative_runs)`);

  return allCreatives;
}

/**
 * Get creative by ID
 * Supports both competitor_creatives IDs (integer) and creative_runs IDs (run_{uuid})
 */
export async function getCreativeById(id: string | number): Promise<Creative | null> {
  // ✅ Ensure id is a string (might come as number from frontend)
  const idStr = String(id);
  
  // Check if this is a creative_run ID (format: run_{uuid})
  if (idStr.startsWith('run_')) {
    const runId = idStr.replace('run_', '');
    const { data: runData, error: runError } = await supabaseAdmin
      .from('creative_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runData && runData.result_url) {
      // Map creative_run to Creative format
      return {
        id: `run_${runData.id}`,
        competitor_name: 'My Creatives',
        original_image_url: runData.result_url,
        active_days: 0,
        ad_id: `gen_${runData.created_at}`,
        analysis: null,
        generated_character_url: null,
        generated_background_url: null,
        generated_image_url: null,
        figma_file_id: null,
        status: 'completed' as const,
        error_message: null,
        created_at: runData.created_at,
        updated_at: runData.updated_at || runData.created_at,
      };
    }
  }

  // ✅ Ищем в competitor_creatives (integer ID or string)
  const { data: competitorData, error: competitorError } = await supabaseAdmin
    .from('competitor_creatives')
    .select('*')
    .eq('id', idStr)
    .single();

  if (competitorData) {
    // Маппинг из competitor_creatives в формат Creative
    return {
      id: competitorData.id.toString(),
      competitor_name: competitorData.competitor_name,
      original_image_url: competitorData.image_url,
      active_days: competitorData.active_days || 0,
      ad_id: competitorData.ad_id,
      analysis: null, // competitor_creatives не хранит analysis
      generated_character_url: null,
      generated_background_url: null,
      generated_image_url: null,
      figma_file_id: null,
      status: 'pending' as const,
      error_message: null,
      created_at: competitorData.created_at,
      updated_at: competitorData.updated_at,
    };
  }

  // Fallback: если не найдено в competitor_creatives, проверяем старую таблицу
  const { data, error } = await supabaseAdmin
    .from('creatives')
    .select('*')
    .eq('id', idStr)
    .single();

  if (error) {
    console.error(`Failed to fetch creative: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Create new creative
 */
export async function createCreative(
  original_image_url: string,
  competitor_name?: string
): Promise<Creative> {
  const { data, error} = await supabaseAdmin
    .from('creatives')
    .insert({
      original_image_url,
      competitor_name,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create creative: ${error.message}`);
  }

  return data;
}

/**
 * Update creative status
 */
export async function updateCreativeStatus(
  id: string,
  status: Creative['status'],
  error_message?: string
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (error_message) {
    updateData.error_message = error_message;
  }

  const { error } = await supabaseAdmin
    .from('creatives')
    .update(updateData)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update creative status: ${error.message}`);
  }
}

/**
 * Update creative analysis
 */
export async function updateCreativeAnalysis(
  id: string,
  analysis: AnalysisData
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('creatives')
    .update({
      analysis,
      status: 'completed', // Must be 'completed', not 'analyzed' (constraint check)
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update analysis: ${error.message}`);
  }
}

/**
 * Update generated URLs
 */
export async function updateGeneratedUrls(
  id: string,
  updates: {
    generated_character_url?: string;
    generated_background_url?: string;
    generated_image_url?: string;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('creatives')
    .update({
      ...updates,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update generated URLs: ${error.message}`);
  }
}

/**
 * Get all patterns
 */
export async function getPatterns(): Promise<Pattern[]> {
  const { data, error } = await supabaseAdmin
    .from('patterns')
    .select('*')
    .order('inserted_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch patterns: ${error.message}`);
  }

  return data || [];
}

/**
 * Get pattern by ID
 */
export async function getPatternById(pattern_id: string): Promise<Pattern | null> {
  const { data, error } = await supabaseAdmin
    .from('patterns')
    .select('*')
    .eq('pattern_id', pattern_id)
    .single();

  if (error) {
    console.error(`Failed to fetch pattern: ${error.message}`);
    return null;
  }

  return data;
}

/**
 * Create run log
 */
export async function createRun(
  input: any,
  output: any,
  status: string,
  latency_ms?: number
): Promise<Run> {
  const { data, error } = await supabaseAdmin
    .from('runs')
    .insert({
      input,
      output,
      status,
      latency_ms,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create run: ${error.message}`);
  }

  return data;
}

/**
 * Create creative run (for generation history)
 */
export async function createCreativeRun(params: {
  creative_id: string;
  generation_type: string;
  copy_mode?: string;
  config?: any;
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('creative_runs')
    .insert({
      creative_id: params.creative_id,
      generation_type: params.generation_type,
      copy_mode: params.copy_mode,
      config: params.config,
      status: 'running',
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ Failed to create creative run:', error.message);
    throw new Error(`Failed to create creative run: ${error.message}`);
  }

  console.log('✅ Creative run created:', data.id);
  return data.id;
}

/**
 * Update creative run status and result
 */
export async function updateCreativeRun(
  runId: string,
  status: 'running' | 'completed' | 'failed',
  result_url?: string,
  error_message?: string
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
    if (result_url) {
      updateData.result_url = result_url;
    }
  }

  if (error_message) {
    updateData.error_message = error_message;
  }

  const { error } = await supabaseAdmin
    .from('creative_runs')
    .update(updateData)
    .eq('id', runId);

  if (error) {
    console.error('❌ Failed to update creative run:', error.message);
    throw new Error(`Failed to update creative run: ${error.message}`);
  }

  console.log(`✅ Creative run ${runId} updated: ${status}`);
}

/**
 * Get recent runs
 */
export async function getRecentRuns(limit: number = 10): Promise<Run[]> {
  const { data, error } = await supabaseAdmin
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch runs: ${error.message}`);
  }

  return data || [];
}
