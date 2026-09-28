import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data: customer } = await supabase.from('customers').select('id, phone, name').eq('phone', '280981240049808');
  console.log('Customer:', customer);
  if (customer && customer.length > 0) {
    const { data } = await supabase.from('conversations').select('id, state, created_at').eq('customer_id', customer[0].id);
    console.log('Conversations:', JSON.stringify(data, null, 2));
    
    await supabase.from('conversations').delete().eq('customer_id', customer[0].id).eq('state', 'RESOLVED');
    console.log('Deleted resolved');
  }
  process.exit(0);
}
run();
