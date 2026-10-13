import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft01Icon, Delete02Icon } from "hugeicons-react";
import { createIntent } from "./new/actions";
import { updateIntent, deleteIntent } from "./[id]/actions";

export function IntentForm({ intent }: { intent?: any }) {
  const isEdit = !!intent;
  const action = isEdit ? updateIntent.bind(null, intent.id) : createIntent;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/intents">
            <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-700 hover:bg-zinc-800 shrink-0">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {isEdit ? "Edit Intent" : "Create New Intent"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEdit && (
            <form action={deleteIntent}>
              <input type="hidden" name="id" value={intent.id} />
              <Button type="submit" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
                <Delete02Icon className="h-4 w-4" /> Delete
              </Button>
            </form>
          )}
          {isEdit && <div className="w-px h-6 bg-zinc-800 mx-1"></div>}
          <Link href="/dashboard/intents">
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Cancel</Button>
          </Link>
          <Button type="submit" form="intent-form" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
            {isEdit ? "Save Changes" : "Create Intent"}
          </Button>
        </div>
      </div>

      <form id="intent-form" action={action} className="space-y-6">
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">Intent Name <span className="text-red-500">*</span></Label>
          <Input 
            id="name" 
            name="name" 
            defaultValue={intent?.name} 
            placeholder="e.g. Doctor Appointment" 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-zinc-300 text-sm font-medium">Slug (Unique ID) <span className="text-red-500">*</span></Label>
          <Input 
            id="slug" 
            name="slug" 
            defaultValue={intent?.slug} 
            placeholder="e.g. doctor_appointment" 
            required 
            pattern="^[a-z0-9_]+$" 
            title="Only lowercase letters, numbers, and underscores allowed" 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 font-mono text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-zinc-300 text-sm font-medium">Router Description <span className="text-red-500">*</span></Label>
          <Textarea 
            id="description" 
            name="description" 
            defaultValue={intent?.description} 
            placeholder="Trigger this when the user wants to book an appointment with a specific doctor or department..." 
            rows={6} 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 resize-none text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
          />
        </div>

      </form>
    </div>
  );
}
