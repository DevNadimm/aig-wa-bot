'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateIntent(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const description = formData.get('description') as string;
  const workflow_id = (formData.get('workflow_id') as string) || null;
  const agent_id = (formData.get('agent_id') as string) || null;

  const { error } = await supabase
    .from('intents')
    .update({
      name,
      slug,
      description,
      workflow_id: workflow_id || null,
      agent_id: agent_id || null,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating intent:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/intents');
  redirect('/dashboard/intents');
}

export async function deleteIntent(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;

  const { error } = await supabase
    .from('intents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting intent:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/intents');
  redirect('/dashboard/intents');
}
