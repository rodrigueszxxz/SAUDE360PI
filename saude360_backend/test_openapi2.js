require('dotenv').config({ path: '.env' });
async function test() {
  const res = await fetch(process.env.SUPABASE_URL + '/rest/v1/', {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_KEY,
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY
    }
  });
  const schema = await res.json();
  const tables = ['lista_espera', 'avaliacoes_nps', 'pagamentos'];
  for (const tbl of tables) {
    const def = schema.definitions[tbl];
    if (def) {
      console.log(`\nColumns of ${tbl}:`, Object.keys(def.properties));
    } else {
      console.log(`\n${tbl} NOT FOUND in spec`);
    }
  }
}
test();
