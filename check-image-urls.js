const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔍 Проверяем image_url в competitor_creatives...\n');
  
  const { data, error } = await supabase
    .from('competitor_creatives')
    .select('id, competitor_name, image_url')
    .limit(5);
  
  if (error) {
    console.log('❌ Ошибка:', error.message);
    return;
  }
  
  console.log('📋 Первые 5 записей:\n');
  data.forEach((item, i) => {
    console.log(`${i + 1}. ID: ${item.id}`);
    console.log(`   Competitor: ${item.competitor_name}`);
    console.log(`   image_url: ${item.image_url ? 'OK' : '❌ NULL'}`);
    if (item.image_url) {
      console.log(`   URL: ${item.image_url.substring(0, 100)}...`);
    }
    console.log('');
  });
  
  // Проверяем сколько null
  const { data: all, error: allError } = await supabase
    .from('competitor_creatives')
    .select('image_url');
  
  if (!allError && all) {
    const withUrl = all.filter(c => c.image_url).length;
    const withoutUrl = all.filter(c => !c.image_url).length;
    
    console.log('📊 Статистика:');
    console.log(`  ✅ С image_url: ${withUrl}`);
    console.log(`  ❌ Без image_url: ${withoutUrl}`);
    console.log(`  📝 Всего: ${all.length}`);
  }
})();
