const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase config
const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Google Sheets config
const SPREADSHEET_ID = '1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw';

async function syncFromSheetsV2() {
  console.log('🔄 Starting sync from Google Sheets (googleapis)...\n');
  
  try {
    // Load credentials from multiple sources (priority: env vars > service-account.json > google-credentials.json)
    console.log('📂 Loading credentials...');
    let credentials;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      credentials = {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID || '',
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || '',
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)}`,
        universe_domain: 'googleapis.com'
      };
      console.log('✅ Using credentials from environment variables');
    } else if (fs.existsSync('./service-account.json')) {
      credentials = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
      console.log('✅ Using credentials from service-account.json');
    } else if (fs.existsSync('./google-credentials.json')) {
      credentials = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));
      console.log('✅ Using credentials from google-credentials.json');
    } else {
      throw new Error('No credentials found! Set environment variables or create service-account.json');
    }
    
    // Initialize auth
    console.log('\n🔐 Initializing auth...');
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const authClient = await auth.getClient();
    console.log('✅ Auth initialized');
    
    // Initialize sheets API
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    // Get spreadsheet metadata
    console.log('\n📊 Getting spreadsheet info...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    console.log(`✅ Loaded: ${spreadsheet.data.properties.title}`);
    console.log(`\n📄 Found ${spreadsheet.data.sheets.length} sheets:`);
    
    spreadsheet.data.sheets.forEach((sheet, i) => {
      console.log(`  ${i + 1}. ${sheet.properties.title}`);
    });
    
    let totalUpdated = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    // Process each sheet
    for (const sheet of spreadsheet.data.sheets) {
      const sheetTitle = sheet.properties.title;
      console.log(`\n\n📋 Processing sheet: "${sheetTitle}"...`);
      
      // Get data from sheet
      const range = `${sheetTitle}!A2:AG1000`; // Skip header row, get columns A-AG
      
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: range,
        });
        
        const rows = response.data.values || [];
        console.log(`  ✅ Loaded ${rows.length} rows`);
        
        if (rows.length === 0) {
          console.log(`  ⏭️  No data, skipping`);
          continue;
        }
        
        // Get header to map columns
        const headerResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetTitle}!A1:AG1`,
        });
        const headers = headerResponse.data.values?.[0] || [];
        
        // Process rows
        console.log(`  🔄 Processing rows...`);
        let updated = 0;
        let created = 0;
        let skipped = 0;
        let errors = 0;
        
        for (const row of rows) {
          try {
            // Map row to object using headers
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index] || null;
            });
            
            const imageUrl = rowData['Image URL'] || rowData['Preview URL'];
            // Skip if no image URL (ОБЯЗАТЕЛЬНОЕ поле)
            if (!imageUrl) {
              skipped++;
              continue;
            }
            
            // Минимальная структура для второго агента (только 4 поля)
            const record = {
              image_url: imageUrl,                                    // ОБЯЗАТЕЛЬНО: ссылка на превью
              competitor_name: rowData['Advertiser Name'] || rowData['Competitor'] || sheetTitle,  // Название конкурента
              active_days: parseInt(rowData['Active Days']) || 0,     // Количество дней (INTEGER)
              ad_id: rowData['Ad ID'] || rowData['ID'] || null,      // ID креатива (уникальный идентификатор)
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
                errors++;
                continue;
              }
              existing = existingByImage;
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
                  console.log(`    📝 Updated ${updated} records...`);
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
                  console.log(`    ✨ Created ${created} records...`);
                }
              }
            }
          } catch (error) {
            errors++;
          }
        }
        
        console.log(`\n  📊 Sheet "${sheetTitle}" summary:`);
        console.log(`    ✅ Updated: ${updated}`);
        console.log(`    ✨ Created: ${created}`);
        console.log(`    ⏭️  Skipped: ${skipped}`);
        console.log(`    ❌ Errors: ${errors}`);
        
        totalUpdated += updated;
        totalCreated += created;
        totalSkipped += skipped;
        totalErrors += errors;
        
      } catch (error) {
        console.log(`  ❌ Error processing sheet: ${error.message}`);
      }
    }
    
    console.log('\n\n📊 Total Sync Summary:');
    console.log(`  ✅ Updated: ${totalUpdated}`);
    console.log(`  ✨ Created: ${totalCreated}`);
    console.log(`  ⏭️  Skipped: ${totalSkipped}`);
    console.log(`  ❌ Errors: ${totalErrors}`);
    console.log(`\n✅ Sync completed!`);
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// Run
syncFromSheetsV2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

