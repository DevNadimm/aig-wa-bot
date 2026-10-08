"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Download01Icon } from "hugeicons-react";

export default function AuditLogsList() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLogs() {
      // Fetch audit logs with admin details
      const { data } = await supabase
        .from('audit_logs')
        .select(`
          *,
          admins (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (data) setLogs(data);
      setLoading(false);
    }
    fetchLogs();
  }, [supabase]);

  if (loading) {
    return <div className="text-zinc-500 animate-pulse">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-zinc-200">System Activity Logs</h3>
        <Button variant="secondary" size="sm" className="h-8 text-xs">
          <Download01Icon className="w-3 h-3 mr-1" /> Export Logs
        </Button>
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Resource</th>
              <th className="px-4 py-3 font-medium">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-[#0c0c0e]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No activity logs found.</td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    {log.admins?.name || log.admins?.email || 'Unknown'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-medium border border-zinc-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{log.resource}</td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{log.ip_address || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
