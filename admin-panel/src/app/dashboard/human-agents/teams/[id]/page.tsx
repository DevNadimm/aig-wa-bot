import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TeamForm } from "../TeamForm";

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: team, error } = await supabase
    .from("agent_teams")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !team) {
    notFound();
  }

  return <TeamForm team={team} />;
}
