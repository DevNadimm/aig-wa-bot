import { createClient } from"@/lib/supabase/server";
import { UserGroup02Icon, Comment01Icon, BotIcon, Activity01Icon, ArrowUpRight01Icon, Shield01Icon, FlashIcon } from "hugeicons-react";
import Link from"next/link";
import { formatDistanceToNow } from"date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import { Button } from"@/components/ui/button";
import { Suspense } from"react";
import { SystemStatusWidget } from"./SystemStatusWidget";

import { redirect } from "next/navigation";

export default async function DashboardOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Check if admin
  const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).single();
  if (!admin) {
    // Not an admin, probably an agent. Redirect to conversations.
    redirect("/dashboard/conversations");
  }

  // Fetch high-level metrics
  const { count: convCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true });
    
  const { count: intentCount } = await supabase
    .from('intents')
    .select('*', { count: 'exact', head: true });

  const { count: customerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  const { count: aiActiveCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('state', 'AI_ACTIVE');

  // Fetch recent conversations
  const { data: recentConversations } = await supabase
    .from('conversations')
    .select(`
      id,
      state,
      last_message_at,
      customers ( name, phone )
    `)
    .order('last_message_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Dashboard Overview</h1>
          <p className="text-zinc-400 text-sm mt-1">Real-time metrics and recent activity for your WhatsApp AI agent.</p>
        </div>
        <Link href="/dashboard/conversations">
          <Button>
            <Comment01Icon className="h-4 w-4" />
            Live Inbox
          </Button>
        </Link>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#0c0c0e] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Customers</CardTitle>
            <UserGroup02Icon className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{customerCount || 0}</div>
            <p className="text-xs text-emerald-400 mt-1">+12% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0c0c0e] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Conversations</CardTitle>
            <Comment01Icon className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{convCount || 0}</div>
            <p className="text-xs text-zinc-500 mt-1">Live updates active</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0c0c0e] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Handled by AI</CardTitle>
            <BotIcon className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{aiActiveCount || 0}</div>
            <p className="text-xs text-emerald-400 mt-1">
              {Math.round(((aiActiveCount || 0) / (convCount || 1)) * 100)}% of total volume
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0c0c0e] border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Configured Intents</CardTitle>
            <Activity01Icon className="w-4 h-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{intentCount || 0}</div>
            <p className="text-xs text-zinc-500 mt-1">Active workflows</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Conversations */}
        <Card className="lg:col-span-2 border-zinc-800 bg-[#0c0c0e]">
          <CardHeader className="border-b border-zinc-800/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-zinc-100">Recent Conversations</CardTitle>
              <CardDescription className="text-zinc-400">Latest activity from your customers.</CardDescription>
            </div>
            <Link 
              href="/dashboard/conversations" 
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight01Icon className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table withBorder={false}>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400 pl-6">Customer</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-right text-zinc-400 pr-6">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentConversations?.map((conv) => {
                  const customerData = (Array.isArray(conv.customers) ? conv.customers[0] : conv.customers) as any; const customerName = customerData?.name || 'Unknown Customer';
                  const initial = customerName.charAt(0).toUpperCase();
                  return (
                    <TableRow key={conv.id} className="border-zinc-800/50 hover:bg-zinc-900/50">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center ring-1 ring-zinc-700/50">
                            <span className="text-xs font-bold text-zinc-300">{initial}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-200">{customerName}</span>
                            <span className="text-xs text-zinc-500">{customerData?.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ${
                          conv.state === 'HUMAN_ACTIVE' 
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                            : conv.state === 'WAITING_HUMAN' 
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {conv.state === 'HUMAN_ACTIVE' && <Shield01Icon className="w-3 h-3 mr-1" />}
                          {conv.state === 'AI_ACTIVE' && <FlashIcon className="w-3 h-3 mr-1" />}
                          {conv.state.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-zinc-400 pr-6">
                        {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true }) : 'Never'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {(!recentConversations || recentConversations.length === 0) && (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No conversations found.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions / System Status */}
        <Suspense fallback={
          <Card className="border-zinc-800 bg-[#0c0c0e]">
            <CardHeader className="border-b border-zinc-800/50">
              <CardTitle className="text-lg text-zinc-100">System Status</CardTitle>
              <CardDescription className="text-zinc-400">Loading connection health...</CardDescription>
            </CardHeader>
            <CardContent className="p-6 h-[300px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </CardContent>
          </Card>
        }>
          <SystemStatusWidget />
        </Suspense>
      </div>
    </div>
  );
}
