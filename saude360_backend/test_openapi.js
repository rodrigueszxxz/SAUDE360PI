require('dotenv').config({ path: '.env' });
async function test() {
  const res = await fetch(process.env.SUPABASE_URL + '/rest/v1/', {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_KEY,
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY
    }
  });
  const schema = await res.json();
  const def = schema.definitions.lista_espera;
  if (def) {
    console.log('Columns of lista_espera:', Object.keys(def.properties));
  } else {
    console.log('Table lista_espera not found in OpenAPI spec.');
  }

  const npsDef = schema.definitions.avaliacoes_nps;
  if (npsDef) {
    console.log('Columns of avaliacoes_nps:', Object.keys(npsDef.properties));
  }
}
test();
