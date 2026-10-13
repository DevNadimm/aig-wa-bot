import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { IntentForm } from "../IntentForm";

export default async function EditIntentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: intent, error }, { data: workflows }, { data: agents }] = await Promise.all([
    supabase.from('intents').select('*').eq('id', id).single(),
    supabase.from('workflows').select('id, name').order('name'),
    supabase.from('ai_agents').select('id, name').order('name'),
  ]);

  if (error || !intent) {
    notFound();
  }

  return <IntentForm intent={intent} workflows={workflows ?? []} agents={agents ?? []} />;
}
