import { TypeChip } from "@/components/ui/type-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from"@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import Link from"next/link";
import { AddCircleIcon, PencilEdit02Icon, Settings02Icon, ToolsIcon } from "hugeicons-react";
import { Button } from"@/components/ui/button";

export default async function ToolsPage() {
  const supabase = await createClient();

  const { data: tools, error } = await supabase
    .from("tools")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Tools & APIs</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure external REST APIs and functions for AI Agents to execute.</p>
        </div>
        <Link href="/dashboard/tools/new">
          <Button>
            <AddCircleIcon className="h-4 w-4" />
            Create Tool
          </Button>
        </Link>
      </div>

      <Card className="border-zinc-800 bg-[#0c0c0e]">
        <CardHeader className="border-b border-zinc-800/50">
          <CardTitle className="text-lg text-zinc-100">Configured Tools</CardTitle>
          <CardDescription className="text-zinc-400">List of external APIs and functions available to AI agents.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500 py-4">Error loading tools: {error.message}</div>
          ) : (!tools || tools.length === 0) ? (
            <EmptyState icon={ToolsIcon} title="No Tools Configured" description="Add a tool to allow your AI Agents to interact with external systems." actionLabel="Create Tool" actionHref="/dashboard/tools/new" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Type</TableHead>
                  <TableHead className="text-zinc-400">Description</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool: any) => (
                  <TableRow key={tool.id} className="border-zinc-800/50 hover:bg-zinc-900/50">
                    <TableCell className="font-medium text-zinc-200">{tool.name}</TableCell>
                    <TableCell>
                      <TypeChip label={tool.tool_type || 'REST_API'} />
                    </TableCell>
                    <TableCell className="text-zinc-400 max-w-[400px] min-w-[200px] truncate">
                      {tool.description}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        tool.is_enabled 
                          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 ring-1 ring-inset ring-zinc-700'
                      }`}>
                        {tool.is_enabled ? 'Active' : 'Disabled'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/tools/${tool.id}`}>
                        <Button variant="ghost" size="sm">
                          <Settings02Icon className="h-4 w-4 mr-2" /> Configure
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
