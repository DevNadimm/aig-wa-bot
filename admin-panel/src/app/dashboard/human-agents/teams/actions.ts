"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createTeam(formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string

  if (!name) throw new Error("Name is required")

  // Organization ID - fetch the first org for simplicity
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1).single()
  
  const { error } = await supabase.from('agent_teams').insert({
    organization_id: orgs?.id,
    name,
    description: description || null
  })

  if (error) {
    console.error("Error creating team", error)
    throw new Error("Failed to create team")
  }

  revalidatePath('/dashboard/human-agents/teams')
  redirect('/dashboard/human-agents/teams')
}

export async function deleteTeam(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('agent_teams').delete().eq('id', id)
  
  if (error) {
    console.error("Error deleting team", error)
    throw new Error("Failed to delete team")
  }

  revalidatePath('/dashboard/human-agents/teams')
}
