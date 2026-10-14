'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function addStep(workflowId: string, stepType: string, orderIndex: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("workflow_steps")
    .insert({
      workflow_id: workflowId,
      step_type: stepType,
      name: `New ${stepType} Step`,
      order_index: orderIndex,
      configuration: {}
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/workflows/${workflowId}`)
  return data
}

export async function updateStep(stepId: string, workflowId: string, name: string, configuration: any) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("workflow_steps")
    .update({
      name,
      configuration
    })
    .eq("id", stepId)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/workflows/${workflowId}`)
}

export async function deleteStep(stepId: string, workflowId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("workflow_steps")
    .delete()
    .eq("id", stepId)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/workflows/${workflowId}`)
}

export async function reorderSteps(workflowId: string, stepIdsInOrder: string[]) {
  const supabase = await createClient()

  for (let i = 0; i < stepIdsInOrder.length; i++) {
    await supabase
      .from("workflow_steps")
      .update({ order_index: i })
      .eq("id", stepIdsInOrder[i])
  }

  revalidatePath(`/dashboard/workflows/${workflowId}`)
}

export async function updateWorkflow(
  workflowId: string,
  data: {
    name?: string;
    description?: string;
    trigger_type?: string;
    status?: string;
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("workflows")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workflowId)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/workflows/${workflowId}`)
  revalidatePath(`/dashboard/workflows`)
}

export async function deleteWorkflow(workflowId: string) {
  const supabase = await createClient()

  // Defensively nullify foreign key references in conversations
  await supabase
    .from("conversations")
    .update({ current_workflow_id: null })
    .eq("current_workflow_id", workflowId)

  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", workflowId)

  if (error) throw new Error(error.message)

  revalidatePath("/dashboard/workflows")
}

export interface SaveStepPayload {
  id?: string;
  step_type: string;
  name: string;
  order_index: number;
  configuration: any;
}

export async function saveWorkflowAllChanges(
  workflowId: string,
  status: string,
  stepsPayload: SaveStepPayload[],
  deletedStepIds: string[]
) {
  const supabase = await createClient();

  // 1. Update workflow status and updated_at
  const { error: wfError } = await supabase
    .from("workflows")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workflowId);

  if (wfError) throw new Error(wfError.message);

  // 2. Delete removed steps
  if (deletedStepIds.length > 0) {
    await supabase
      .from("conversations")
      .update({ current_step_id: null })
      .in("current_step_id", deletedStepIds);

    const { error: delError } = await supabase
      .from("workflow_steps")
      .delete()
      .in("id", deletedStepIds)
      .eq("workflow_id", workflowId);

    if (delError) throw new Error(delError.message);
  }

  // 3. Update existing steps
  const updates = stepsPayload.filter((s) => !!s.id);
  if (updates.length > 0) {
    const updatePromises = updates.map((step) =>
      supabase
        .from("workflow_steps")
        .update({
          name: step.name,
          order_index: step.order_index,
          configuration: step.configuration,
          updated_at: new Date().toISOString(),
        })
        .eq("id", step.id!)
        .eq("workflow_id", workflowId)
    );
    const results = await Promise.all(updatePromises);
    for (const res of results) {
      if (res.error) throw new Error(res.error.message);
    }
  }

  // 4. Insert new steps
  const inserts = stepsPayload.filter((s) => !s.id);
  if (inserts.length > 0) {
    const { error: insError } = await supabase
      .from("workflow_steps")
      .insert(
        inserts.map((step) => ({
          workflow_id: workflowId,
          step_type: step.step_type,
          name: step.name,
          order_index: step.order_index,
          configuration: step.configuration,
        }))
      );
    if (insError) throw new Error(insError.message);
  }

  // 5. Fetch updated full list of steps in order to return to client
  const { data: allSteps, error: fetchError } = await supabase
    .from("workflow_steps")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("order_index", { ascending: true });

  if (fetchError) throw new Error(fetchError.message);

  revalidatePath(`/dashboard/workflows/${workflowId}`);
  revalidatePath(`/dashboard/workflows`);

  return allSteps;
}
