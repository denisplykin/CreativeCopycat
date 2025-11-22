const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testImageUrls() {
  console.log('🔍 Проверяем доступность изображений...\n');
  
  const { data, error } = await supabase
    .from('competitor_creatives')
    .select('id, competitor_name, image_url')
    .limit(5);
  
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  console.log(`📊 Проверяем ${data.length} URL...\n`);
  
  for (const row of data) {
    console.log(`\n${row.competitor_name}:`);
    console.log(`  URL: ${row.image_url}`);
    
    if (!row.image_url) {
      console.log('  ❌ URL пустой!');
      continue;
    }
    
    // Проверяем доступность
    try {
      const url = new URL(row.image_url);
      const response = await new Promise((resolve, reject) => {
        https.get(row.image_url, (res) => {
          resolve(res);
        }).on('error', reject);
      });
      
      console.log(`  ✅ Статус: ${response.statusCode}`);
    } catch (err) {
      console.log(`  ❌ Ошибка: ${err.message}`);
    }
  }
}

testImageUrls();
