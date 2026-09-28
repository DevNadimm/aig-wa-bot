import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data } = await supabase.from('conversations').select('id, state, created_at').eq('customer_id', '5e1f0e20-94e8-42f0-ba3e-9080415392cf');
  console.log(JSON.stringify(data, null, 2));
  
  // delete resolved ones
  await supabase.from('conversations').delete().eq('customer_id', '5e1f0e20-94e8-42f0-ba3e-9080415392cf').eq('state', 'RESOLVED');
  
  process.exit(0);
}
run();
