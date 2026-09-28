import { createClient } from"@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import Link from"next/link";
import { AddCircleIcon, PencilEdit02Icon, Settings02Icon } from "hugeicons-react";
import { ExpandableText } from"../intents/ExpandableText";

export default async function WorkflowsPage() {
  const supabase = await createClient();
  
  const { data: workflows, error } = await supabase
    .from("workflows")
    .select("id, name, description, trigger_type, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Workflows</h1>
          <p className="text-zinc-400 text-sm mt-1">Design conversation sequences and business logic automation.</p>
        </div>
        <Link href="/dashboard/workflows/new">
          <Button>
            <AddCircleIcon className="h-4 w-4" />
            Create Workflow
          </Button>
        </Link>
      </div>

      <Card className="border-zinc-800 bg-[#0c0c0e]">
        <CardHeader className="border-b border-zinc-800/50">
          <CardTitle className="text-lg text-zinc-100">Configured Workflows</CardTitle>
          <CardDescription className="text-zinc-400">List of automated sequences available for routing.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500 py-4">Error loading workflows: {error.message}</div>
          ) : !workflows || workflows.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg mt-6">
              <Settings02Icon className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-zinc-300 font-medium text-lg">No Workflows Configured</h3>
              <p className="text-zinc-500 text-sm mt-1 mb-4">Create your first workflow to automate conversation steps.</p>
              <Link href="/dashboard/workflows/new">
                <Button>Create Workflow</Button>
              </Link>
            </div>
          ) : (
            <Table className="mt-4">
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Trigger</TableHead>
                  <TableHead className="text-zinc-400">Description</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id} className="border-zinc-800/50 hover:bg-zinc-900/50">
                    <TableCell className="font-medium text-zinc-200">{workflow.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-zinc-900 px-2 py-1 text-xs font-mono font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700">
                        {workflow.trigger_type}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[400px] min-w-[200px] text-zinc-400 whitespace-normal break-words">
                      <ExpandableText text={workflow.description} maxLength={50} />
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        workflow.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 ring-1 ring-inset ring-yellow-500/20'
                      }`}>
                        {workflow.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/workflows/${workflow.id}`}>
                        <Button variant="ghost" size="sm">
                          <PencilEdit02Icon className="h-4 w-4 mr-2" /> Builder
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
