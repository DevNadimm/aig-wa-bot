import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data, error } = await supabase.from('conversation_messages').select('*').limit(1);
  console.log(Object.keys(data?.[0] || {}));
  process.exit(0);
}
run();
