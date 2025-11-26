const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

const SPREADSHEET_ID = '1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw';
const SHEET_ID = 1915622541;

async function testConnection() {
  console.log('🔍 Testing Google Sheets connection...\n');
  
  try {
    // Load credentials from multiple sources
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
    
    console.log(`   Email: ${credentials.client_email}`);
    
    // Initialize auth
    console.log('\n🔐 Initializing auth...');
    const serviceAccountAuth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    console.log('✅ Auth initialized');
    
    // Load spreadsheet
    console.log('\n📊 Loading spreadsheet...');
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    
    console.log('   Calling doc.loadInfo()...');
    await doc.loadInfo();
    console.log(`✅ Loaded: ${doc.title}`);
    
    // Get sheet
    console.log('\n📄 Getting sheet...');
    const sheet = doc.sheetsById[SHEET_ID];
    if (!sheet) {
      throw new Error(`Sheet with gid ${SHEET_ID} not found`);
    }
    console.log(`✅ Found: ${sheet.title}`);
    console.log(`   Rows: ${sheet.rowCount}`);
    console.log(`   Columns: ${sheet.columnCount}`);
    
    // Load rows
    console.log('\n📥 Loading rows (limit 5)...');
    const rows = await sheet.getRows({ limit: 5 });
    console.log(`✅ Loaded ${rows.length} rows`);
    
    if (rows.length > 0) {
      console.log('\n📋 First row data:');
      const firstRow = rows[0];
      console.log('   Image URL:', firstRow.get('Image URL')?.substring(0, 60) + '...');
      console.log('   Advertiser Name:', firstRow.get('Advertiser Name'));
      console.log('   Active Days:', firstRow.get('Active Days'));
    }
    
    console.log('\n✅ Connection test successful!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testConnection();

