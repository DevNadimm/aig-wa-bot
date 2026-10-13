import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { HumanAgentForm } from "../HumanAgentForm";

export default async function EditHumanAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: teams } = await supabase.from('agent_teams').select('*').order('name');
  
  const { data: agent, error } = await supabase
    .from("human_agents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !agent) {
    notFound();
  }

  return <HumanAgentForm agent={agent} teams={teams || []} />;
}
