require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const { data, error } = await sb.rpc('exec_sql', { sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usuarios';" });
  
  if (error) {
    console.log("RPC ERRO:", error.message);
    // Let's do a select to get the first user and print it to see types if possible
    const { data: users } = await sb.from('usuarios').select('*').limit(1);
    console.log("USER ROW:", users ? users[0] : null);
  } else {
    console.log("COLS:", data);
  }
}
run();
