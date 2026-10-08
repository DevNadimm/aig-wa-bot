import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { createClient } from"@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import Link from"next/link";
import { AddCircleIcon, PencilEdit02Icon, Robot01Icon, CpuIcon, EyeIcon } from "hugeicons-react";
import { ExpandableText } from"../intents/ExpandableText";
import { ViewAgentDialog } from"./ViewAgentDialog";

export default async function AgentsPage() {
  const supabase = await createClient();
  
  // Fetch agents and their associated model names
  const { data: agents, error } = await supabase
    .from("ai_agents")
    .select(`
      id, 
      name, 
      description, 
      system_prompt,
      temperature,
      status, 
      language,
      created_at,
      ai_models(name)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">AI Agents</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage AI personas, prompts, and agent behaviors.</p>
        </div>
        <Link href="/dashboard/agents/new">
          <Button>
            <AddCircleIcon className="h-4 w-4" />
            Create Agent
          </Button>
        </Link>
      </div>

      <Card className="border-zinc-800 bg-[#0c0c0e]">
        <CardHeader className="border-b border-zinc-800/50">
          <CardTitle className="text-lg text-zinc-100">Configured AI Personas</CardTitle>
          <CardDescription className="text-zinc-400">List of specialized AI agents that execute workflows and answer questions.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500 py-4">Error loading agents: {error.message}</div>
          ) : !agents || agents.length === 0 ? (
            <EmptyState icon={Robot01Icon} title="No AI Agents Found" description="Create your first AI agent to start routing intents or answering queries." actionLabel="Create AI Agent" actionHref="/dashboard/agents/new" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Agent Name</TableHead>
                  <TableHead className="text-zinc-400">Description</TableHead>
                  <TableHead className="text-zinc-400">Language</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent: any) => (
                  <TableRow key={agent.id} className="border-zinc-800/50 hover:bg-zinc-900/50">
                    <TableCell className="font-medium text-zinc-200">
                      {agent.name}
                    </TableCell>
                    <TableCell className="max-w-[300px] text-zinc-400 whitespace-normal break-words">
                      <ExpandableText text={agent.description} maxLength={40} />
                    </TableCell>
                    <TableCell className="text-zinc-300 capitalize">{agent.language}</TableCell>
                    <TableCell>
                      <StatusChip label={agent.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ViewAgentDialog agent={agent} />
                        <Link href={`/dashboard/agents/${agent.id}`}>
                          <Button variant="ghost" size="sm">
                            <PencilEdit02Icon className="h-4 w-4 mr-2" /> Edit
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
