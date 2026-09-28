import Link from "next/link";
import { Comment01Icon, DashboardCircleIcon, GitMergeIcon, Settings01Icon, AiBrain01Icon, Database01Icon, Link01Icon, Logout01Icon, BotIcon, UserGroupIcon } from "hugeicons-react";

import { Button } from "@/components/ui/button";
import { signOut } from"./actions";
import { createClient } from"@/lib/supabase/server";
import { Toaster } from"sonner";
import { SidebarLink } from"./SidebarLink";
import { Breadcrumb } from"./Breadcrumb";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser(); const user = data?.user;
  
  if (!user) return null;

  // Check if user is an admin
  const { data: admin } = await supabase
    .from('admins')
    .select('id, name')
    .eq('id', user.id)
    .single();

  // If not admin, check if human agent
  let agent = null;
  if (!admin) {
    const { data: agentData } = await supabase
      .from('human_agents')
      .select('id, name')
      .eq('auth_user_id', user.id)
      .single();
    agent = agentData;
  }

  const role = admin ? 'admin' : (agent ? 'agent' : 'unknown');
  const displayName = admin?.name || agent?.name || user.email;

  const allNavItems = [
    { name:"Overview", href:"/dashboard", icon: DashboardCircleIcon, roles: ['admin'] },
    { name:"Conversations", href:"/dashboard/conversations", icon: Comment01Icon, roles: ['admin', 'agent'] },
    { name:"Knowledge Base", href:"/dashboard/knowledge", icon: Database01Icon, roles: ['admin'] },
    { name:"Intents", href:"/dashboard/intents", icon: AiBrain01Icon, roles: ['admin'] },
    { name:"Workflows", href:"/dashboard/workflows", icon: GitMergeIcon, roles: ['admin'] },
    { name:"Tools & APIs", href:"/dashboard/tools", icon: Link01Icon, roles: ['admin'] },
    { name:"AI Agents", href:"/dashboard/agents", icon: BotIcon, roles: ['admin'] },
    { name:"Team & Agents", href:"/dashboard/human-agents", icon: UserGroupIcon, roles: ['admin'] },
    { name:"Settings", href:"/dashboard/settings", icon: Settings01Icon, roles: ['admin'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#09090b] border-r border-zinc-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <BotIcon className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-zinc-100">AIG WA BOT</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1.5 px-4">
            {navItems.map((item) => (
              <SidebarLink 
                key={item.name} 
                href={item.href} 
                name={item.name} 
                icon={<item.icon className="h-4 w-4" />} 
              />
            ))}
          </ul>
        </nav>

        <div className="p-4 m-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-full flex shrink-0 items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-[#0c0c0e] ${role === 'admin' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
              {displayName?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-zinc-100 truncate">{displayName}</span>
              <span className="text-xs text-zinc-500 capitalize">{role} Account</span>
            </div>
          </div>
          
          <form action={signOut} className="w-full">
            <Button 
              type="submit" 
              variant="outline" 
              size="sm" 
              className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-8 text-xs"
            >
              <Logout01Icon className="w-3.5 h-3.5" /> Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
        {/* Global Top Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-800 bg-[#09090b]">
          <Breadcrumb />
          <div className="flex items-center gap-4">
             <Link href="/dashboard/support" className="text-zinc-400 hover:text-zinc-100 text-sm font-medium transition-colors">Support</Link>
             <Link href="/dashboard/docs" className="text-zinc-400 hover:text-zinc-100 text-sm font-medium transition-colors">Docs</Link>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl">
            {children}
          </div>
        </div>
      </main>
      <Toaster theme="dark" className="bg-[#0c0c0e] border-zinc-800 text-zinc-100" />
    </div>
  );
}
