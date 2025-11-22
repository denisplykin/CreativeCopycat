const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('📦 Проверяем доступные buckets...\n');
  
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  console.log(`✅ Найдено buckets: ${buckets.length}\n`);
  buckets.forEach((bucket, i) => {
    console.log(`${i+1}. ${bucket.name} (id: ${bucket.id})`);
    console.log(`   Public: ${bucket.public}`);
    console.log(`   Created: ${bucket.created_at}\n`);
  });
  
  // Проверим один URL из БД
  console.log('\n🔍 Проверяем URL из БД...\n');
  const { data: sample } = await supabase
    .from('competitor_creatives')
    .select('image_url')
    .limit(1)
    .single();
  
  if (sample && sample.image_url) {
    console.log('Пример URL:');
    console.log(sample.image_url);
    
    // Извлекаем bucket name из URL
    const match = sample.image_url.match(/\/storage\/v1\/object\/public\/([^\/]+)\//);
    if (match) {
      console.log(`\n📦 URL указывает на bucket: "${match[1]}"`);
    }
  }
})();

