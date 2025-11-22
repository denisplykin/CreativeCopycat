const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔍 Проверяем результаты скрапинга...\n');
  
  // Проверяем таблицу
  const { count, error } = await supabase
    .from('competitor_creatives')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log('❌ Ошибка:', error.message);
  } else {
    console.log(`📊 Записей в БД: ${count}\n`);
  }
  
  // Получаем детали по конкурентам
  const { data: competitors, error: compError } = await supabase
    .from('competitor_creatives')
    .select('competitor_name, created_at')
    .order('created_at', { ascending: false });
  
  if (!compError && competitors) {
    const grouped = competitors.reduce((acc, item) => {
      acc[item.competitor_name] = (acc[item.competitor_name] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📋 По конкурентам:');
    Object.entries(grouped).forEach(([name, count]) => {
      console.log(`  • ${name}: ${count} креативов`);
    });
    
    if (competitors.length > 0) {
      const latestDate = new Date(competitors[0].created_at);
      console.log(`\n⏰ Последнее обновление: ${latestDate.toLocaleString()}`);
    }
  }
  
  // Проверяем Storage
  console.log('\n\n📦 Проверяем Storage bucket...\n');
  
  const { data: files, error: filesError } = await supabase.storage
    .from('competitor-creatives')
    .list('', { limit: 1000 });
  
  if (filesError) {
    console.log('❌ Ошибка Storage:', filesError.message);
  } else {
    console.log(`📁 Файлов в Storage: ${files.length}`);
    
    if (files.length > 0) {
      const totalSize = files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
      console.log(`💾 Общий размер: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    }
  }
  
  console.log('\n✅ Проверка завершена!');
})();
