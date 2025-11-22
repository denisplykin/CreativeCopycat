const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function countFilesInFolder(folderPath = '') {
  const { data: items, error } = await supabase.storage
    .from('competitor-creatives')
    .list(folderPath, { limit: 1000 });
  
  if (error) {
    console.log(`❌ Ошибка в ${folderPath}:`, error.message);
    return 0;
  }
  
  let totalFiles = 0;
  
  for (const item of items) {
    if (item.id === null) {
      // Это папка
      const subPath = folderPath ? `${folderPath}/${item.name}` : item.name;
      const subCount = await countFilesInFolder(subPath);
      console.log(`  📁 ${item.name}: ${subCount} файлов`);
      totalFiles += subCount;
    } else {
      // Это файл
      totalFiles++;
    }
  }
  
  return totalFiles;
}

(async () => {
  console.log('🔍 Сканируем Storage bucket: competitor-creatives\n');
  
  const total = await countFilesInFolder();
  
  console.log(`\n✅ Всего файлов: ${total}`);
})();
