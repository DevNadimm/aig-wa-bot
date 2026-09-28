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
        <CardContent className="pt-6">
          {!agents || agents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-lg">
              <UserGroupIcon className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-zinc-300 font-medium text-lg">No Agents Configured</h3>
              <p className="text-zinc-500 text-sm mt-1 mb-4">Add your first human agent to handle live chat handoffs.</p>
              <Link href="/dashboard/human-agents/new">
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">Create Agent</Button>
              </Link>
            </div>
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
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {agent.agent_teams.name}
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">No Skill (General)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ${
                        agent.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}>
                        {agent.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-right font-medium">{agent.max_concurrent_conversations || 10}</TableCell>
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
