import { TypeChip } from "@/components/ui/type-chip";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { AddCircleIcon, PencilEdit02Icon, Settings02Icon, ToolsIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";

export default async function ToolsPage() {
  const supabase = await createClient();

  const { data: tools, error } = await supabase
    .from("tools")
    .select("*")
    .order("created_at", { ascending: false }).order("id", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Tools & APIs</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure external REST APIs and functions for AI Agents to execute.</p>
        </div>
        <Link href="/dashboard/tools/new">
          <Button>
            <AddCircleIcon className="mr-2 h-4 w-4" />
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
                      <StatusChip label={tool.is_enabled ? 'Active' : 'Disabled'} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/dashboard/tools/${tool.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 border border-transparent hover:border-zinc-700/60 rounded-md transition-all duration-150 gap-1.5"
                          >
                            <PencilEdit02Icon className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Edit</span>
                          </Button>
                        </Link>
                        <Link href={`/dashboard/tools/${tool.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 border border-transparent hover:border-zinc-700/60 rounded-md transition-all duration-150 gap-1.5"
                          >
                            <Settings02Icon className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Configure</span>
                          </Button>
                        </Link>
                      </div>
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
