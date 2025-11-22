const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupCreatives() {
  console.log('🧹 Очистка креативов - оставляем по 100 на конкурента...\n');
  
  // Получаем список уникальных конкурентов (БЕЗ лимита - грузим все)
  let allCompetitors = [];
  let from = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data } = await supabase
      .from('competitor_creatives')
      .select('competitor_name')
      .range(from, from + batchSize - 1);
    
    if (!data || data.length === 0) break;
    allCompetitors = allCompetitors.concat(data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  
  const uniqueCompetitors = [...new Set(allCompetitors.map(c => c.competitor_name))];
  console.log(`📊 Загружено записей: ${allCompetitors.length}`);
  console.log(`📊 Найдено конкурентов: ${uniqueCompetitors.length}\n`);
  
  let totalDeleted = 0;
  
  for (const competitor of uniqueCompetitors) {
    console.log(`\n🔄 Обрабатываем: ${competitor}`);
    
    // Получаем все креативы этого конкурента, сортируем по дате (новые первыми)
    const { data: allCreatives } = await supabase
      .from('competitor_creatives')
      .select('id, created_at')
      .eq('competitor_name', competitor)
      .order('created_at', { ascending: false });
    
    console.log(`   Всего: ${allCreatives.length} креативов`);
    
    if (allCreatives.length <= 100) {
      console.log('   ✅ Уже <= 100, пропускаем');
      continue;
    }
    
    // Берем ID креативов, которые нужно удалить (все после 100)
    const toDelete = allCreatives.slice(100).map(c => c.id);
    console.log(`   ⚠️  Нужно удалить: ${toDelete.length} креативов`);
    
    // Удаляем батчами по 100
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      
      const { error } = await supabase
        .from('competitor_creatives')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.error(`   ❌ Ошибка при удалении батча ${i}-${i + batch.length}:`, error);
      } else {
        totalDeleted += batch.length;
        console.log(`   ✅ Удалено: ${batch.length} (всего: ${totalDeleted})`);
      }
      
      // Небольшая пауза между батчами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n\n🎉 Готово! Удалено ${totalDeleted} записей`);
  
  // Финальная статистика
  const { count } = await supabase
    .from('competitor_creatives')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Осталось в БД: ${count} креативов`);
}

cleanupCreatives();

