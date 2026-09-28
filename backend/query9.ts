import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data } = await supabase.from('step_executions').select('*').eq('tool_name', 'search_doctors').order('created_at', { ascending: false }).limit(1);
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
run();
