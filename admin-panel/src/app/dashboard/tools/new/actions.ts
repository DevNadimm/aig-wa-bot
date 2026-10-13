'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createToolAction(formData: FormData) {
  const supabase = await createClient()

  const { data: authData } = await supabase.auth.getUser(); const user = authData?.user;
  if (!user) throw new Error("Unauthorized");

  // Get organization
  const { data: orgMember } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!orgMember) throw new Error("No organization found");

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const tool_type = formData.get("tool_type") as string
  const is_enabled = formData.get("is_enabled") === "on"

  const { data: tool, error } = await supabase
    .from('tools')
    .insert([
      {
        organization_id: orgMember.organization_id,
        name,
        description,
        tool_type,
        is_enabled,
        configuration: { method: "GET", url: "", headers: {}, parameters: [] },
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating tool:", error)
    throw new Error("Failed to create tool")
  }

  revalidatePath("/dashboard/tools")
  // redirect directly to the configure page
  redirect(`/dashboard/tools/${tool.id}`)
}
