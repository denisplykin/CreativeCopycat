const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('📊 Подсчет креативов в обеих таблицах...\n');
  
  // Считаем в competitor_creatives
  const { count: competitorCount, error: error1 } = await supabase
    .from('competitor_creatives')
    .select('*', { count: 'exact', head: true });
  
  if (error1) {
    console.error('❌ Ошибка при подсчёте competitor_creatives:', error1);
  } else {
    console.log(`✅ competitor_creatives: ${competitorCount} креативов`);
  }
  
  // Считаем в creatives
  const { count: creativesCount, error: error2 } = await supabase
    .from('creatives')
    .select('*', { count: 'exact', head: true });
  
  if (error2) {
    console.error('❌ Ошибка при подсчёте creatives:', error2);
  } else {
    console.log(`✅ creatives (старая): ${creativesCount} креативов`);
  }
})();
