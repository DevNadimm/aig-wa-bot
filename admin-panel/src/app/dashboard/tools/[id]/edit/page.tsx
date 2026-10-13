import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ToolForm } from "../../ToolForm";

export default async function EditToolPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tool, error: toolError } = await supabase
    .from("tools")
    .select("*")
    .eq("id", id)
    .single();

  if (toolError || !tool) {
    notFound();
  }

  return <ToolForm tool={tool} />;
}
