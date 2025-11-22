const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  const { count: nullCount } = await supabase
    .from('competitor_creatives')
    .select('*', { count: 'exact', head: true })
    .is('image_url', null);
  
  const { count: totalCount } = await supabase
    .from('competitor_creatives')
    .select('*', { count: 'exact', head: true });
  
  console.log(`NULL image_url: ${nullCount}`);
  console.log(`Всего: ${totalCount}`);
})();
