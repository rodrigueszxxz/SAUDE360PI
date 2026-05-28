/**
 * seed_usuarios_teste.js — Saúde 360
 * Gera hashes bcrypt corretos e insere usuários de teste no Supabase.
 *
 * Execute UMA VEZ depois de configurar o .env:
 *   node scripts/seed_usuarios_teste.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt   = require('bcrypt');
const supabase = require('../config/db');

const USUARIOS = [
  { nome: 'Paciente Teste',   email: 'paciente@teste.com',  senha: 'Paciente@123', cpf: '12345678901',  crm: null, papel: 'paciente' },
  { nome: 'Dr. Carlos Silva', email: 'carlos@clinica.com',  senha: 'Medico@123',   cpf: null, crm: 'CRM/CE-12345', papel: 'medico'   },
  { nome: 'Administrador',    email: 'admin@clinica.com',   senha: 'Admin@123',    cpf: null, crm: null, papel: 'admin'    },
];

async function main() {
  console.log('🔐 Gerando hashes bcrypt (rounds=12)...\n');

  for (const u of USUARIOS) {
    const senha_hash = await bcrypt.hash(u.senha, 12);

    const { error } = await supabase
      .from('usuarios')
      .upsert({
        nome: u.nome,
        email: u.email,
        senha_hash,
        cpf: u.cpf || null,
        crm: u.crm || null,
        papel: u.papel,
        ativo: true,
      }, { onConflict: 'email' });

    if (error) {
      console.error(`❌ Erro ao inserir ${u.email}:`, error.message);
    } else {
      console.log(`✅ ${u.papel.padEnd(8)} | ${u.email.padEnd(30)} | senha: ${u.senha}`);
    }
  }

  console.log('\n✅ Seed concluído! Use as credenciais acima para login.\n');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
