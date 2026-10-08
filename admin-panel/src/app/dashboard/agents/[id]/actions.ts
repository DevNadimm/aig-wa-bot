'use server'

import { createClient } from"@/lib/supabase/server"
import { revalidatePath } from"next/cache"
import { redirect } from"next/navigation"

export async function updateAgent(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const systemPrompt = formData.get("system_prompt") as string
  const modelId = formData.get("model_id") as string
  const temperature = parseFloat(formData.get("temperature") as string ||"0.7")
  const language = formData.get("language") as string
  
  const updateData: any = {
    name,
    description,
    system_prompt: systemPrompt,
    temperature,
    language,
  }
  
  if (modelId) {
    updateData.model_id = modelId;
  }
  
  const { error } = await supabase
    .from("ai_agents")
    .update(updateData)
    .eq("id", id)

  if (error) {
    console.error("Error updating AI agent:", error)
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/agents")
  redirect(`/dashboard/agents`)
}

export async function deleteAgent(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get("id") as string

  const { error } = await supabase
    .from("ai_agents")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting AI agent:", error)
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/agents")
  redirect(`/dashboard/agents`)
}
