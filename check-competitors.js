// Скрипт для проверки конкурентов в БД
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔍 Проверяем конкурентов в БД...\n');
  
  const { data, error } = await supabase
    .from('competitor_creatives')
    .select('competitor_name, image_url');
  
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  console.log(`📊 Всего креативов в БД: ${data.length}\n`);
  
  const unique = [...new Set(data.map(c => c.competitor_name))].sort();
  
  console.log(`📊 Всего уникальных конкурентов: ${unique.length}\n`);
  unique.forEach((name, i) => {
    console.log(`${i+1}. ${name}`);
  });
  
  // Считаем креативы по конкурентам
  console.log('\n\n📈 Креативов по конкурентам:\n');
  for (const name of unique) {
    const count = data.filter(c => c.competitor_name === name).length;
    console.log(`${name}: ${count}`);
  }
  
  // Покажем несколько примеров путей
  console.log('\n\n📁 Примеры URLs:\n');
  data.slice(0, 10).forEach(c => {
    console.log(`${c.competitor_name} <- ${c.image_url}`);
  });
})();
