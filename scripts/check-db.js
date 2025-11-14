// Скрипт для проверки структуры данных в Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Проверяем базу данных Supabase...\n');

  // Проверяем таблицу creatives
  console.log('📊 Таблица CREATIVES:');
  const { data: creatives, error: creativesError } = await supabase
    .from('creatives')
    .select('*')
    .limit(3);

  if (creativesError) {
    console.log('❌ Ошибка:', creativesError.message);
  } else {
    console.log(`✅ Найдено записей: ${creatives?.length || 0}`);
    if (creatives && creatives.length > 0) {
      console.log('\n📝 Пример записи:');
      console.log(JSON.stringify(creatives[0], null, 2));
    }
  }

  // Проверяем таблицу patterns
  console.log('\n📊 Таблица PATTERNS:');
  const { data: patterns, error: patternsError } = await supabase
    .from('patterns')
    .select('*')
    .limit(3);

  if (patternsError) {
    console.log('❌ Ошибка:', patternsError.message);
  } else {
    console.log(`✅ Найдено записей: ${patterns?.length || 0}`);
    if (patterns && patterns.length > 0) {
      console.log('\n📝 Пример записи:');
      console.log(JSON.stringify(patterns[0], null, 2));
    }
  }

  // Проверяем таблицу runs
  console.log('\n📊 Таблица RUNS:');
  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('*')
    .limit(3);

  if (runsError) {
    console.log('❌ Ошибка:', runsError.message);
  } else {
    console.log(`✅ Найдено записей: ${runs?.length || 0}`);
    if (runs && runs.length > 0) {
      console.log('\n📝 Пример записи:');
      console.log(JSON.stringify(runs[0], null, 2));
    }
  }

  // Проверяем Storage buckets
  console.log('\n📦 Storage Buckets:');
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    console.log('❌ Ошибка:', bucketsError.message);
  } else {
    console.log('✅ Найдено buckets:', buckets?.length || 0);
    buckets?.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
  }

  console.log('\n✅ Проверка завершена!');
}

checkDatabase().catch(console.error);

