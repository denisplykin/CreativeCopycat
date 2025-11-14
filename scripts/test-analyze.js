// Скрипт для тестирования анализа креатива
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnalyze() {
  console.log('🧪 Тестируем анализ креатива...\n');

  // Получаем первый pending креатив
  const { data: creatives, error } = await supabase
    .from('creatives')
    .select('*')
    .eq('status', 'pending')
    .limit(1);

  if (error) {
    console.error('❌ Ошибка при получении креатива:', error);
    return;
  }

  if (!creatives || creatives.length === 0) {
    console.log('📭 Нет pending креативов для анализа');
    return;
  }

  const creative = creatives[0];
  console.log('✅ Выбран креатив:');
  console.log(`   ID: ${creative.id}`);
  console.log(`   Конкурент: ${creative.competitor_name}`);
  console.log(`   URL: ${creative.original_image_url}`);
  console.log('');

  // Вызываем API анализа
  console.log('🔍 Запускаем анализ через API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creativeId: creative.id,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API ошибка:', response.status, errorText);
      return;
    }

    const result = await response.json();
    
    console.log('\n✅ Анализ завершён успешно!');
    console.log('\n📊 Результаты:');
    console.log('─'.repeat(60));
    
    if (result.analysis.ocr) {
      console.log(`\n📝 OCR:`);
      console.log(`   Блоков текста: ${result.analysis.ocr.blocks?.length || 0}`);
      console.log(`   Confidence: ${((result.analysis.ocr.confidence || 0) * 100).toFixed(1)}%`);
      console.log(`   Язык: ${result.analysis.ocr.language || 'unknown'}`);
      console.log(`   Полный текст:\n`);
      console.log(`   "${result.analysis.ocr.fullText.slice(0, 200)}${result.analysis.ocr.fullText.length > 200 ? '...' : ''}"`);
      
      if (result.analysis.ocr.blocks && result.analysis.ocr.blocks.length > 0) {
        console.log(`\n   Текстовые блоки:`);
        result.analysis.ocr.blocks.slice(0, 5).forEach((block, i) => {
          console.log(`   ${i + 1}. "${block.text}" (confidence: ${(block.confidence * 100).toFixed(0)}%)`);
        });
        if (result.analysis.ocr.blocks.length > 5) {
          console.log(`   ... и ещё ${result.analysis.ocr.blocks.length - 5} блоков`);
        }
      }
    }

    if (result.analysis.roles) {
      console.log(`\n🎯 Роли текста (${result.analysis.roles.length}):`);
      result.analysis.roles.forEach((role, i) => {
        console.log(`   ${i + 1}. [${role.role.toUpperCase()}] "${role.text}"`);
      });
    }

    if (result.analysis.layout) {
      console.log(`\n📐 Layout:`);
      console.log(`   Размер canvas: ${result.analysis.layout.canvasSize.width}x${result.analysis.layout.canvasSize.height}`);
      console.log(`   Элементов: ${result.analysis.layout.elements?.length || 0}`);
    }

    if (result.analysis.dominant_colors) {
      console.log(`\n🎨 Доминирующие цвета:`);
      console.log(`   ${result.analysis.dominant_colors.join(', ')}`);
    }

    if (result.analysis.aspect_ratio) {
      console.log(`\n📏 Aspect ratio: ${result.analysis.aspect_ratio}`);
    }

    console.log('\n─'.repeat(60));
    console.log('\n💾 Результаты сохранены в Supabase (creatives.analysis)');
    console.log(`   Проверьте в БД: creative_id = ${creative.id}`);

  } catch (error) {
    console.error('❌ Ошибка при вызове API:', error);
  }
}

testAnalyze().catch(console.error);

