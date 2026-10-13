import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft01Icon, Delete02Icon } from "hugeicons-react";
import { createHumanAgent } from "./new/actions"; 
import { updateHumanAgent, deleteHumanAgent } from "./[id]/actions";

export function HumanAgentForm({ agent, teams }: { agent?: any, teams: any[] }) {
  const isEdit = !!agent;
  const action = isEdit ? updateHumanAgent.bind(null, agent.id) : createHumanAgent;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/human-agents">
            <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-700 hover:bg-zinc-800 shrink-0">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {isEdit ? "Edit Human Agent" : "Add Human Agent"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEdit && (
            <form action={deleteHumanAgent}>
              <input type="hidden" name="id" value={agent.id} />
              <Button type="submit" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
                <Delete02Icon className="h-4 w-4" /> Delete
              </Button>
            </form>
          )}
          {isEdit && <div className="w-px h-6 bg-zinc-800 mx-1"></div>}
          <Link href="/dashboard/human-agents">
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Cancel</Button>
          </Link>
          <Button type="submit" form="human-agent-form" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
            {isEdit ? "Save Changes" : "Create Agent"}
          </Button>
        </div>
      </div>

      <form id="human-agent-form" action={action} className="space-y-6">
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">Full Name <span className="text-red-500">*</span></Label>
          <Input 
            id="name" 
            name="name" 
            defaultValue={agent?.name} 
            placeholder="e.g. Nahid Chowdhury" 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300 text-sm font-medium">Email Address <span className="text-red-500">*</span></Label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            defaultValue={agent?.email} 
            placeholder="agent@example.com" 
            required
            disabled={isEdit}
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed" 
          />
          {isEdit && (
            <p className="text-zinc-500 text-xs mt-1">Email address cannot be changed after creation.</p>
          )}
        </div>

        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300 text-sm font-medium">Password <span className="text-red-500">*</span></Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="Min 6 characters (for auto-login creation)" 
              required
              className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" 
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="team_id" className="text-zinc-300 text-sm font-medium">Skill / Team Assignment</Label>
          <Select 
            id="team_id" 
            name="team_id"
            defaultValue={agent?.team_id || ""}
          >
            <option value="">No specific skill (General)</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </Select>
        </div>
      </form>
    </div>
  );
}
