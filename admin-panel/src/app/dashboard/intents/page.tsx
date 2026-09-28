import { createClient } from"@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import { Button } from"@/components/ui/button";
import Link from"next/link";
import { AddCircleIcon, PencilEdit02Icon } from "hugeicons-react";

import { ExpandableText } from"./ExpandableText";

export default async function IntentsPage() {
  const supabase = await createClient();
  
  // Fetch intents with their organization
  const { data: intents, error } = await supabase
    .from("intents")
    .select("id, name, slug, description, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Intents</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage the conversation intents that the AI Router can detect.</p>
        </div>
        <Link href="/dashboard/intents/new">
          <Button>
            <AddCircleIcon className="h-4 w-4" />
            Add Intent
          </Button>
        </Link>
      </div>

      <Card className="border-zinc-800 bg-[#0c0c0e]">
        <CardHeader className="border-b border-zinc-800/50">
          <CardTitle className="text-lg text-zinc-100">Configured Intents</CardTitle>
          <CardDescription className="text-zinc-400">A list of all active and inactive intents for your bot.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500">Error loading intents: {error.message}</div>
          ) : !intents || intents.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">
              No intents found. Create your first intent to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Slug</TableHead>
                  <TableHead className="text-zinc-400">Description</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intents.map((intent) => (
                  <TableRow key={intent.id} className="border-zinc-800/50 hover:bg-zinc-900/50">
                    <TableCell className="font-medium text-zinc-200">{intent.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-zinc-900 px-2 py-1 text-xs font-mono font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700">
                        {intent.slug}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[400px] min-w-[200px] text-zinc-400 whitespace-normal break-words">
                      <ExpandableText text={intent.description} maxLength={50} />
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        intent.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 ring-1 ring-inset ring-yellow-500/20'
                      }`}>
                        {intent.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/intents/${intent.id}`}>
                        <Button variant="ghost" size="sm">
                          <PencilEdit02Icon className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
