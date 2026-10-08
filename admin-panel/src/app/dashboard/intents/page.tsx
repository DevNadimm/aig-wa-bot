import { TypeChip } from "@/components/ui/type-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
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
            <EmptyState title="No Intents Found" description="Create your first intent to get started." actionLabel="Create Intent" actionHref="/dashboard/intents/new" />
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
                      <TypeChip label={intent.slug} />
                    </TableCell>
                    <TableCell className="max-w-[400px] min-w-[200px] text-zinc-400 whitespace-normal break-words">
                      <ExpandableText text={intent.description} maxLength={50} />
                    </TableCell>
                    <TableCell>
                      <StatusChip label={intent.status} />
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
