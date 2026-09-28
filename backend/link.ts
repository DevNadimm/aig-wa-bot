import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const toolsToLink = [
    '4e1a6110-0713-429e-8810-87e0856199b4', // search_doctors
    '51d8b2f0-1299-4d3c-b600-88112a7e11d8', // book_appointment
    'df70eace-3663-43c6-8703-590deb8a8af0'  // check_availability
  ];
  
  for (const toolId of toolsToLink) {
    await supabase.from('workflow_step_tools').insert({
      step_id: 'f4546195-bab5-402e-a385-954217878b81',
      tool_id: toolId
    });
  }
  console.log('Tools linked successfully!');
  process.exit(0);
}
run();
