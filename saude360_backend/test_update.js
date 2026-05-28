require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const reqBody = {
    nome: "Teste Paciente",
    email: "teste@paciente.com",
    whatsapp: "11999999999",
    cpf: "123.456.789-00",
    convenio_operadora: "Unimed",
    convenio_numero: "123456",
    convenio_validade: "2025-12"
  };

  const campos = {};
  const camposBasicos = ['nome', 'whatsapp', 'email', 'cpf'];
  const camposExtendidos = [
    'data_nascimento', 'nome_social', 'rg', 'sexo', 'estado_civil',
    'telefone_fixo', 'cep', 'cidade', 'endereco',
    'peso', 'altura', 'tipo_sanguineo', 'alergias', 'medicacoes',
    'convenio_operadora', 'convenio_numero', 'convenio_tipo',
    'convenio_validade',
    'emergencia_nome', 'emergencia_parentesco', 'emergencia_telefone', 'emergencia_email',
    'foto_perfil',
  ];

  for (const k of [...camposBasicos, ...camposExtendidos]) {
    if (reqBody[k] !== undefined) {
      campos[k] = reqBody[k] === '' ? null : reqBody[k];
    }
  }

  // Get a valid user ID (paciente)
  const { data: users } = await sb.from('usuarios').select('id').eq('papel', 'paciente').limit(1);
  if (!users || users.length === 0) {
    console.log("No paciente found to test.");
    return;
  }
  const userId = users[0].id;

  const { data, error } = await sb
    .from('usuarios')
    .update(campos)
    .eq('id', userId)
    .select('id, nome, convenio_operadora')
    .single();

  if (error) {
    console.log("UPDATE ERROR:", JSON.stringify(error, null, 2));
  } else {
    console.log("UPDATE SUCCESS:", data);
  }
}
run();
