import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  await supabase.from('intents').delete().eq('id', 'f106c4f6-ccc1-455e-8cde-c82a02620c32');
  console.log('Deleted intent fhsd');
  
  const workflowsToDelete = [
    'c938209d-270a-4085-a959-c13515fb18ea',
    '703d6cf9-8d8d-4a32-8558-fd345d2198e5',
    'f01ab18f-10b9-4581-8671-bbff23f5cde0',
    'ca1ecb0d-6e48-4d47-8d28-ae3d4995d100',
    '263af0ec-c61a-49d4-b92a-87b3b3f24f2e',
    '178333d0-5826-4af6-9691-42ea330b5d20'
  ];
  
  for (const id of workflowsToDelete) {
    await supabase.from('workflows').delete().eq('id', id);
    console.log('Deleted workflow', id);
  }
  
  process.exit(0);
}
run();
