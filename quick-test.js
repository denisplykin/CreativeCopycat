const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

const SPREADSHEET_ID = '1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw';

async function quickTest() {
  console.log('🔍 Quick connection test...\n');
  
  try {
    // Load credentials from multiple sources
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
    
    const serviceAccountAuth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    
    console.log('⏳ Loading spreadsheet (this may take 10-20 seconds)...');
    const startTime = Date.now();
    
    await doc.loadInfo();
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Loaded in ${elapsed}s: ${doc.title}`);
    console.log(`📊 Sheets count: ${doc.sheetCount}`);
    
    // List all sheets
    console.log('\n📄 Available sheets:');
    doc.sheetsByIndex.forEach((sheet, i) => {
      console.log(`  ${i + 1}. ${sheet.title} (gid: ${sheet.sheetId})`);
    });
    
    console.log('\n✅ Connection successful!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.status) console.error('Status:', error.status);
    process.exit(1);
  }
}

quickTest();

