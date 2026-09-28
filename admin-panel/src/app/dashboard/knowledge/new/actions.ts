'use server'

import { createClient } from"@/lib/supabase/server"
import { revalidatePath } from"next/cache"
import { redirect } from"next/navigation"

export async function createKnowledge(formData: FormData) {
  const supabase = await createClient()

  const { data } = await supabase.auth.getUser(); const user = data?.user
  if (!user) throw new Error("Unauthorized")

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  const orgId = orgs?.[0]?.id
  if (!orgId) throw new Error("No organization found")

  const name = formData.get("name") as string
  const category = formData.get("category") as string
  const type = formData.get("type") as string
  const content = formData.get("content") as string
  
  // 1. Insert into knowledge_sources
  const { data: source, error: sourceError } = await supabase
    .from("knowledge_sources")
    .insert({
      organization_id: orgId,
      name,
      type,
      category,
      status:"PUBLISHED",
      created_by: user.id,
      updated_by: user.id
    })
    .select()
    .single()

  if (sourceError) {
    console.error("Error creating knowledge source:", sourceError)
    throw new Error(sourceError.message)
  }

  // 2. Insert into knowledge_documents
  const { error: docError } = await supabase
    .from("knowledge_documents")
    .insert({
      source_id: source.id,
      title: name,
      content,
      version: 1
    })

  if (docError) {
    console.error("Error creating knowledge document:", docError)
    throw new Error(docError.message)
  }

  revalidatePath("/dashboard/knowledge")
  redirect(`/dashboard/knowledge`)
}
