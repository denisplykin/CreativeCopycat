const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function importFromCSV(csvFilePath) {
  console.log('📥 Importing from CSV...\n');
  console.log(`File: ${csvFilePath}\n`);
  
  const rows = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', async () => {
        console.log(`✅ Parsed ${rows.length} rows from CSV\n`);
        
        let updated = 0;
        let created = 0;
        let skipped = 0;
        let errors = 0;
        
        console.log('🔄 Processing rows...\n');
        
        for (const row of rows) {
          try {
            const imageUrl = row['Image URL'];
            if (!imageUrl) {
              skipped++;
              continue;
            }
            
            const record = {
              image_url: imageUrl,
              competitor_name: row['Advertiser Name'],
              active_days: parseInt(row['Active Days']) || 0,
              ad_text: row['Ad Text'],
              ad_text_eng: row['Ad Text Eng'],
              landing_page_url: row['Landing Page URL'],
              cta_button: row['CTA Button'],
              platform_count: parseInt(row['Platform Count']) || 1,
              text_variants: parseInt(row['Text Variants']) || 0,
              image_variants: parseInt(row['Image Variants']) || 0,
              media_type: row['Media Type'],
              age_targeting: row['Age Targeting'],
              course_subjects: row['Course Subjects'],
              offers: row['Offers'],
              ad_id: row['Ad ID'],
            };
            
            // Check if exists
            const { data: existing, error: checkError } = await supabase
              .from('competitor_creatives')
              .select('id')
              .eq('image_url', imageUrl)
              .single();
            
            if (checkError && checkError.code !== 'PGRST116') {
              errors++;
              continue;
            }
            
            if (existing) {
              // Update
              const { error: updateError } = await supabase
                .from('competitor_creatives')
                .update(record)
                .eq('id', existing.id);
              
              if (updateError) {
                errors++;
              } else {
                updated++;
                if (updated % 10 === 0) {
                  console.log(`  📝 Updated ${updated} records...`);
                }
              }
            } else {
              // Create
              const { error: insertError } = await supabase
                .from('competitor_creatives')
                .insert(record);
              
              if (insertError) {
                errors++;
              } else {
                created++;
                if (created % 10 === 0) {
                  console.log(`  ✨ Created ${created} records...`);
                }
              }
            }
          } catch (error) {
            errors++;
          }
        }
        
        console.log('\n\n📊 Import Summary:');
        console.log(`  ✅ Updated: ${updated}`);
        console.log(`  ✨ Created: ${created}`);
        console.log(`  ⏭️  Skipped: ${skipped}`);
        console.log(`  ❌ Errors: ${errors}`);
        console.log(`\n✅ Import completed!`);
        
        resolve();
      })
      .on('error', reject);
  });
}

// Run
const csvFile = process.argv[2] || './competitors.csv';
importFromCSV(csvFile)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });

