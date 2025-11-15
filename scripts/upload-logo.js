/**
 * Extract PNG from SVG and upload Algonova logo to Supabase
 */
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse base64 PNG from SVG
const svgContent = fs.readFileSync('/Users/pavelloucker/Documents/Creative-Generator/figma-plugin/Algo-logo.svg', 'utf-8');

// Extract base64 data from xlink:href
const base64Match = svgContent.match(/xlink:href="data:image\/png;base64,([^"]+)"/);

if (!base64Match) {
  console.error('❌ Could not find base64 PNG in SVG');
  process.exit(1);
}

const base64Data = base64Match[1];
const pngBuffer = Buffer.from(base64Data, 'base64');

console.log(`✅ Extracted PNG from SVG: ${pngBuffer.length} bytes`);

// Save locally first
fs.writeFileSync('public/algonova-logo.png', pngBuffer);
console.log('💾 Saved to public/algonova-logo.png');

// Upload to Supabase
async function uploadToSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('\n📤 Uploading to Supabase Storage...');
  
  const { data, error } = await supabase.storage
    .from('assets')
    .upload('algonova-logo.png', pngBuffer, {
      contentType: 'image/png',
      upsert: true // Overwrite if exists
    });
  
  if (error) {
    console.error('❌ Upload error:', error);
    process.exit(1);
  }
  
  console.log('✅ Uploaded successfully:', data);
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('assets')
    .getPublicUrl('algonova-logo.png');
  
  console.log('\n🌐 Public URL:', urlData.publicUrl);
  console.log('\n🎉 Logo upload complete!');
  console.log('\n📝 Add this to your .env.local:');
  console.log(`ALGONOVA_LOGO_URL=${urlData.publicUrl}`);
}

uploadToSupabase().catch(console.error);

