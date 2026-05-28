require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const { data } = await sb.from('pagamentos').select('*').limit(1);
  console.log(data ? Object.keys(data[0] || {}) : 'No data');
}
run();
