import { TypeChip } from "@/components/ui/type-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserGroupIcon, AddCircleIcon } from "hugeicons-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = 'force-dynamic'

export default async function HumanAgentsPage() {
  const supabase = await createClient()
  const { data: agents, error } = await supabase.from('human_agents').select('*, agent_teams!human_agents_team_id_fkey(name)')
  
  if (error) console.error("Error fetching agents:", error);

  const { data: activeConvs } = await supabase
    .from('conversations')
    .select('assigned_agent_id')
    .eq('state', 'HANDOFF')
    .not('assigned_agent_id', 'is', null);

  const activeCounts: Record<string, number> = {};
  if (activeConvs) {
    for (const conv of activeConvs) {
      if (conv.assigned_agent_id) {
        activeCounts[conv.assigned_agent_id] = (activeCounts[conv.assigned_agent_id] || 0) + 1;
      }
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Team & Agents</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage human agents, their skills, and availability.</p>
        </div>
        <Link href="/dashboard/human-agents/new">
          <Button>
            <AddCircleIcon className="mr-2 h-4 w-4" />
            Add Agent
          </Button>
        </Link>
      </div>
      
      <Card className="border-zinc-800 bg-[#0c0c0e]">
        <CardHeader className="border-b border-zinc-800/50">
          <CardTitle className="text-lg text-zinc-100">Human Agents Roster</CardTitle>
          <CardDescription className="text-zinc-400">List of support agents mapped to specific teams or skills.</CardDescription>
        </CardHeader>
        <CardContent>
          {!agents || agents.length === 0 ? (
            <EmptyState icon={UserGroupIcon} title="No Agents Configured" description="Add your first human agent to handle live chat handoffs." actionLabel="Create Agent" actionHref="/dashboard/human-agents/new" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Email</TableHead>
                  <TableHead className="text-zinc-400">Skill / Team</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400 text-right">Active Chats</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id} className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableCell className="font-medium text-zinc-200">{agent.name}</TableCell>
                    <TableCell className="text-zinc-400">{agent.email || '-'}</TableCell>
                    <TableCell className="text-zinc-400">
                      {agent.agent_teams ? (
                        <TypeChip label={agent.agent_teams.name} variant="blue" />
                      ) : (
                        <span className="text-zinc-500 italic">No Skill (General)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip label={agent.status} />
                    </TableCell>
                    <TableCell className="text-zinc-400 text-right font-medium">
                      <span className="text-zinc-100">{activeCounts[agent.id] || 0}</span> <span className="text-zinc-600">/ {agent.max_concurrent_conversations || 10}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
