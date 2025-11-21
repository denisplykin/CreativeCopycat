const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

async function uploadLogo() {
  console.log('📦 Uploading Algonova logo to Supabase...');

  // Check env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read logo file (use SVG for clean rendering without decorations)
  const logoPath = path.join(__dirname, '../public/algonova-logo.svg');

  if (!fs.existsSync(logoPath)) {
    console.error('❌ Logo file not found:', logoPath);
    process.exit(1);
  }

  const logoBuffer = fs.readFileSync(logoPath);
  console.log(`✅ Read logo file: ${(logoBuffer.length / 1024).toFixed(2)} KB`);

  // Upload to Supabase storage
  const bucketName = 'assets';
  const filePath = 'logos/algonova-logo.svg';

  try {
    // Check if bucket exists, create if not
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message);
      process.exit(1);
    }

    const bucketExists = buckets.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`📦 Creating bucket: ${bucketName}`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (createError) {
        console.error('❌ Failed to create bucket:', createError.message);
        process.exit(1);
      }
      console.log('✅ Bucket created');
    } else {
      console.log(`✅ Bucket exists: ${bucketName}`);
    }

    // Upload file (upsert = overwrite if exists)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, logoBuffer, {
        contentType: 'image/svg+xml',
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('❌ Upload failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Logo uploaded:', data.path);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log('🌐 Public URL:', publicUrlData.publicUrl);
    console.log('\n✨ Done! Use this URL in your prompts or mask generation.');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

uploadLogo();

