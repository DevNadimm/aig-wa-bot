import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import Link from"next/link";
import { ArrowLeft01Icon, Delete02Icon } from "hugeicons-react";
import { createClient } from"@/lib/supabase/server";
import { updateAgent, deleteAgent } from"./actions";
import { notFound } from"next/navigation";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: botInstance } = await supabase.from('bot_instances').select('llm_provider').limit(1).single();
  const activeProvider = botInstance?.llm_provider || 'gemini';
  
  const { data: models } = await supabase
    .from("ai_models")
    .select("id, name, provider")
    .eq("is_active", true)
    .eq("provider", activeProvider);
  
  const { data: agent, error } = await supabase
    .from("ai_agents")
    .select("*, ai_models(provider)")
    .eq("id", id)
    .single();

  if (error || !agent) {
    notFound();
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agents">
            <Button variant="outline" size="icon">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Edit Agent Persona</h1>
            <p className="text-zinc-400 text-sm mt-1">Modify instructions and rules for this specialized AI worker.</p>
          </div>
        </div>
        
        <form action={deleteAgent}>
          <input type="hidden" name="id" value={agent.id} />
          <Button type="submit" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
            <Delete02Icon className="h-4 w-4" /> Delete Agent
          </Button>
        </form>
      </div>

      <form action={updateAgent}>
        <input type="hidden" name="id" value={agent.id} />
        
        <Card className="border-zinc-800 bg-[#0c0c0e]">
          <CardHeader className="border-b border-zinc-800/50 pb-6">
            <CardTitle className="text-lg text-zinc-100">Agent Configuration</CardTitle>
            <CardDescription className="text-zinc-400">
              Update the AI model, system prompt, and capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="name" className="text-zinc-200 font-medium text-sm">Agent Name</Label>
                <p className="text-zinc-500 text-sm mt-1">A role name for this agent (e.g. Visa Assistant, Router).</p>
              </div>
              <div className="col-span-2">
                <Input id="name" name="name" defaultValue={agent.name} required className="bg-[#121214] border-zinc-700 text-zinc-100" />
              </div>
            </div>

            <hr className="border-zinc-800/50" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="description" className="text-zinc-200 font-medium text-sm">Description</Label>
                <p className="text-zinc-500 text-sm mt-1">Briefly explain what this agent handles.</p>
              </div>
              <div className="col-span-2">
                <Input id="description" name="description" defaultValue={agent.description} required className="bg-[#121214] border-zinc-700 text-zinc-100" />
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
                  defaultValue={agent.system_prompt} 
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
                    defaultValue={agent.model_id}
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
                {agent.ai_models?.provider !== activeProvider && (
                  <p className="text-red-400 text-sm mt-2 font-medium">
                    Warning: This agent is currently using a model from '{agent.ai_models?.provider}', which does not match the active global provider '{activeProvider}'. Execution will fail until updated.
                  </p>
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
                <Input id="temperature" name="temperature" type="number" step="0.1" min="0" max="1" defaultValue={agent.temperature} required className="bg-[#121214] border-zinc-700 text-zinc-100 font-mono" />
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
                  defaultValue={agent.language}
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
            <Button type="submit">Save Changes</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
