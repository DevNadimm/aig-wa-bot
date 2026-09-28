import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data } = await supabase.rpc('get_schema_info', { table_name: 'conversation_messages' });
  console.log(data);
  process.exit(0);
}
run();
