import { supabaseAdmin } from './supabase';
import type {
  Creative,
  AnalysisData,
  Pattern,
  Run,
} from '@/types/creative';

/**
 * Get all creatives
 */
export async function getCreatives(): Promise<Creative[]> {
  // Используем подзапрос для получения DISTINCT по image_url
  // Для каждого уникального image_url берем последнюю запись (MAX id)
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

  console.log(`📊 Loaded ${data?.length || 0} records, after dedup: ${uniqueData.length}`);

  // Маппинг из competitor_creatives в формат Creative
  return uniqueData.map((item: any) => ({
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
}

/**
 * Get creative by ID
 */
export async function getCreativeById(id: string): Promise<Creative | null> {
  const { data, error } = await supabaseAdmin
    .from('creatives')
    .select('*')
    .eq('id', id)
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
