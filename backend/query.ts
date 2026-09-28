import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data } = await supabase.from('workflow_steps').select('*').eq('workflow_id', '0fcf68e8-14ed-4083-baa8-f442000a8e24').order('order_index');
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
run();
