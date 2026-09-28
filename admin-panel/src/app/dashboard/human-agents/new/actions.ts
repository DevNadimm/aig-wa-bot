'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function createHumanAgent(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const team_id = formData.get('team_id') as string
  const auth_user_id = formData.get('auth_user_id') as string
  const password = formData.get('password') as string
  
  if (!name) throw new Error("Name is required")
  
  let finalAuthUserId = auth_user_id;

  // Auto-create auth user if email and password are provided, but no auth_user_id
  if (!finalAuthUserId && email && password) {
    // Create a temporary client that does NOT save sessions to cookies (won't log admin out)
    const tempSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    
    let authData, authError;

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // If service role key exists, use admin API (bypasses email confirmation)
      const res = await tempSupabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { name: name }
      });
      authData = res.data;
      authError = res.error;
    } else {
      // Fallback to normal signUp using ANON key
      const res = await tempSupabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { name: name }
        }
      });
      authData = res.data;
      authError = res.error;
    }

    if (authError) {
      console.error("Failed to auto-create auth user:", authError);
      throw new Error("Failed to auto-create Supabase User: " + authError.message);
    } else if (authData?.user) {
      finalAuthUserId = authData.user.id;
    }
  }

  // Organization ID - fetch the first org for simplicity
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1).single()
  
  await supabase.from('human_agents').insert({
    organization_id: orgs?.id,
    name,
    email: email || null,
    team_id: team_id ? team_id : null,
    auth_user_id: finalAuthUserId || null,
    role: 'Agent'
  })
  
  revalidatePath("/dashboard/human-agents")
  redirect("/dashboard/human-agents")
}
