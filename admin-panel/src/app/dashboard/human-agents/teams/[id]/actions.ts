'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateTeam(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string

  if (!name) throw new Error("Name is required")

  const { error } = await supabase
    .from('agent_teams')
    .update({
      name,
      description,
    })
    .eq('id', id)

  if (error) {
    console.error("Error updating team:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/human-agents/teams")
  redirect("/dashboard/human-agents/teams")
}

export async function deleteTeam(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  
  const { error } = await supabase
    .from('agent_teams')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Error deleting team:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/human-agents/teams")
  redirect("/dashboard/human-agents/teams")
}
