// Скрипт для проверки файлов в Storage
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  console.log('🔍 Проверяем Storage...\n');

  const buckets = ['competitor-creatives', 'creatives', 'assets', 'backgrounds', 'generated-creatives'];

  for (const bucketName of buckets) {
    console.log(`📦 Bucket: ${bucketName}`);
    
    const { data: files, error } = await supabase
      .storage
      .from(bucketName)
      .list('', {
        limit: 10,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.log(`   ❌ Ошибка: ${error.message}\n`);
      continue;
    }

    if (files && files.length > 0) {
      console.log(`   ✅ Найдено файлов: ${files.length}`);
      files.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file.name} (${(file.metadata?.size / 1024).toFixed(2)} KB)`);
        
        // Показываем публичный URL
        const { data } = supabase.storage.from(bucketName).getPublicUrl(file.name);
        console.log(`      URL: ${data.publicUrl}`);
      });
    } else {
      console.log(`   📭 Пусто`);
    }
    console.log('');
  }

  console.log('✅ Проверка завершена!');
}

checkStorage().catch(console.error);

