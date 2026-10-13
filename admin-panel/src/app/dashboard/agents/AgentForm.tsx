import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft01Icon, Delete02Icon } from "hugeicons-react";
import { createAgent } from "./new/actions";
import { updateAgent, deleteAgent } from "./[id]/actions";
import { TemperatureSlider } from "./TemperatureSlider";

export function AgentForm({ agent, models, activeProvider }: { agent?: any, models: any[], activeProvider: string }) {
  const isEdit = !!agent;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/agents">
            <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-700 hover:bg-zinc-800 shrink-0">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {isEdit ? "Edit AI Agent" : "Create AI Agent"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEdit && (
            <form action={deleteAgent}>
              <input type="hidden" name="id" value={agent.id} />
              <Button type="submit" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
                <Delete02Icon className="h-4 w-4" /> Delete
              </Button>
            </form>
          )}
          {isEdit && <div className="w-px h-6 bg-zinc-800 mx-1"></div>}
          <Link href="/dashboard/agents">
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Cancel</Button>
          </Link>
          <Button type="submit" form="agent-form" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
            {isEdit ? "Save Changes" : "Create Agent"}
          </Button>
        </div>
      </div>

      <form id="agent-form" action={isEdit ? updateAgent : createAgent} className="space-y-6">
        {isEdit && <input type="hidden" name="id" value={agent.id} />}

        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">Agent Name <span className="text-red-500">*</span></Label>
          <Input 
            id="name" 
            name="name" 
            defaultValue={agent?.name} 
            placeholder="e.g. Patient Care Assistant" 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-zinc-300 text-sm font-medium">Description <span className="text-red-500">*</span></Label>
          <Input 
            id="description" 
            name="description" 
            defaultValue={agent?.description} 
            placeholder="e.g. Answers general hospital inquiries" 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="system_prompt" className="text-zinc-300 text-sm font-medium">System Prompt <span className="text-red-500">*</span></Label>
          <Textarea 
            id="system_prompt" 
            name="system_prompt" 
            defaultValue={agent?.system_prompt} 
            placeholder="You are a helpful assistant for AIG Hospital. You MUST NOT give clinical advice..." 
            rows={8} 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-mono text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="model_id" className="text-zinc-300 text-sm font-medium">AI Model <span className="text-red-500">*</span></Label>
            {models && models.length > 0 ? (
              <select 
                id="model_id" 
                name="model_id" 
                defaultValue={agent?.model_id}
                className="appearance-none w-full h-10 pl-3 pr-10 bg-[#0c0c0e] border border-zinc-800 text-zinc-100 rounded-lg focus:outline-none focus:border-indigo-500 text-sm bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px'
                }}
                required
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            ) : (
              <div className="w-full h-10 px-3 bg-[#0c0c0e] border border-red-900/50 text-red-400 rounded-lg text-sm flex items-center">
                No active models for &apos;{activeProvider}&apos;.
              </div>
            )}
            {agent?.ai_models?.provider && agent.ai_models.provider !== activeProvider && (
              <p className="text-amber-400 text-xs mt-1.5">
                ⚠️ This agent uses a model from &apos;{agent.ai_models.provider}&apos;, which doesn&apos;t match the active provider &apos;{activeProvider}&apos;.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="language" className="text-zinc-300 text-sm font-medium">Language <span className="text-red-500">*</span></Label>
            <select 
              id="language" 
              name="language" 
              defaultValue={agent?.language || 'bangla'}
              className="appearance-none w-full h-10 pl-3 pr-10 bg-[#0c0c0e] border border-zinc-800 text-zinc-100 rounded-lg focus:outline-none focus:border-indigo-500 text-sm bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px'
              }}
            >
              <option value="bangla">Bangla</option>
              <option value="english">English</option>
              <option value="mixed">Mixed (Auto-detect)</option>
            </select>
          </div>
        </div>

        <TemperatureSlider defaultValue={agent?.temperature ?? 0.4} />

      </form>
    </div>
  );
}
