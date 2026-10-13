import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { IntentForm } from "../IntentForm";

export default async function EditIntentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: intent, error } = await supabase
    .from('intents')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !intent) {
    notFound();
  }

  return <IntentForm intent={intent} />;
}
