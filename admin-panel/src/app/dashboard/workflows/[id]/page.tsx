import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { WorkflowBuilder } from "./WorkflowBuilder";

export default async function WorkflowBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch workflow
  const { data: workflow, error: workflowError } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .single();

  if (workflowError || !workflow) {
    notFound();
  }

  // Fetch steps
  const { data: steps } = await supabase
    .from("workflow_steps")
    .select("*")
    .eq("workflow_id", id)
    .order("order_index", { ascending: true });

  return <WorkflowBuilder workflow={workflow} initialSteps={steps || []} />;
}
