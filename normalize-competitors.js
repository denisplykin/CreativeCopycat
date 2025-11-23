const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://osokxlweresllgbclkme.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ'
);

// Правила нормализации
const normalizationRules = {
  // Ruangguru
  'RUANGGURU.COMCek Rasionalisasi Peluang Lolos SNBP 2026 Online secara Akurat & Gratis Get Access': 'Ruangguru',
  'RUANGGURU.COMGet Access': 'Ruangguru',
  
  // Kobi Education
  'KOBIEDUCATION.COMKuliah GRATIS di Korea Buka Peluang Karir Internasional Get Offer': 'Kobi Education',
  'Kobi Education Id': 'Kobi Education',
  
  // Coding Bee Academy
  'FB.MECoding Bee Academy Surabaya BaratLearn more': 'Coding Bee Academy',
  'FB.MECoding Bee Academy Surabaya BaratSign up': 'Coding Bee Academy',
  'FB.MECoding Bee Academy Surabaya TimurSign up': 'Coding Bee Academy',
  'Coding Bee Academy Surabaya Barat': 'Coding Bee Academy',
  'Coding Bee Academy Surabaya Timur': 'Coding Bee Academy',
  'Coding Bee Academy Serpong': 'Coding Bee Academy',
  'Coding Bee Academy Medan': 'Coding Bee Academy',
  
  // KodioKids
  'https://kodiokids.com/gading-serpong': 'KodioKids',
  'https://kodiokids.com/gadingp-serpong': 'KodioKids',
  'https://kodiokids.com/': 'KodioKids',
  
  // KodeKiddo
  'Kodekiddo KK Pondok Indah': 'KodeKiddo',
  
  // Digikidz
  'Digikidz Citragrand Semarang': 'Digikidz',
  'Digikidz Palembang': 'Digikidz',
  'DIGIKIDZ.COMDiskon 50% Kursus Coding Anak di Semarang!Learn More': 'Digikidz',
  'DIGIKIZ.COMDiskon 50% Kursus Coding Anak di Semarang!Learn More': 'Digikidz',
  
  // BrightCHAMPS
  'BrightCHAMPS': 'Brightchamps Indonesia',
  
  // Math Champs (оставляем как есть, это разные филиалы)
  'Math Champs by Ruangguru': 'Math Champs',
  
  // CBA Schools
  'cba.schools': 'Coding Bee Academy',
  'INSTAGRAM.COMcba.schoolsVisit Instagram profile': 'Coding Bee Academy',
  
  // Instagram/Social media links
  'INSTAGRAM.COM Visit Instagram Profile': null, // Удалим
  
  // Other links
  'https://bit.ly/ILONHC2025': 'ILON Academy',
  'https://bit.ly/kkholiday25': 'KodeKiddo',
  'wa.me/6282229505791': null, // Удалим
  'FASE.event': null, // Удалим
};

async function normalizeCompetitors() {
  console.log('🔄 Normalizing competitor names...\n');
  
  try {
    let updated = 0;
    let deleted = 0;
    
    for (const [oldName, newName] of Object.entries(normalizationRules)) {
      if (newName === null) {
        // Удаляем записи с мусорными названиями
        const { data, error } = await supabase
          .from('competitor_creatives')
          .delete()
          .eq('competitor_name', oldName);
        
        if (!error) {
          deleted++;
          console.log(`❌ Deleted: "${oldName}"`);
        }
      } else {
        // Обновляем название
        const { data, error } = await supabase
          .from('competitor_creatives')
          .update({ competitor_name: newName })
          .eq('competitor_name', oldName);
        
        if (!error) {
          updated++;
          console.log(`✅ "${oldName}" → "${newName}"`);
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Deleted: ${deleted}`);
    
    // Показываем финальный список
    console.log('\n📋 Final competitor list:\n');
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
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

normalizeCompetitors()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

