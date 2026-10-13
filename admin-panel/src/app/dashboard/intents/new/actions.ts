'use server'

import { createClient } from"@/lib/supabase/server";
import { revalidatePath } from"next/cache";
import { redirect } from"next/navigation";

export async function createIntent(formData: FormData) {
  const supabase = await createClient();

  // For MVP, we fetch the first organization. In production, get from user's session.
  const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
  
  if (!org) {
    throw new Error("No organization found. Run backend to seed database first.");
  }

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const description = formData.get('description') as string;
  const status = formData.get('status') as string || 'ACTIVE';
  const workflow_id = (formData.get('workflow_id') as string) || null;
  const agent_id = (formData.get('agent_id') as string) || null;

  const { error } = await supabase
    .from('intents')
    .insert([{
      organization_id: org.id,
      name,
      slug,
      description,
      status,
      workflow_id: workflow_id || null,
      agent_id: agent_id || null,
    }]);

  if (error) {
    console.error("Error creating intent:", error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/intents');
  redirect('/dashboard/intents');
}
