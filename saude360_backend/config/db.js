const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Variáveis de ambiente ausentes!');
  console.error('   Copie o arquivo de exemplo e preencha suas credenciais:');
  console.error('   cp .env.example .env\n');
  console.error('   Campos obrigatórios: SUPABASE_URL, SUPABASE_SERVICE_KEY\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Cliente Supabase inicializado.');

module.exports = supabase;
