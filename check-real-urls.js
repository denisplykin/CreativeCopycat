const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔍 Проверяем реальные URL из БД...\n');
  
  const { data, error } = await supabase
    .from('competitor_creatives')
    .select('competitor_name, image_url')
    .limit(5);
  
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  console.log('📸 Примеры URL из БД:\n');
  data.forEach((row, i) => {
    console.log(`${i+1}. ${row.competitor_name}`);
    console.log(`   ${row.image_url}\n`);
  });
  
  // Извлекаем имена папок из URL
  console.log('\n📁 Папки конкурентов из URL:\n');
  const folders = new Set();
  data.forEach(row => {
    if (row.image_url) {
      // Извлекаем путь после /competitor-creatives/
      const match = row.image_url.match(/\/competitor-creatives\/([^\/]+)\//);
      if (match) {
        folders.add(decodeURIComponent(match[1]));
      }
    }
  });
  
  folders.forEach(folder => console.log(`  - ${folder}`));
})();
