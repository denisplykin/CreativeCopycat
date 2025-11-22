const { google } = require('googleapis');
const fs = require('fs');

const SPREADSHEET_ID = '1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw';

async function downloadSheets() {
  console.log('🔄 Downloading all sheets...\n');
  
  try {
    // Load credentials
    console.log('📂 Loading credentials...');
    let credentials;
    
    if (fs.existsSync('./service-account.json')) {
      credentials = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
      console.log('✅ Credentials loaded from service-account.json');
    } else if (fs.existsSync('./google-credentials.json')) {
      credentials = JSON.parse(fs.readFileSync('./google-credentials.json', 'utf8'));
      console.log('✅ Credentials loaded from google-credentials.json');
    } else {
      throw new Error('No credentials file found!');
    }
    
    console.log('\n🔐 Initializing auth...');
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    console.log('✅ Auth initialized');
    
    // Get spreadsheet metadata
    console.log('\n📊 Getting spreadsheet info...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    console.log(`✅ Spreadsheet: ${spreadsheet.data.properties.title}`);
    console.log(`\n📄 Found ${spreadsheet.data.sheets.length} sheets:\n`);
    
    const allData = [];
    
    // Download each sheet
    for (let i = 0; i < spreadsheet.data.sheets.length; i++) {
      const sheet = spreadsheet.data.sheets[i];
      const sheetTitle = sheet.properties.title;
      console.log(`${i + 1}. Processing: "${sheetTitle}"`);
      
      try {
        // Get header
        const headerResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetTitle}!A1:AG1`,
        });
        const headers = headerResponse.data.values?.[0] || [];
        
        // Get data
        const dataResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetTitle}!A2:AG1000`,
        });
        const rows = dataResponse.data.values || [];
        
        console.log(`   ✅ ${rows.length} rows downloaded`);
        
        // Convert to objects
        rows.forEach(row => {
          const rowObj = { sheet: sheetTitle };
          headers.forEach((header, idx) => {
            rowObj[header] = row[idx] || '';
          });
          allData.push(rowObj);
        });
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Save to JSON
    console.log(`\n💾 Saving ${allData.length} total rows to JSON...`);
    fs.writeFileSync('sheets-data.json', JSON.stringify(allData, null, 2));
    console.log('✅ Saved to sheets-data.json');
    
    // Create CSV too
    console.log('\n💾 Creating CSV...');
    if (allData.length > 0) {
      const headers = Object.keys(allData[0]);
      const csv = [
        headers.join(','),
        ...allData.map(row => 
          headers.map(h => {
            const val = (row[h] || '').toString();
            return val.includes(',') || val.includes('"') || val.includes('\n') 
              ? `"${val.replace(/"/g, '""')}"` 
              : val;
          }).join(',')
        )
      ].join('\n');
      
      fs.writeFileSync('sheets-data.csv', csv);
      console.log('✅ Saved to sheets-data.csv');
    }
    
    console.log('\n✅ Download complete!\n');
    console.log('📊 Summary:');
    console.log(`   Sheets: ${spreadsheet.data.sheets.length}`);
    console.log(`   Total rows: ${allData.length}`);
    
    // Group by sheet
    const bySheet = {};
    allData.forEach(row => {
      bySheet[row.sheet] = (bySheet[row.sheet] || 0) + 1;
    });
    
    console.log('\n   Breakdown by sheet:');
    Object.entries(bySheet).forEach(([sheet, count]) => {
      console.log(`   - ${sheet}: ${count} rows`);
    });
    
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run with timeout
const timeoutMs = 30000;
console.log(`⏱️  Timeout set to ${timeoutMs/1000}s\n`);

Promise.race([
  downloadSheets(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout!')), timeoutMs)
  )
])
  .then(() => {
    console.log('\n✅ Success!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });

