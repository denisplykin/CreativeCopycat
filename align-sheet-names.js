const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://osokxlweresllgbclkme.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ'
);

// Маппинг названий в БД -> названия листов в Google Sheets
const sheetNameMapping = {
  // Уже правильные (оставляем как есть)
  'Kodland Indonesia': 'Kodland Indonesia',
  'KodioKids': 'KodioKids',
  'KodeKiddo': 'KodeKiddo',
  'Ruangguru': 'Ruangguru',
  'Coding Bee Academy': 'Coding Bee Academy',
  'Timedoor Academy': 'Timedoor Academy',
  'Kalananti': 'Kalananti',
  
  // Нужно переименовать
  'Brightchamps Indonesia': 'Bright Champs',
  'Digikidz': 'DIGIKIDZ',
  'The Lab Indonesia': 'The Lab',
  'Math Champs': 'Math Champs by Ruangguru',
  'Math Champs - Les Matematika Bali': 'Math Champs by Ruangguru',
  'Math Champs - Les Matematika Cibinong': 'Math Champs by Ruangguru',
  'Math Champs - Les Matematika Jakarta Selatan': 'Math Champs by Ruangguru',
  'Math Champs - Les Matematika Jakarta Timur': 'Math Champs by Ruangguru',
  'Math Champs - Les Matematika Kalimantan Timur': 'Math Champs by Ruangguru',
  'Math Champs - Les Matematika Sumatera Utara': 'Math Champs by Ruangguru',
  'Math Champs - Les Matematika Sumatra Selatan': 'Math Champs by Ruangguru',
  'MathChamps - Les Matematika Tangerang Selatan': 'Math Champs by Ruangguru',
  
  // Эти не совпадают с листами - удалим или оставим как Unknown
  'Ario Muhammad': null, // Нет такого листа
  'AtAmerica': null,
  'English Academy Center Tegal - Cokroaminoto': null,
  'ILON Academy': null,
  'Kobi Education': null,
  'LULU Islamic School': null,
  'Stellamaris.sch': null,
  'WelldoneSkills': null,
  'Work Abroad Academy': null,
};

async function alignWithSheetNames() {
  console.log('🔄 Aligning competitor names with Google Sheets tabs...\n');
  
  try {
    let updated = 0;
    let deleted = 0;
    
    for (const [currentName, sheetName] of Object.entries(sheetNameMapping)) {
      if (sheetName === null) {
        // Удаляем записи, которых нет в листах
        const { error } = await supabase
          .from('competitor_creatives')
          .delete()
          .eq('competitor_name', currentName);
        
        if (!error) {
          deleted++;
          console.log(`❌ Deleted: "${currentName}" (not in sheets)`);
        }
      } else if (currentName !== sheetName) {
        // Обновляем название
        const { error } = await supabase
          .from('competitor_creatives')
          .update({ competitor_name: sheetName })
          .eq('competitor_name', currentName);
        
        if (!error) {
          updated++;
          console.log(`✅ "${currentName}" → "${sheetName}"`);
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Deleted: ${deleted}`);
    
    // Показываем финальный список
    console.log('\n📋 Final competitor list (aligned with sheets):\n');
    const { data } = await supabase
      .from('competitor_creatives')
      .select('competitor_name')
      .not('image_url', 'is', null);
    
    const byCompetitor = {};
    data.forEach(s => {
      const name = s.competitor_name || 'Unknown';
      byCompetitor[name] = (byCompetitor[name] || 0) + 1;
    });
    
    Object.entries(byCompetitor)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        console.log(`  ${count.toString().padStart(3)} | ${name}`);
      });
    
    console.log(`\n✅ Total: ${Object.keys(byCompetitor).length} competitors`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

alignWithSheetNames()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

