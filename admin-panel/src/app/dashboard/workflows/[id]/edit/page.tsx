import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { WorkflowForm } from "../../WorkflowForm";

export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: workflow, error: workflowError } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .single();

  if (workflowError || !workflow) {
    notFound();
  }

  return <WorkflowForm workflow={workflow} />;
}
