"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function disconnectWhatsApp(sessionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("whatsapp_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("Error disconnecting:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateApiKeys(
  botId: string,
  apiKey: string,
  provider: "gemini" | "groq" | "openrouter" = "groq"
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bot_instances")
    .update({
      llm_api_key: apiKey,
      llm_provider: provider,
    })
    .eq("id", botId);

  if (error) {
    console.error("Error updating API keys:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
