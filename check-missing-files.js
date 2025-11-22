const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔍 Проверяем image_url в БД...\n');
  
  const { data: creatives, error } = await supabase
    .from('competitor_creatives')
    .select('id, competitor_name, image_url')
    .limit(10);
  
  if (error) {
    console.log('❌ Ошибка:', error.message);
    return;
  }
  
  console.log('📋 Примеры image_url:\n');
  
  creatives.slice(0, 3).forEach((c, i) => {
    if (c.image_url) {
      const isSupabase = c.image_url.includes('supabase.co/storage');
      const urlType = isSupabase ? '📦 Supabase Storage' : '🌐 Внешний URL';
      console.log(`${i + 1}. ${c.competitor_name}`);
      console.log(`   ${urlType}`);
      console.log(`   ${c.image_url}`);
      console.log('');
    }
  });
  
  // Проверяем сколько каких
  const { data: allCreatives, error: allError } = await supabase
    .from('competitor_creatives')
    .select('image_url');
  
  if (!allError) {
    const withUrl = allCreatives.filter(c => c.image_url).length;
    const withoutUrl = allCreatives.filter(c => !c.image_url).length;
    const supabaseUrls = allCreatives.filter(c => c.image_url && c.image_url.includes('supabase.co/storage')).length;
    const externalUrls = allCreatives.filter(c => c.image_url && !c.image_url.includes('supabase.co/storage')).length;
    
    console.log('📊 Статистика:');
    console.log(`  📦 Supabase Storage URLs: ${supabaseUrls}`);
    console.log(`  🌐 External URLs: ${externalUrls}`);
    console.log(`  ❌ Без URL: ${withoutUrl}`);
    console.log(`  📝 Всего: ${allCreatives.length}`);
  }
})();
