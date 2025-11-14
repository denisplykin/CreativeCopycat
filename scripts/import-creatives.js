// Скрипт для импорта креативов из Storage в таблицу creatives
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listFilesRecursive(bucketName, path = '') {
  const { data: items, error } = await supabase
    .storage
    .from(bucketName)
    .list(path, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) {
    console.error(`❌ Ошибка при чтении ${path}:`, error.message);
    return [];
  }

  if (!items || items.length === 0) {
    return [];
  }

  const files = [];

  for (const item of items) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    
    // Если это папка
    if (!item.metadata?.size && item.id === null) {
      // Рекурсивно получаем файлы из папки
      const subFiles = await listFilesRecursive(bucketName, fullPath);
      files.push(...subFiles);
    } else {
      // Это файл
      files.push({
        path: fullPath,
        name: item.name,
        folder: path,
        size: item.metadata?.size || 0
      });
    }
  }

  return files;
}

async function importCreatives() {
  console.log('🚀 Импортируем креативы из Storage в БД...\n');

  // 1. Получаем все файлы из competitor-creatives
  console.log('📁 Сканируем bucket competitor-creatives...');
  const files = await listFilesRecursive('competitor-creatives');
  console.log(`✅ Найдено файлов: ${files.length}\n`);

  if (files.length === 0) {
    console.log('❌ Нет файлов для импорта');
    return;
  }

  // 2. Проверяем что уже есть в БД
  const { data: existingCreatives, error: fetchError } = await supabase
    .from('creatives')
    .select('original_image_url');

  if (fetchError) {
    console.error('❌ Ошибка при чтении БД:', fetchError);
    return;
  }

  const existingUrls = new Set(
    (existingCreatives || []).map(c => c.original_image_url)
  );
  console.log(`📊 В БД уже есть: ${existingUrls.size} креативов\n`);

  // 3. Импортируем новые креативы
  let imported = 0;
  let skipped = 0;
  const batchSize = 10; // Импортируем пакетами по 10

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    const creativesToInsert = batch
      .map(file => {
        const { data } = supabase.storage
          .from('competitor-creatives')
          .getPublicUrl(file.path);
        
        return {
          publicUrl: data.publicUrl,
          competitorName: file.folder,
          fileName: file.name
        };
      })
      .filter(c => !existingUrls.has(c.publicUrl)); // Пропускаем уже существующие

    if (creativesToInsert.length === 0) {
      skipped += batch.length;
      continue;
    }

    // Вставляем пакет
    const { data, error } = await supabase
      .from('creatives')
      .insert(
        creativesToInsert.map(c => ({
          competitor_name: c.competitorName,
          original_image_url: c.publicUrl,
          status: 'pending'
        }))
      )
      .select();

    if (error) {
      console.error(`❌ Ошибка при вставке пакета ${i}-${i + batch.length}:`, error.message);
      continue;
    }

    imported += creativesToInsert.length;
    skipped += batch.length - creativesToInsert.length;

    console.log(`✅ Пакет ${Math.floor(i / batchSize) + 1}: импортировано ${creativesToInsert.length}, пропущено ${batch.length - creativesToInsert.length}`);
  }

  console.log('\n🎉 Импорт завершён!');
  console.log(`   ✅ Импортировано: ${imported}`);
  console.log(`   ⏭️  Пропущено (уже есть): ${skipped}`);
  console.log(`   📊 Всего в БД: ${existingUrls.size + imported}`);
}

importCreatives().catch(console.error);

