const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('📋 Структура таблицы competitor_creatives:\n');
  
  const { data, error } = await supabase
    .from('competitor_creatives')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  console.log('Доступные поля:');
  Object.keys(data).forEach(key => {
    console.log(`  - ${key}: ${typeof data[key]} = ${data[key] === null ? 'NULL' : JSON.stringify(data[key]).substring(0, 100)}`);
  });
})();

