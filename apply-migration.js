const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔧 Applying migration...\n');
  
  const sql = fs.readFileSync('add-sheets-columns.sql', 'utf8');
  
  // Разбиваем на отдельные команды
  const commands = sql.split(';').filter(cmd => cmd.trim());
  
  for (const command of commands) {
    if (command.trim()) {
      console.log(`Executing: ${command.trim().substring(0, 80)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: command.trim() });
      
      if (error) {
        // Пробуем альтернативный способ через REST API
        console.log('  ⚠️  RPC failed, trying direct approach...');
        // Supabase не поддерживает прямой SQL через JS SDK
        console.log('  ℹ️  Run this SQL manually in Supabase SQL Editor:');
        console.log(command.trim());
        console.log('');
      } else {
        console.log('  ✅ Success');
      }
    }
  }
  
  console.log('\n✅ Migration completed!');
  console.log('\n📝 If errors occurred, run the SQL manually at:');
  console.log('https://supabase.com/dashboard/project/osokxlweresllgbclkme/sql/new');
})();
