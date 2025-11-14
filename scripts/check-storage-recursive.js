// Скрипт для рекурсивной проверки файлов в Storage
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listFilesRecursive(bucketName, path = '', depth = 0) {
  const indent = '  '.repeat(depth);
  
  const { data: items, error } = await supabase
    .storage
    .from(bucketName)
    .list(path, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) {
    console.log(`${indent}❌ Ошибка: ${error.message}`);
    return 0;
  }

  if (!items || items.length === 0) {
    return 0;
  }

  let totalFiles = 0;

  for (const item of items) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    
    // Если это папка (нет metadata.size или id === null)
    if (!item.metadata?.size && item.id === null) {
      console.log(`${indent}📁 ${item.name}/`);
      // Рекурсивно проверяем содержимое папки
      const filesInFolder = await listFilesRecursive(bucketName, fullPath, depth + 1);
      totalFiles += filesInFolder;
    } else {
      // Это файл
      const size = item.metadata?.size ? (item.metadata.size / 1024).toFixed(2) : 'N/A';
      console.log(`${indent}📄 ${item.name} (${size} KB)`);
      
      // Показываем публичный URL
      const { data } = supabase.storage.from(bucketName).getPublicUrl(fullPath);
      console.log(`${indent}   🔗 ${data.publicUrl}`);
      
      totalFiles++;
    }
  }

  return totalFiles;
}

async function checkStorageRecursive() {
  console.log('🔍 Рекурсивная проверка Storage...\n');

  const buckets = [
    'competitor-creatives',
    'generated-creatives', 
    'creatives',
    'assets',
    'backgrounds'
  ];

  for (const bucketName of buckets) {
    console.log(`\n📦 Bucket: ${bucketName}`);
    console.log('─'.repeat(60));
    
    const totalFiles = await listFilesRecursive(bucketName);
    
    if (totalFiles === 0) {
      console.log('  📭 Пусто');
    } else {
      console.log(`\n  ✅ Всего файлов: ${totalFiles}`);
    }
  }

  console.log('\n✅ Проверка завершена!');
}

checkStorageRecursive().catch(console.error);

