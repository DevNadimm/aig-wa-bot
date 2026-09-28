'use server'

import { createClient } from"@/lib/supabase/server"
import { revalidatePath } from"next/cache"
import { redirect } from"next/navigation"

export async function createAgent(formData: FormData) {
  const supabase = await createClient()

  const { data: authData } = await supabase.auth.getUser(); const user = authData?.user
  if (!user) throw new Error("Unauthorized")

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  const orgId = orgs?.[0]?.id
  if (!orgId) throw new Error("No organization found")

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const systemPrompt = formData.get("system_prompt") as string
  const modelId = formData.get("model_id") as string
  const temperature = parseFloat(formData.get("temperature") as string ||"0.7")
  const language = formData.get("language") as string
  
  const { data, error } = await supabase
    .from("ai_agents")
    .insert({
      organization_id: orgId,
      name,
      description,
      system_prompt: systemPrompt,
      model_id: modelId,
      temperature,
      language,
      status:"ACTIVE"
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating AI agent:", error)
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/agents")
  redirect(`/dashboard/agents`)
}
