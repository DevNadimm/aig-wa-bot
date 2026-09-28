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
          <p className="text-zinc-400 text-sm mt-1">Manage AI personas, prompts, and model configurations.</p>
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
            <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg mt-6">
              <Robot01Icon className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-zinc-300 font-medium text-lg">No AI Agents Found</h3>
              <p className="text-zinc-500 text-sm mt-1 mb-4">Create your first AI agent to start routing intents or answering queries.</p>
              <Link href="/dashboard/agents/new">
                <Button>Create AI Agent</Button>
              </Link>
            </div>
          ) : (
            <Table className="mt-4">
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Agent Name</TableHead>
                  <TableHead className="text-zinc-400">Model</TableHead>
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
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-indigo-500/10 flex items-center justify-center">
                          <Robot01Icon className="h-3 w-3 text-indigo-400" />
                        </div>
                        {agent.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-1 text-xs font-mono font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700">
                        <CpuIcon className="h-3 w-3 text-zinc-500" />
                        {agent.ai_models?.name ||"Unknown"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[300px] text-zinc-400 whitespace-normal break-words">
                      <ExpandableText text={agent.description} maxLength={40} />
                    </TableCell>
                    <TableCell className="text-zinc-300 capitalize">{agent.language}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        agent.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 ring-1 ring-inset ring-zinc-500/20'
                      }`}>
                        {agent.status}
                      </span>
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
