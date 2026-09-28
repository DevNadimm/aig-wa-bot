import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data: cols, error } = await supabase.rpc('get_conversations_schema');
  console.log('We might not have rpc. Let us just select 1 conversation');
  const { data } = await supabase.from('conversations').select('*').limit(1);
  console.log(Object.keys(data[0]));
  process.exit(0);
}
run();
