import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft01Icon, Delete02Icon } from "hugeicons-react";
import { createWorkflow } from "./new/actions";
import { updateWorkflow, deleteWorkflow } from "./[id]/edit/actions";

export function WorkflowForm({ workflow }: { workflow?: any }) {
  const isEdit = !!workflow;
  const action = isEdit ? updateWorkflow : createWorkflow;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/workflows">
            <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-700 hover:bg-zinc-800 shrink-0">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {isEdit ? "Edit Workflow Settings" : "Create New Workflow"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEdit && (
            <form action={deleteWorkflow}>
              <input type="hidden" name="id" value={workflow.id} />
              <Button type="submit" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
                <Delete02Icon className="h-4 w-4" /> Delete
              </Button>
            </form>
          )}
          {isEdit && <div className="w-px h-6 bg-zinc-800 mx-1"></div>}
          
          <Link href="/dashboard/workflows">
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Cancel</Button>
          </Link>
          <Button type="submit" form="workflow-form" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
            {isEdit ? "Save Changes" : "Create & Build"}
          </Button>
        </div>
      </div>

      <form id="workflow-form" action={action} className="space-y-6">
        {isEdit && <input type="hidden" name="id" value={workflow.id} />}
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">Workflow Name <span className="text-red-500">*</span></Label>
          <Input 
            id="name" 
            name="name" 
            defaultValue={workflow?.name} 
            placeholder="e.g. Medical Visa Process" 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="trigger_type" className="text-zinc-300 text-sm font-medium">Trigger Type <span className="text-red-500">*</span></Label>
            <select 
              id="trigger_type" 
              name="trigger_type"
              defaultValue={workflow?.trigger_type || "INTENT"}
              className="appearance-none w-full h-10 pl-3 pr-10 bg-[#0c0c0e] border border-zinc-800 text-zinc-100 rounded-lg focus:outline-none focus:border-indigo-500 text-sm bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px'
              }}
            >
              <option value="INTENT">Intent Matched</option>
              <option value="KEYWORD">Keyword Match</option>
              <option value="MANUAL">Manual / Agent</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeout_seconds" className="text-zinc-300 text-sm font-medium">Timeout (Seconds) <span className="text-red-500">*</span></Label>
            <Input 
              id="timeout_seconds" 
              name="timeout_seconds" 
              type="number" 
              defaultValue={workflow?.timeout_seconds || "300"} 
              min="10" 
              required 
              className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 font-mono" 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-zinc-300 text-sm font-medium">Description <span className="text-red-500">*</span></Label>
          <Textarea 
            id="description" 
            name="description" 
            defaultValue={workflow?.description} 
            placeholder="Handles collecting patient visa docs and routing to the right team..." 
            rows={4} 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-sans text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 resize-none"
          />
        </div>

      </form>
    </div>
  );
}
