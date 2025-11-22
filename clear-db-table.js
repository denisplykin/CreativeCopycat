const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🗑️  Очищаем таблицу competitor_creatives (файлов в Storage нет)...\n');
  
  // Считаем сколько записей
  const { count: before } = await supabase
    .from('competitor_creatives')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Записей в БД: ${before}\n`);
  console.log('⚠️  Удаляем ВСЕ записи...\n');
  
  // Удаляем все
  const { error } = await supabase
    .from('competitor_creatives')
    .delete()
    .neq('id', 0); // Удалит всё (всегда true для id > 0)
  
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  const { count: after } = await supabase
    .from('competitor_creatives')
    .select('*', { count: 'exact', head: true });
  
  console.log(`✅ Удалено: ${before - after} записей`);
  console.log(`📊 Осталось: ${after} записей`);
  console.log('\n✨ Таблица очищена! Теперь можно запустить свежий импорт.');
})();

