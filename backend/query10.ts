import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data: intents } = await supabase.from('intents').select('*');
  console.log('INTENTS:', JSON.stringify(intents, null, 2));
  
  const { data: workflows } = await supabase.from('workflows').select('*');
  console.log('WORKFLOWS:', JSON.stringify(workflows, null, 2));
  process.exit(0);
}
run();
