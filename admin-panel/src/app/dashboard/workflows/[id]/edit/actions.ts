'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateWorkflow(formData: FormData) {
  const supabase = await createClient()

  const { data } = await supabase.auth.getUser(); const user = data?.user
  if (!user) throw new Error("Unauthorized")

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const trigger_type = formData.get("trigger_type") as string
  const timeout_seconds = parseInt(formData.get("timeout_seconds") as string || "300")
  const description = formData.get("description") as string

  const { error } = await supabase
    .from('workflows')
    .update({
      name,
      trigger_type,
      timeout_seconds,
      description
    })
    .eq('id', id)

  if (error) {
    console.error("Error updating workflow:", error)
    throw new Error("Failed to update workflow")
  }

  revalidatePath("/dashboard/workflows")
  redirect("/dashboard/workflows")
}

export async function deleteWorkflow(formData: FormData) {
  const supabase = await createClient()

  const { data } = await supabase.auth.getUser(); const user = data?.user
  if (!user) throw new Error("Unauthorized")

  const id = formData.get("id") as string

  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Error deleting workflow:", error)
    throw new Error("Failed to delete workflow")
  }

  revalidatePath("/dashboard/workflows")
  redirect("/dashboard/workflows")
}
