const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔍 Проверяем подключение к проекту...\n');
  console.log(`📦 Project ID: osokxlweresllgbclkme`);
  console.log(`🌐 URL: ${supabaseUrl}\n`);
  
  // Проверяем таблицы
  console.log('📋 Проверяем таблицы:\n');
  
  const tables = [
    'competitor_creatives',
    'creatives', 
    'patterns',
    'creative_runs'
  ];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`  ❌ ${table}: не найдена или нет доступа`);
    } else {
      console.log(`  ✅ ${table}: ${count} записей`);
    }
  }
  
  // Проверяем Storage
  console.log('\n\n📦 Проверяем Storage buckets:\n');
  
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.log('  ❌ Ошибка доступа к Storage');
  } else {
    buckets.forEach(bucket => {
      console.log(`  ✅ ${bucket.name} (public: ${bucket.public})`);
    });
  }
  
  console.log('\n\n✨ Проект подключен успешно!');
})();
