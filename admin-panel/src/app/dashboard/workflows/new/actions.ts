'use server'

import { createClient } from"@/lib/supabase/server"
import { revalidatePath } from"next/cache"
import { redirect } from"next/navigation"

export async function createWorkflow(formData: FormData) {
  const supabase = await createClient()

  // First get the org id from the user
  const { data: authData } = await supabase.auth.getUser(); const user = authData?.user
  if (!user) throw new Error("Unauthorized")

  // For MVP, get the first organization
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  const orgId = orgs?.[0]?.id

  if (!orgId) throw new Error("No organization found")

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const triggerType = formData.get("trigger_type") as string
  const timeoutSeconds = parseInt(formData.get("timeout_seconds") as string ||"300")

  const { data, error } = await supabase
    .from("workflows")
    .insert({
      organization_id: orgId,
      name,
      description,
      trigger_type: triggerType,
      timeout_seconds: timeoutSeconds,
      status:"DRAFT"
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating workflow:", error)
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/workflows")
  // Redirect to the builder
  redirect(`/dashboard/workflows/${data.id}`)
}
