import { createClient } from "@/lib/supabase/server";
import { Settings01Icon, Shield01Icon, Key01Icon } from "hugeicons-react";
import { WhatsAppConnection } from "./WhatsAppConnection";
import { ApiKeysForm } from "./ApiKeysForm";
import SecurityTab from "./SecurityTab";
import Link from "next/link";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const activeTab = params.tab || 'integrations';

  // Fetch bot instance and session
  const { data: bots } = await supabase
    .from("bot_instances")
    .select("*, whatsapp_sessions(*)")
    .limit(1);

  const bot = bots?.[0];
  const session = bot?.whatsapp_sessions?.[0];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Settings</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage system configuration and external integrations.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 mt-6">
        
        {/* Sidebar */}
        <nav className="w-full lg:w-64 shrink-0 space-y-1.5">
          <Link href="/dashboard/settings?tab=integrations" className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'integrations' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}>
            <span className="flex items-center gap-3">
              <Settings01Icon className="w-4 h-4" /> Integrations
            </span>
          </Link>
          
          <Link href="/dashboard/settings?tab=api-keys" className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'api-keys' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}>
            <span className="flex items-center gap-3">
              <Key01Icon className="w-4 h-4" /> API Keys
            </span>
          </Link>
          
          <Link href="/dashboard/settings?tab=security" className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}>
            <span className="flex items-center gap-3">
              <Shield01Icon className="w-4 h-4" /> Security
            </span>
          </Link>
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-6 max-w-4xl">
          
          {activeTab === 'integrations' && (
            session ? (
              <WhatsAppConnection session={session} />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-800 bg-[#0c0c0e]/50 rounded-xl">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                  <Shield01Icon className="w-8 h-8 text-red-500/70" />
                </div>
                <h3 className="text-zinc-200 font-medium text-lg">No Configuration Found</h3>
                <p className="text-sm text-zinc-500 mt-2 max-w-md">Your database is missing a default bot instance. Please insert a bot instance to manage WhatsApp connections.</p>
              </div>
            )
          )}

          {activeTab === 'api-keys' && (
            <ApiKeysForm bot={bot} />
          )}

          {activeTab === 'security' && (
            <SecurityTab />
          )}

        </div>
      </div>
    </div>
  );
}
