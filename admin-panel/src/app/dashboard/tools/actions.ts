"use server";

import { createClient } from"@/lib/supabase/server";
import { revalidatePath } from"next/cache";

export async function createTool(data: any) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser(); const user = authData?.user;
  if (!user) throw new Error("Unauthorized");

  // Get organization
  const { data: orgMember } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!orgMember) throw new Error("No organization found");

  const { data: tool, error } = await supabase
    .from("tools")
    .insert([
      {
        organization_id: orgMember.organization_id,
        name: data.name,
        description: data.description,
        tool_type: data.tool_type,
        is_enabled: data.is_enabled,
        configuration: data.configuration,
      }
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (data.parameters && data.parameters.length > 0) {
    const params = data.parameters.map((p: any) => ({
      tool_id: tool.id,
      name: p.name,
      param_type: p.param_type,
      is_required: p.is_required,
      description: p.description
    }));
    
    await supabase.from("tool_parameters").insert(params);
  }

  revalidatePath("/dashboard/tools");
  return tool;
}

export async function updateTool(id: string, data: any) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tools")
    .update({
      name: data.name,
      description: data.description,
      tool_type: data.tool_type,
      is_enabled: data.is_enabled,
      configuration: data.configuration,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Recreate parameters
  await supabase.from("tool_parameters").delete().eq("tool_id", id);
  
  if (data.parameters && data.parameters.length > 0) {
    const params = data.parameters.map((p: any) => ({
      tool_id: id,
      name: p.name,
      param_type: p.param_type,
      is_required: p.is_required,
      description: p.description
    }));
    
    await supabase.from("tool_parameters").insert(params);
  }

  revalidatePath("/dashboard/tools");
  revalidatePath(`/dashboard/tools/${id}`);
  return { success: true };
}

export async function deleteTool(id: string) {
  const supabase = await createClient();
  await supabase.from("tool_parameters").delete().eq("tool_id", id);
  const { error } = await supabase.from("tools").delete().eq("id", id);
  
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/tools");
  return { success: true };
}
