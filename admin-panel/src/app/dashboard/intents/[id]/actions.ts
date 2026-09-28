'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateIntent(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const description = formData.get('description') as string;

  const { error } = await supabase
    .from('intents')
    .update({ name, slug, description })
    .eq('id', id);

  if (error) {
    console.error('Error updating intent:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/intents');
  redirect('/dashboard/intents');
}
