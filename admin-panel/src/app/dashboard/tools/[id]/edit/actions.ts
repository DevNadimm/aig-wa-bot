'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateToolAction(formData: FormData) {
  const supabase = await createClient()

  const { data: authData } = await supabase.auth.getUser(); const user = authData?.user;
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const tool_type = formData.get("tool_type") as string
  const is_enabled = formData.get("is_enabled") === "on"

  const { error } = await supabase
    .from('tools')
    .update({
      name,
      description,
      tool_type,
      is_enabled
    })
    .eq('id', id)

  if (error) {
    console.error("Error updating tool:", error)
    throw new Error("Failed to update tool")
  }

  revalidatePath("/dashboard/tools")
  redirect("/dashboard/tools")
}

export async function deleteToolAction(formData: FormData) {
  const supabase = await createClient()

  const { data: authData } = await supabase.auth.getUser(); const user = authData?.user;
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string

  const { error } = await supabase
    .from('tools')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Error deleting tool:", error)
    throw new Error("Failed to delete tool")
  }

  revalidatePath("/dashboard/tools")
  redirect("/dashboard/tools")
}
