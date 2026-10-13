import { createClient } from "@/lib/supabase/server";
import { AgentForm } from "../AgentForm";

export default async function NewAgentPage() {
  const supabase = await createClient();
  
  const { data: botInstance } = await supabase.from('bot_instances').select('llm_provider').limit(1).single();
  const activeProvider = botInstance?.llm_provider || 'gemini';
  
  const { data: models } = await supabase
    .from("ai_models")
    .select("id, name, provider")
    .eq("is_active", true)
    .eq("provider", activeProvider);

  return <AgentForm models={models || []} activeProvider={activeProvider} />;
}
