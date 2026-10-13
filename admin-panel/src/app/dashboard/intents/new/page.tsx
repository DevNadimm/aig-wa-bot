import { createClient } from "@/lib/supabase/server";
import { IntentForm } from "../IntentForm";

export default async function NewIntentPage() {
  const supabase = await createClient();

  const [{ data: workflows }, { data: agents }] = await Promise.all([
    supabase.from('workflows').select('id, name').order('name'),
    supabase.from('ai_agents').select('id, name').order('name'),
  ]);

  return <IntentForm workflows={workflows ?? []} agents={agents ?? []} />;
}
