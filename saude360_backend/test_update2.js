require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const reqBody = {
    nome: "João Teste",
    email: "joao@teste.com",
    whatsapp: "11999999999",
    telefone_fixo: null,
    data_nascimento: null,
    nome_social: null,
    rg: null,
    sexo: null,
    estado_civil: null,
    cep: null,
    cidade: null,
    endereco: null,
    peso: null,
    altura: null,
    tipo_sanguineo: null,
    alergias: null,
    medicacoes: null,
    convenio_operadora: "Unimed",
    convenio_numero: "12345",
    convenio_tipo: null,
    convenio_validade: "2025-12",
    emergencia_nome: null,
    emergencia_parentesco: null,
    emergencia_telefone: null,
    emergencia_email: null,
    cpf: "123.456.789-00"
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
      if (k === 'convenio_validade' && reqBody[k] && reqBody[k].length === 7) {
        campos[k] = reqBody[k] + '-01';
      } else {
        campos[k] = reqBody[k] === '' ? null : reqBody[k];
      }
    }
  }

  const { data: users } = await sb.from('usuarios').select('id').eq('papel', 'paciente').limit(1);
  if (!users || users.length === 0) return console.log("No paciente");
  
  const userId = users[0].id;

  const { data, error } = await sb
    .from('usuarios')
    .update(campos)
    .eq('id', userId)
    .select('id, nome, cpf, convenio_operadora, convenio_numero, convenio_validade')
    .single();

  if (error) {
    console.log("UPDATE ERROR:", JSON.stringify(error, null, 2));
  } else {
    console.log("UPDATE SUCCESS:", data);
  }
}
run();
