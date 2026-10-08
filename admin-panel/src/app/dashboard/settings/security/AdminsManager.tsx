"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PlusSignIcon } from "hugeicons-react";

export default function AdminsManager() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAdmins() {
      // Fetch admins and their associated role names
      const { data } = await supabase
        .from('admins')
        .select(`
          *,
          roles (
            name
          )
        `)
        .order('created_at', { ascending: false });
        
      if (data) setAdmins(data);
      setLoading(false);
    }
    fetchAdmins();
  }, [supabase]);

  if (loading) {
    return <div className="text-zinc-500 animate-pulse">Loading admins...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-zinc-200">Admin Accounts</h3>
        <Button variant="secondary" size="sm" className="h-8 text-xs">
          <PlusSignIcon className="w-3 h-3 mr-1" /> Invite Admin
        </Button>
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-[#0c0c0e]">
            {admins.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No admins found.</td>
              </tr>
            ) : (
              admins.map(admin => (
                <tr key={admin.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-200">{admin.name || '-'}</td>
                  <td className="px-4 py-3 text-zinc-300">{admin.email}</td>
                  <td className="px-4 py-3">
                    <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded text-xs font-medium border border-indigo-500/20">
                      {admin.roles?.name || 'No Role'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mr-3">Edit</button>
                    <button className="text-red-400 hover:text-red-300 text-sm font-medium">Revoke</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
