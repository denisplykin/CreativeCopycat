const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllFiles(bucketName, path = '', allFiles = []) {
  const { data: items, error } = await supabase
    .storage
    .from(bucketName)
    .list(path, { limit: 1000, offset: 0 });

  if (error) {
    console.error(`❌ Ошибка при чтении ${path}:`, error.message);
    return allFiles;
  }

  if (!items || items.length === 0) return allFiles;

  for (const item of items) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    
    if (item.id && !item.metadata) {
      // Папка - рекурсивно обходим
      await listAllFiles(bucketName, fullPath, allFiles);
    } else if (item.metadata) {
      // Файл
      allFiles.push({
        path: fullPath,
        created_at: item.created_at,
        size: item.metadata.size
      });
    }
  }

  return allFiles;
}

async function deleteOldFiles() {
  console.log('🗑️  Удаляем файлы старше 3 дней из Storage...\n');
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  console.log(`📅 Дата отсечки: ${threeDaysAgo.toISOString()}\n`);
  
  // Получаем все файлы
  console.log('📁 Сканируем bucket...');
  const allFiles = await listAllFiles('competitor-creatives');
  console.log(`✅ Найдено файлов: ${allFiles.length}\n`);
  
  // Фильтруем старые
  const oldFiles = allFiles.filter(file => {
    const fileDate = new Date(file.created_at);
    return fileDate < threeDaysAgo;
  });
  
  console.log(`⚠️  Файлов старше 3 дней: ${oldFiles.length}`);
  console.log(`✅ Свежих файлов: ${allFiles.length - oldFiles.length}\n`);
  
  if (oldFiles.length === 0) {
    console.log('✨ Нет файлов для удаления!');
    return;
  }
  
  // Удаляем батчами по 100
  console.log('🗑️  Начинаем удаление...\n');
  let deleted = 0;
  
  for (let i = 0; i < oldFiles.length; i += 100) {
    const batch = oldFiles.slice(i, i + 100);
    const paths = batch.map(f => f.path);
    
    const { data, error } = await supabase
      .storage
      .from('competitor-creatives')
      .remove(paths);
    
    if (error) {
      console.error(`❌ Ошибка при удалении батча ${i}-${i + batch.length}:`, error);
    } else {
      deleted += paths.length;
      console.log(`✅ Удалено ${deleted} из ${oldFiles.length} файлов`);
    }
    
    // Пауза между батчами
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n🎉 Готово! Удалено ${deleted} файлов`);
  console.log(`📊 Осталось в Storage: ${allFiles.length - deleted} файлов`);
  
  // Теперь удаляем из БД записи со старыми URL
  console.log('\n🗑️  Очищаем БД от записей с несуществующими файлами...');
  
  const { data: dbRecords } = await supabase
    .from('competitor_creatives')
    .select('id, image_url, created_at');
  
  console.log(`📊 Записей в БД: ${dbRecords.length}`);
  
  // Удаляем записи старше 3 дней
  const { count: deletedFromDb } = await supabase
    .from('competitor_creatives')
    .delete({ count: 'exact' })
    .lt('created_at', threeDaysAgo.toISOString());
  
  console.log(`✅ Удалено из БД: ${deletedFromDb} записей`);
  
  const { count: remainingCount } = await supabase
    .from('competitor_creatives')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Осталось в БД: ${remainingCount} записей`);
}

deleteOldFiles();

