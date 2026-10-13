'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateHumanAgent(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const team_id = formData.get('team_id') as string

  if (!name) throw new Error("Name is required")

  const { error } = await supabase
    .from('human_agents')
    .update({
      name,
      team_id: team_id ? team_id : null,
    })
    .eq('id', id)

  if (error) {
    console.error("Error updating human agent:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/human-agents")
  redirect("/dashboard/human-agents")
}

export async function deleteHumanAgent(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  
  const { error } = await supabase
    .from('human_agents')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Error deleting human agent:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/human-agents")
  redirect("/dashboard/human-agents")
}
