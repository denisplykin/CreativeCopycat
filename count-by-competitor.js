const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('📊 Подсчёт креативов по конкурентам (БЕЗ лимита)...\n');
  
  // Используем агрегацию через RPC или делаем пагинацию
  let allData = [];
  let from = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('competitor_creatives')
      .select('competitor_name')
      .range(from, from + batchSize - 1);
    
    if (error) {
      console.error('❌ Ошибка:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allData = allData.concat(data);
    console.log(`  Загружено: ${allData.length} записей...`);
    
    if (data.length < batchSize) break;
    from += batchSize;
  }
  
  console.log(`\n✅ Всего загружено: ${allData.length} записей\n`);
  
  // Группируем по competitor_name
  const counts = {};
  allData.forEach(item => {
    const name = item.competitor_name || 'Unknown';
    counts[name] = (counts[name] || 0) + 1;
  });
  
  // Сортируем по количеству
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  
  console.log('📊 Креативов по конкурентам:\n');
  let total = 0;
  sorted.forEach(([name, count]) => {
    const status = count > 100 ? '⚠️ БОЛЬШЕ 100!' : '✅';
    console.log(`${status} ${name}: ${count}`);
    total += count;
  });
  
  console.log(`\n📊 ИТОГО: ${total} креативов`);
  console.log(`📊 Конкурентов: ${sorted.length}`);
  console.log(`📊 Среднее: ${Math.round(total / sorted.length)} креативов на конкурента`);
  
  // Сколько нужно удалить
  const excess = sorted.filter(([_, count]) => count > 100);
  if (excess.length > 0) {
    console.log(`\n⚠️  У ${excess.length} конкурентов больше 100 креативов`);
    const toDelete = excess.reduce((sum, [_, count]) => sum + (count - 100), 0);
    console.log(`⚠️  Нужно удалить: ${toDelete} записей`);
  }
})();
