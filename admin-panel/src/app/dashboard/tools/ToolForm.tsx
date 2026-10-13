import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { ArrowLeft01Icon, Delete02Icon } from "hugeicons-react";
import { createToolAction } from "./new/actions";
import { updateToolAction, deleteToolAction } from "./[id]/edit/actions";

export function ToolForm({ tool }: { tool?: any }) {
  const isEdit = !!tool;
  const action = isEdit ? updateToolAction : createToolAction;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tools">
            <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-700 hover:bg-zinc-800 shrink-0">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {isEdit ? "Edit Tool Metadata" : "Create New Tool"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEdit && (
            <form action={deleteToolAction}>
              <input type="hidden" name="id" value={tool.id} />
              <Button type="submit" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
                <Delete02Icon className="h-4 w-4" /> Delete
              </Button>
            </form>
          )}
          {isEdit && <div className="w-px h-6 bg-zinc-800 mx-1"></div>}
          
          <Link href="/dashboard/tools">
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Cancel</Button>
          </Link>
          <Button type="submit" form="tool-form" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
            {isEdit ? "Save Changes" : "Create & Configure"}
          </Button>
        </div>
      </div>

      <form id="tool-form" action={action} className="space-y-6">
        {isEdit && <input type="hidden" name="id" value={tool.id} />}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">Tool Name <span className="text-red-500">*</span></Label>
            <Input 
              id="name" 
              name="name" 
              defaultValue={tool?.name} 
              placeholder="e.g. create_customer" 
              required 
              className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tool_type" className="text-zinc-300 text-sm font-medium">Tool Type <span className="text-red-500">*</span></Label>
            <select 
              id="tool_type" 
              name="tool_type"
              defaultValue={tool?.tool_type || "REST_API"}
              className="appearance-none w-full h-10 pl-3 pr-10 bg-[#0c0c0e] border border-zinc-800 text-zinc-100 rounded-lg focus:outline-none focus:border-indigo-500 text-sm bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px'
              }}
            >
              <option value="REST_API">REST API Endpoint</option>
              <option value="FUNCTION">Internal Function</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-zinc-300 text-sm font-medium">Description <span className="text-red-500">*</span></Label>
          <Textarea 
            id="description" 
            name="description" 
            defaultValue={tool?.description} 
            placeholder="Explain to the AI when and how to use this tool..." 
            rows={4} 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-sans text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 resize-none"
          />
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e]">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-zinc-100">Active Status</h3>
            <p className="text-sm text-zinc-500">Enable this tool to allow AI to use it immediately.</p>
          </div>
          {/* Note: since Switch is a headless UI component that might not output a native input natively if it's not wrapped, we'll use a hidden checkbox or the switch itself if it submits value */}
          {/* For simplicity and native form submission: */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="is_enabled" defaultChecked={tool ? tool.is_enabled : true} className="sr-only peer" />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

      </form>
    </div>
  );
}
