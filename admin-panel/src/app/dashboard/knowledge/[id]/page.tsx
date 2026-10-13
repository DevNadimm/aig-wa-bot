import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { KnowledgeForm } from "../KnowledgeForm";

export default async function EditKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Fetch source
  const { data: source, error: sourceError } = await supabase
    .from("knowledge_sources")
    .select("*")
    .eq("id", id)
    .single();

  if (sourceError || !source) {
    notFound();
  }

  // Fetch document content
  const { data: document } = await supabase
    .from("knowledge_documents")
    .select("content")
    .eq("source_id", id)
    .single();

  return <KnowledgeForm source={source} document={document} />;
}
