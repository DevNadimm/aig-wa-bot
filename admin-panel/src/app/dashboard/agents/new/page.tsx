import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import Link from"next/link";
import { ArrowLeft01Icon } from "hugeicons-react";
import { createClient } from"@/lib/supabase/server";
import { createAgent } from"./actions";

export default async function NewAgentPage() {
  const supabase = await createClient();
  
  const { data: botInstance } = await supabase.from('bot_instances').select('llm_provider').limit(1).single();
  const activeProvider = botInstance?.llm_provider || 'gemini';
  
  const { data: models } = await supabase
    .from("ai_models")
    .select("id, name, provider")
    .eq("is_active", true)
    .eq("provider", activeProvider);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agents">
          <Button variant="outline" size="icon">
            <ArrowLeft01Icon className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Create AI Agent Persona</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure instructions and rules for a specialized AI worker.</p>
        </div>
      </div>

      <form action={createAgent}>
        <Card className="border-zinc-800 bg-[#0c0c0e]">
          <CardHeader className="border-b border-zinc-800/50 pb-6">
            <CardTitle className="text-lg text-zinc-100">Agent Configuration</CardTitle>
            <CardDescription className="text-zinc-400">
              Define the AI model, system prompt, and capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="name" className="text-zinc-200 font-medium text-sm">Agent Name</Label>
                <p className="text-zinc-500 text-sm mt-1">A role name for this agent (e.g. Visa Assistant, Router).</p>
              </div>
              <div className="col-span-2">
                <Input id="name" name="name" placeholder="Patient Care Assistant" required className="bg-[#121214] border-zinc-700 text-zinc-100" />
              </div>
            </div>

            <hr className="border-zinc-800/50" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="description" className="text-zinc-200 font-medium text-sm">Description</Label>
                <p className="text-zinc-500 text-sm mt-1">Briefly explain what this agent handles.</p>
              </div>
              <div className="col-span-2">
                <Input id="description" name="description" placeholder="Answers general hospital inquiries." required className="bg-[#121214] border-zinc-700 text-zinc-100" />
              </div>
            </div>

            <hr className="border-zinc-800/50" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="system_prompt" className="text-zinc-200 font-medium text-sm">System Prompt</Label>
                <p className="text-zinc-500 text-sm mt-1">The core instructions. Define the rules, boundaries, and personality of this agent.</p>
              </div>
              <div className="col-span-2">
                <Textarea 
                  id="system_prompt" 
                  name="system_prompt" 
                  placeholder="You are a helpful medical assistant for AIG Hospital. You MUST NOT give clinical advice..." 
                  rows={8} 
                  required 
                  className="bg-[#121214] border-zinc-700 text-zinc-100 font-mono text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="model_id" className="text-zinc-200 font-medium text-sm">AI Model</Label>
                <p className="text-zinc-500 text-sm mt-1">Select the exact model to use for this agent. Only models from the globally active provider ({activeProvider}) are shown.</p>
              </div>
              <div className="col-span-2">
                {models && models.length > 0 ? (
                  <select 
                    id="model_id" 
                    name="model_id" 
                    className="w-full h-10 px-3 py-2 bg-[#121214] border border-zinc-700 text-zinc-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    required
                  >
                    {models.map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full h-10 px-3 py-2 bg-[#121214] border border-red-900/50 text-red-400 rounded-md text-sm flex items-center">
                    No active models configured for '{activeProvider}'.
                  </div>
                )}
              </div>
            </div>

            <hr className="border-zinc-800/50" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="temperature" className="text-zinc-200 font-medium text-sm">Temperature (0.0 - 1.0)</Label>
                <p className="text-zinc-500 text-sm mt-1">Higher means more creative. Lower means more deterministic.</p>
              </div>
              <div className="col-span-2">
                <Input id="temperature" name="temperature" type="number" step="0.1" min="0" max="1" defaultValue="0.4" required className="bg-[#121214] border-zinc-700 text-zinc-100 font-mono" />
              </div>
            </div>

            <hr className="border-zinc-800/50" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="language" className="text-zinc-200 font-medium text-sm">Language Policy</Label>
                <p className="text-zinc-500 text-sm mt-1">Primary communication language.</p>
              </div>
              <div className="col-span-2">
                <select 
                  id="language" 
                  name="language" 
                  className="w-full h-10 px-3 py-2 bg-[#121214] border border-zinc-700 text-zinc-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  <option value="bangla">Bangla</option>
                  <option value="english">English</option>
                  <option value="mixed">Mixed (Auto-detect)</option>
                </select>
              </div>
            </div>

          </CardContent>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-[#09090b] rounded-b-xl">
            <Link href="/dashboard/agents">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit">Create AI Agent</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
