'use client'

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft01Icon } from "hugeicons-react";
import { updateIntent } from "./actions";
import { createClient } from "@/lib/supabase/client";

export default function EditIntentPage({ params }: { params: { id: string } }) {
  const [intent, setIntent] = useState<any>(null);
  
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('intents').select('*').eq('id', params.id).single();
      setIntent(data);
    }
    load();
  }, [params.id]);

  if (!intent) return <div className="text-zinc-400 p-8">Loading...</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/intents">
          <Button variant="outline" size="icon">
            <ArrowLeft01Icon className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Edit Intent</h1>
          <p className="text-zinc-400 text-sm mt-1">Modify the intent for the AI Router.</p>
        </div>
      </div>

      <form action={updateIntent.bind(null, params.id)}>
        <Card className="border-zinc-800 bg-[#0c0c0e]">
          <CardHeader className="border-b border-zinc-800/50 pb-6">
            <CardTitle className="text-lg text-zinc-100">Intent Details</CardTitle>
            <CardDescription className="text-zinc-400">
              The slug is used internally by the AI (e.g. `medical_visa`). The description helps the AI Router understand when to trigger this intent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="name" className="text-zinc-200 font-medium text-sm">Intent Name</Label>
                <p className="text-zinc-500 text-sm mt-1">A human readable name for this intent.</p>
              </div>
              <div className="col-span-2">
                <Input id="name" name="name" defaultValue={intent.name} required className="bg-[#121214] border-zinc-700 text-zinc-100" />
              </div>
            </div>

            <hr className="border-zinc-800/50" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="slug" className="text-zinc-200 font-medium text-sm">Slug (Unique ID)</Label>
                <p className="text-zinc-500 text-sm mt-1">Used by the backend routing engine. Must be unique.</p>
              </div>
              <div className="col-span-2">
                <Input id="slug" name="slug" defaultValue={intent.slug} required pattern="^[a-z0-9_]+$" title="Only lowercase letters, numbers, and underscores allowed" className="bg-[#121214] border-zinc-700 text-zinc-100 font-mono text-sm" />
              </div>
            </div>

            <hr className="border-zinc-800/50" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="description" className="text-zinc-200 font-medium text-sm">Router Description</Label>
                <p className="text-zinc-500 text-sm mt-1">Explain exactly when the AI should trigger this intent based on a user's message.</p>
              </div>
              <div className="col-span-2">
                <Textarea 
                  id="description" 
                  name="description" 
                  defaultValue={intent.description} 
                  rows={4} 
                  required 
                  className="bg-[#121214] border-zinc-700 text-zinc-100 resize-none"
                />
              </div>
            </div>

          </CardContent>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-[#09090b] rounded-b-xl">
            <Link href="/dashboard/intents">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit">Save Changes</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
