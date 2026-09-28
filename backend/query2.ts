import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from './src/config/supabase.js';
async function run() {
  const { data } = await supabase.from('workflow_step_tools').select('tool_id, tools(name, description)').eq('step_id', 'f4546195-bab5-402e-a385-954217878b81');
  console.log('Tools linked to step:', JSON.stringify(data, null, 2));

  const { data: step } = await supabase.from('workflow_steps').select('*').eq('id', 'f4546195-bab5-402e-a385-954217878b81').single();
  const agentId = step.configuration.agent_id;
  console.log('Agent ID in step:', agentId);
  
  if (agentId) {
    const { data: agentTools } = await supabase.from('ai_agent_tools').select('tool_id, tools(name, description)').eq('agent_id', agentId);
    console.log('Tools linked to agent:', JSON.stringify(agentTools, null, 2));
  }
  process.exit(0);
}
run();
