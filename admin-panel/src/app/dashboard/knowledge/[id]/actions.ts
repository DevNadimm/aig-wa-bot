'use server'

import { createClient } from"@/lib/supabase/server"
import { revalidatePath } from"next/cache"
import { redirect } from"next/navigation"

export async function updateKnowledge(formData: FormData) {
  const supabase = await createClient()

  const { data } = await supabase.auth.getUser(); const user = data?.user
  if (!user) throw new Error("Unauthorized")

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const category = formData.get("category") as string
  const type = formData.get("type") as string
  const content = formData.get("content") as string
  
  // Update knowledge_sources
  const { error: sourceError } = await supabase
    .from("knowledge_sources")
    .update({
      name,
      type,
      category,
      updated_by: user.id
    })
    .eq("id", id)

  if (sourceError) {
    console.error("Error updating knowledge source:", sourceError)
    throw new Error(sourceError.message)
  }

  // Find existing document
  const { data: doc } = await supabase
    .from("knowledge_documents")
    .select("id")
    .eq("source_id", id)
    .single()

  if (doc) {
    // Update existing document
    const { error: docError } = await supabase
      .from("knowledge_documents")
      .update({
        title: name,
        content
      })
      .eq("id", doc.id)

    if (docError) {
      console.error("Error updating knowledge document:", docError)
      throw new Error(docError.message)
    }
  } else {
    // If somehow it doesn't exist, insert it
    const { error: docError } = await supabase
      .from("knowledge_documents")
      .insert({
        source_id: id,
        title: name,
        content,
        version: 1
      })
      
    if (docError) {
      console.error("Error inserting knowledge document:", docError)
      throw new Error(docError.message)
    }
  }

  revalidatePath("/dashboard/knowledge")
  redirect(`/dashboard/knowledge`)
}

export async function deleteKnowledge(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get("id") as string

  // Cascading delete should handle knowledge_documents if setup correctly,
  // but let's delete explicitly just in case the FK cascade isn't configured.
  await supabase.from("knowledge_documents").delete().eq("source_id", id)
  
  const { error } = await supabase
    .from("knowledge_sources")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting knowledge source:", error)
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/knowledge")
  redirect(`/dashboard/knowledge`)
}
