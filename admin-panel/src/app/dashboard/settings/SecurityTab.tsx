"use client";

import { useState } from "react";
import { UserMultipleIcon, SecurityLockIcon, Activity01Icon, Shield01Icon } from "hugeicons-react";
import RolesManager from "./security/RolesManager";
import AdminsManager from "./security/AdminsManager";
import AuditLogsList from "./security/AuditLogsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureLock } from "@/components/ui/feature-lock";

export default function SecurityTab() {
  const [activeTab, setActiveTab] = useState<'roles' | 'admins' | 'audit'>('roles');
  
  // Boolean flag to control the lock state
  const isLocked = true;

  const tabs = [
    { id: 'roles', label: 'Roles & Permissions', icon: SecurityLockIcon },
    { id: 'admins', label: 'Admin Accounts', icon: UserMultipleIcon },
    { id: 'audit', label: 'Audit Logs', icon: Activity01Icon },
  ] as const;

  return (
    <Card className="border-zinc-800 bg-[#0c0c0e]">
      <CardHeader className="border-b border-zinc-800/50">
        <CardTitle className="text-lg text-zinc-100 flex items-center gap-2">
          <Shield01Icon className="w-5 h-5 text-indigo-400" /> Security & Access Control
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Manage roles, administrators, and monitor system activity and audit logs.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <FeatureLock 
          isLocked={isLocked} 
          title="Security is Locked" 
          description="You need higher administrative privileges to view and modify security settings."
          className="rounded-b-xl"
        >
          {/* Internal Navigation */}
          <div className="flex gap-2 border-b border-zinc-800 pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Content Area */}
          <div className="min-h-[400px]">
            {activeTab === 'roles' && <RolesManager />}
            {activeTab === 'admins' && <AdminsManager />}
            {activeTab === 'audit' && <AuditLogsList />}
          </div>
        </FeatureLock>
      </CardContent>
    </Card>
  );
}
