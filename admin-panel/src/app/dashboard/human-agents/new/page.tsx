'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { ArrowLeft01Icon } from "hugeicons-react"
import { createHumanAgent } from "./actions"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function NewAgentPage() {
  const [teams, setTeams] = useState<any[]>([])

  useEffect(() => {
    async function loadTeams() {
      const supabase = createClient()
      const { data } = await supabase.from('agent_teams').select('*').order('name')
      if (data) setTeams(data)
    }
    loadTeams()
  }, [])

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/human-agents">
          <Button variant="outline" size="icon" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white">
            <ArrowLeft01Icon className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Add Human Agent</h1>
          <p className="text-zinc-400 text-sm mt-1">Register a new agent and map them to a skill team.</p>
        </div>
      </div>

      <form action={createHumanAgent}>
        <Card className="border-zinc-800 bg-[#0c0c0e]">
          <CardHeader className="border-b border-zinc-800/50 pb-6">
            <CardTitle className="text-lg text-zinc-100">Agent Details</CardTitle>
            <CardDescription className="text-zinc-400">
              Provide details for the human agent. The email should ideally match their login email if using auth mapping.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="name" className="text-zinc-200 font-medium text-sm">Full Name</Label>
                <p className="text-zinc-500 text-sm mt-1">The display name of the agent.</p>
              </div>
              <div className="col-span-2">
                <Input id="name" name="name" placeholder="e.g. Nahid Chowdhury" required className="bg-[#121214] border-zinc-700 text-zinc-100" />
              </div>
            </div>

            <hr className="border-zinc-800/50" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="email" className="text-zinc-200 font-medium text-sm">Email Address</Label>
                <p className="text-zinc-500 text-sm mt-1">Used for contact and optionally mapping to an auth account.</p>
              </div>
              <div className="col-span-2">
                <Input id="email" name="email" type="email" placeholder="agent@example.com" className="bg-[#121214] border-zinc-700 text-zinc-100" />
              </div>
            </div>

            <hr className="border-zinc-800/50" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="password" className="text-zinc-200 font-medium text-sm">Password</Label>
                <p className="text-zinc-500 text-sm mt-1">Required if you want the system to auto-create a login account for this agent.</p>
              </div>
              <div className="col-span-2">
                <Input id="password" name="password" type="password" placeholder="Min 6 characters" className="bg-[#121214] border-zinc-700 text-zinc-100" />
              </div>
            </div>

            <hr className="border-zinc-800/50" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <Label htmlFor="team_id" className="text-zinc-200 font-medium text-sm">Skill / Team Assignment</Label>
                <p className="text-zinc-500 text-sm mt-1">Which type of requests should this agent handle?</p>
              </div>
              <div className="col-span-2">
                <select 
                  id="team_id" 
                  name="team_id" 
                  className="flex h-10 w-full rounded-md border border-zinc-700 bg-[#121214] px-3 py-2 text-sm text-zinc-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                >
                  <option value="">No specific skill (General)</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
          </CardContent>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-[#09090b] rounded-b-xl">
            <Link href="/dashboard/human-agents">
              <Button type="button" variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800">Cancel</Button>
            </Link>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Create Agent</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
