import { createClient } from "@/lib/supabase/server";
import { HumanAgentForm } from "../HumanAgentForm";

export default async function NewAgentPage() {
  const supabase = await createClient();
  const { data: teams } = await supabase.from('agent_teams').select('*').order('name');

  return <HumanAgentForm teams={teams || []} />;
}
