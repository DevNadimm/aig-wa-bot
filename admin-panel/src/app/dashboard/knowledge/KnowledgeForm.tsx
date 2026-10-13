import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft01Icon, Delete02Icon } from "hugeicons-react";
import { createKnowledge } from "./new/actions";
import { updateKnowledge, deleteKnowledge } from "./[id]/actions";

export function KnowledgeForm({ source, document }: { source?: any, document?: any }) {
  const isEdit = !!source;
  const action = isEdit ? updateKnowledge : createKnowledge;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/knowledge">
            <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-700 hover:bg-zinc-800 shrink-0">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {isEdit ? "Edit Knowledge Source" : "Add Knowledge Source"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEdit && (
            <form action={deleteKnowledge}>
              <input type="hidden" name="id" value={source.id} />
              <Button type="submit" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
                <Delete02Icon className="h-4 w-4" /> Delete
              </Button>
            </form>
          )}
          {isEdit && <div className="w-px h-6 bg-zinc-800 mx-1"></div>}
          <Link href="/dashboard/knowledge">
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Cancel</Button>
          </Link>
          <Button type="submit" form="knowledge-form" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
            {isEdit ? "Save Changes" : "Publish Knowledge"}
          </Button>
        </div>
      </div>

      <form id="knowledge-form" action={action} className="space-y-6">
        {isEdit && <input type="hidden" name="id" value={source.id} />}
        
        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">Title <span className="text-red-500">*</span></Label>
          <Input 
            id="name" 
            name="name" 
            defaultValue={source?.name} 
            placeholder="e.g. Hospital Visiting Hours" 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-zinc-300 text-sm font-medium">Document Type <span className="text-red-500">*</span></Label>
            <Select 
              id="type" 
              name="type" 
              defaultValue={source?.type || "TEXT"}
            >
              <option value="TEXT">Plain Text / Article</option>
              <option value="FAQ">FAQ List</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-zinc-300 text-sm font-medium">Category <span className="text-red-500">*</span></Label>
            <Input 
              id="category" 
              name="category" 
              defaultValue={source?.category} 
              placeholder="e.g. Hospital Policy, Doctors" 
              required 
              className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20" 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="content" className="text-zinc-300 text-sm font-medium">Knowledge Content <span className="text-red-500">*</span></Label>
          <Textarea 
            id="content" 
            name="content" 
            defaultValue={document?.content || ""}
            placeholder="Paste the exact rules, facts, or FAQs here. The AI will read this to answer questions."
            rows={15} 
            required 
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-sans text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 resize-y"
          />
        </div>

      </form>
    </div>
  );
}
