require('dotenv').config({ path: '.env' });
const supabase = require('./config/db.js');
async function test() {
  const { data } = await supabase.from('avaliacoes_nps').select().limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    // If empty, let's insert a dummy row that fails, and catch the error, but this didn't give column list.
    // Let's use the PostgREST introspection endpoint: OPTIONS request
    const res = await fetch(process.env.SUPABASE_URL + '/rest/v1/avaliacoes_nps', {
      method: 'OPTIONS',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    const schema = await res.json();
    console.log('Columns:', Object.keys(schema.properties));
  }
}
test();
