import { PencilEdit02Icon, AddCircleIcon } from "hugeicons-react";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: teams, error } = await supabase
    .from('agent_teams')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
  
  if (error) console.error("Error fetching teams:", error);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Skills & Teams</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage agent skills and specialized routing teams.</p>
        </div>
        <Link href="/dashboard/human-agents/teams/new">
          <Button><AddCircleIcon className="mr-2 h-4 w-4" /> Add Team / Skill</Button>
        </Link>
      </div>

      <Card className="bg-[#0c0c0e] border-zinc-800 shadow-sm">
        <CardHeader className="border-b border-zinc-800/50">
          <CardTitle className="text-lg text-zinc-100">Teams & Skills Roster</CardTitle>
          <CardDescription className="text-zinc-400">List of all specialized skills and teams available for handoff.</CardDescription>
        </CardHeader>
        <CardContent>
          {teams && teams.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Description</TableHead>
                  <TableHead className="text-zinc-400">Created At</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id} className="border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <TableCell className="font-medium text-zinc-200">
                      {team.name}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {team.description || <span className="italic text-zinc-600">No description</span>}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(team.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/human-agents/teams/${team.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 border border-transparent hover:border-zinc-700/60 rounded-md transition-all duration-150 gap-1.5"
                        >
                          <PencilEdit02Icon className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Edit</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 flex flex-col items-center">
              <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
                <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-zinc-200 mb-1">No teams found</h3>
              <p className="text-zinc-500 text-sm mb-4">Create a team or skill group to start routing specialized requests.</p>
              <Link href="/dashboard/human-agents/teams/new">
                <Button><AddCircleIcon className="mr-2 h-4 w-4" /> Add Team / Skill</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
