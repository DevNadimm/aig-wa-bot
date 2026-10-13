import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AgentForm } from "../AgentForm";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: botInstance } = await supabase.from('bot_instances').select('llm_provider').limit(1).single();
  const activeProvider = botInstance?.llm_provider || 'gemini';
  
  const { data: models } = await supabase
    .from("ai_models")
    .select("id, name, provider")
    .eq("is_active", true)
    .eq("provider", activeProvider);
  
  const { data: agent, error } = await supabase
    .from("ai_agents")
    .select("*, ai_models(provider)")
    .eq("id", id)
    .single();

  if (error || !agent) {
    notFound();
  }

  return <AgentForm agent={agent} models={models || []} activeProvider={activeProvider} />;
}
