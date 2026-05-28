require('dotenv').config({ path: '.env' });
const supabase = require('./config/db.js');
async function test() {
  const { data, error } = await supabase.from('auditoria_prontuarios').insert([{
    acao: '123456789012345678901', // 21 chars
    entidade: 'prontuarios',
    entidade_id: 1,
    usuario_id: 1
  }]).select().single();
  console.log('Error:', error?.message);
}
test();
