import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data: steps } = await supabase.from('workflow_steps').select('workflow_id');
  const counts = steps?.reduce((acc: any, cur) => { acc[cur.workflow_id] = (acc[cur.workflow_id] || 0) + 1; return acc; }, {});
  console.log('Steps per workflow:', counts);
  process.exit(0);
}
run();
