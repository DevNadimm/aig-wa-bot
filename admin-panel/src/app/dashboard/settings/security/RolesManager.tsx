"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PlusSignIcon } from "hugeicons-react";

export default function RolesManager() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchRoles() {
      const { data } = await supabase.from('roles').select('*').order('created_at', { ascending: true });
      if (data) setRoles(data);
      setLoading(false);
    }
    fetchRoles();
  }, [supabase]);

  if (loading) {
    return <div className="text-zinc-500 animate-pulse">Loading roles...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-zinc-200">Roles</h3>
        <Button variant="secondary" size="sm" className="h-8 text-xs">
          <PlusSignIcon className="w-3 h-3 mr-1" /> Add Role
        </Button>
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Role Name</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Created At</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-[#0c0c0e]">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No roles found.</td>
              </tr>
            ) : (
              roles.map(role => (
                <tr key={role.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-200">{role.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{role.description || '-'}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(role.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">Edit</button>
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
