import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data } = await supabase.from('tools').select('*');
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
run();
