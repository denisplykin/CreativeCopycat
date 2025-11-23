const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase config
const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Google Sheets config
const SPREADSHEET_ID = '1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw';
const SHEET_ID = 1915622541; // gid from URL

// Google Service Account credentials
// Load from multiple sources (priority: env vars > service-account.json > google-credentials.json)
let GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY;

// 1. Try environment variables first
if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  console.log('✅ Using Google credentials from environment variables');
} 
// 2. Try service-account.json
else if (fs.existsSync('./service-account.json')) {
  const credentials = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
  GOOGLE_SERVICE_ACCOUNT_EMAIL = credentials.client_email;
  GOOGLE_PRIVATE_KEY = credentials.private_key;
  console.log('✅ Using Google credentials from service-account.json');
}
// 3. Fallback to google-credentials.json (legacy)
else if (fs.existsSync('./google-credentials.json')) {
  const credentials = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));
  GOOGLE_SERVICE_ACCOUNT_EMAIL = credentials.client_email;
  GOOGLE_PRIVATE_KEY = credentials.private_key;
  console.log('✅ Using Google credentials from google-credentials.json');
}

async function syncFromSheets() {
  console.log('🔄 Starting sync from Google Sheets...\n');
  
  // Check credentials
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error('❌ Missing Google credentials!');
    console.log('\n📝 Setup instructions:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing');
    console.log('3. Enable Google Sheets API');
    console.log('4. Create Service Account credentials');
    console.log('5. Download JSON key file');
    console.log('6. Share your Google Sheet with service account email');
    console.log('7. Set environment variables:');
    console.log('   export GOOGLE_SERVICE_ACCOUNT_EMAIL="your-email@project.iam.gserviceaccount.com"');
    console.log('   export GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    process.exit(1);
  }

  try {
    // Initialize auth
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // Load spreadsheet
    console.log('📊 Loading Google Sheet...');
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log(`✅ Loaded: ${doc.title}`);

    // Get sheet by gid
    const sheet = doc.sheetsById[SHEET_ID];
    if (!sheet) {
      throw new Error(`Sheet with gid ${SHEET_ID} not found`);
    }
    console.log(`✅ Found sheet: ${sheet.title}`);

    // Load rows
    console.log('\n📥 Loading rows...');
    const rows = await sheet.getRows();
    console.log(`✅ Loaded ${rows.length} rows`);

    // Process rows
    console.log('\n🔄 Processing rows...\n');
    let updated = 0;
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        // Extract data from row
        const imageUrl = row.get('Image URL');
        const advertiserName = row.get('Advertiser Name');
        const activeDays = parseInt(row.get('Active Days')) || 0;
        const adText = row.get('Ad Text');
        const adTextEng = row.get('Ad Text Eng');
        const landingPageUrl = row.get('Landing Page URL');
        const ctaButton = row.get('CTA Button');
        const platformCount = parseInt(row.get('Platform Count')) || 1;
        const textVariants = parseInt(row.get('Text Variants')) || 0;
        const imageVariants = parseInt(row.get('Image Variants')) || 0;
        const mediaType = row.get('Media Type');
        const ageTargeting = row.get('Age Targeting');
        const courseSubjects = row.get('Course Subjects');
        const offers = row.get('Offers');
        const adId = row.get('Ad ID');

        // Skip if no image URL (ОБЯЗАТЕЛЬНОЕ поле)
        if (!imageUrl) {
          skipped++;
          continue;
        }

        // Минимальная структура для второго агента (только 4 поля)
        const record = {
          image_url: imageUrl,                                    // ОБЯЗАТЕЛЬНО: ссылка на превью
          competitor_name: advertiserName || 'Unknown',          // Название конкурента
          active_days: activeDays || 0,                          // Количество дней (INTEGER)
          ad_id: adId || null,                                    // ID креатива (уникальный идентификатор)
        };

        // Проверяем существование: сначала по ad_id (если есть), затем по image_url
        let existing = null;
        let identifierField = null;
        let identifierValue = null;

        if (record.ad_id) {
          // Проверяем по ad_id (приоритет)
          identifierField = 'ad_id';
          identifierValue = record.ad_id;
          const { data: existingByAdId, error: checkByAdId } = await supabase
            .from('competitor_creatives')
            .select('id')
            .eq('ad_id', record.ad_id)
            .single();
          
          if (!checkByAdId || checkByAdId.code === 'PGRST116') {
            existing = existingByAdId;
          }
        }

        // Если не нашли по ad_id, проверяем по image_url
        if (!existing) {
          identifierField = 'image_url';
          identifierValue = record.image_url;
          const { data: existingByImage, error: checkByImage } = await supabase
            .from('competitor_creatives')
            .select('id')
            .eq('image_url', record.image_url)
            .single();
          
          if (checkByImage && checkByImage.code !== 'PGRST116') {
            console.error(`  ❌ Error checking ${identifierValue}:`, checkByImage.message);
            errors++;
            continue;
          }
          existing = existingByImage;
        }

        if (existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from('competitor_creatives')
            .update(record)
            .eq('id', existing.id);

          if (updateError) {
            console.error(`  ❌ Error updating ${identifierValue}:`, updateError.message);
            errors++;
          } else {
            updated++;
            if (updated % 10 === 0) {
              console.log(`  📝 Updated ${updated} records...`);
            }
          }
        } else {
          // Create new
          const { error: insertError } = await supabase
            .from('competitor_creatives')
            .insert(record);

          if (insertError) {
            console.error(`  ❌ Error inserting ${identifierValue}:`, insertError.message);
            errors++;
          } else {
            created++;
            if (created % 10 === 0) {
              console.log(`  ✨ Created ${created} records...`);
            }
          }
        }
      } catch (error) {
        console.error(`  ❌ Error processing row:`, error.message);
        errors++;
      }
    }

    console.log('\n\n📊 Sync Summary:');
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ✨ Created: ${created}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`\n✅ Sync completed!`);

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    throw error;
  }
}

// Run
syncFromSheets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

