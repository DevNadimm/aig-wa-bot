import { Activity01Icon } from "hugeicons-react";
import Link from"next/link";
import { Button } from"@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { createClient } from"@/lib/supabase/server";

export async function SystemStatusWidget() {
  // 1. Check Database Status
  let dbStatus ="Offline";
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('conversations').select('id').limit(1);
    if (!error) dbStatus ="Online";
  } catch (e) {
    dbStatus ="Offline";
  }

  // 2. Check WhatsApp Engine Status
  let waStatus ="Offline";
  try {
    const res = await fetch('http://localhost:3001/api/whatsapp/status', { 
      cache: 'no-store',
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'CONNECTED') {
        waStatus = "Connected";
      } else if (data && data.status === 'CONNECTING') {
        waStatus = "Connecting...";
      } else if (data && data.status === 'GENERATING_QR') {
        waStatus = "Generating QR...";
      } else if (data && data.status === 'QR') {
        waStatus = "Waiting for Scan";
      } else if (data && data.status === 'DISCONNECTING') {
        waStatus = "Disconnecting...";
      } else if (data && data.status === 'DISCONNECTED') {
        waStatus = "Disconnected";
      } else if (data && ["CONNECTION_FAILED", "BANNED", "CONFLICT", "QR_TIMEOUT", "BAD_SESSION"].includes(data.status)) {
        waStatus = data.status === "QR_TIMEOUT" ? "QR Expired" : 
                   data.status === "CONFLICT" ? "Conflict" : "Error";
      } else {
        waStatus = "Disconnected";
      }
    }
  } catch (e) {
    waStatus ="Offline";
  }

  // 3. AI Server Status (Assuming if WA engine is up, the internal AI loop is running)
  // For a real check, we could check the Gemini API, but for now we'll match WA engine
  let aiStatus = waStatus ==="Offline" ?"Offline" :"Online";

  return (
    <Card className="border-zinc-800 bg-[#0c0c0e]">
      <CardHeader className="border-b border-zinc-800/50">
        <CardTitle className="text-lg text-zinc-100">System Status</CardTitle>
        <CardDescription className="text-zinc-400">Connection health and services.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col divide-y divide-zinc-800/50">
          <StatusRow label="WhatsApp Engine" status={waStatus} />
          <StatusRow label="AI Server" status={aiStatus} />
          <StatusRow label="Database" status={dbStatus} />
        </div>

        <div className="p-4 border-t border-zinc-800/50 bg-[#09090b]/50">
          <Link href="/dashboard/workflows/new" className="block w-full">
            <Button variant="secondary" className="w-full h-9 text-xs">
              Create New Workflow
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  const isOnline = status ==="Online" || status ==="Connected";
  const isWarning = status ==="Waiting for Scan" || status ==="Generating QR..." || status ==="Connecting..." || status === "Disconnecting..." || status === "QR Expired" || status === "Conflict";
  
  let dotColor ="bg-red-500";
  let textColor ="text-red-400";
  
  if (isOnline) {
    dotColor ="bg-emerald-400 animate-pulse";
    textColor ="text-emerald-400";
  } else if (isWarning) {
    dotColor ="bg-orange-400 animate-pulse";
    textColor ="text-orange-400";
  }

  return (
    <div className="flex items-center justify-between p-4 hover:bg-zinc-900/30 transition-colors">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${textColor}`}>
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        {status}
      </span>
    </div>
  );
}
