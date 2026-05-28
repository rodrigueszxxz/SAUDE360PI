require('dotenv').config({ path: '.env' });
async function test() {
  const res = await fetch(process.env.SUPABASE_URL + '/rest/v1/lista_espera', {
    method: 'OPTIONS',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_KEY,
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY
    }
  });
  const schema = await res.json();
  console.log('Columns:', Object.keys(schema.properties || {}));
}
test();
