"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft01Icon, Delete02Icon } from "hugeicons-react";
import { createIntent } from "./new/actions";
import { updateIntent, deleteIntent } from "./[id]/actions";
import { useState, useRef } from "react";

interface IntentFormProps {
  intent?: any;
  workflows?: { id: string; name: string }[];
  agents?: { id: string; name: string }[];
}

type ActionType = "none" | "workflow" | "agent";

export function IntentForm({ intent, workflows = [], agents = [] }: IntentFormProps) {
  const isEdit = !!intent;
  const action = isEdit ? updateIntent.bind(null, intent.id) : createIntent;

  const getInitialAction = (): ActionType => {
    if (intent?.workflow_id) return "workflow";
    if (intent?.agent_id) return "agent";
    return "none";
  };

  const [actionType, setActionType] = useState<ActionType>(getInitialAction());
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(intent?.workflow_id ?? "");
  const [selectedAgentId, setSelectedAgentId] = useState<string>(intent?.agent_id ?? "");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/intents">
            <Button variant="outline" size="icon" className="h-9 w-9 border-zinc-700 hover:bg-zinc-800 shrink-0">
              <ArrowLeft01Icon className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {isEdit ? "Edit Intent" : "Create New Intent"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEdit && (
            <form action={deleteIntent}>
              <input type="hidden" name="id" value={intent.id} />
              <Button type="submit" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
                <Delete02Icon className="h-4 w-4" /> Delete
              </Button>
            </form>
          )}
          {isEdit && <div className="w-px h-6 bg-zinc-800 mx-1"></div>}
          <Link href="/dashboard/intents">
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">Cancel</Button>
          </Link>
          <Button type="submit" form="intent-form" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
            {isEdit ? "Save Changes" : "Create Intent"}
          </Button>
        </div>
      </div>

      <form id="intent-form" action={action} className="space-y-6">

        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">Intent Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            name="name"
            defaultValue={intent?.name}
            placeholder="e.g. Doctor Appointment"
            required
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-zinc-300 text-sm font-medium">Slug (Unique ID) <span className="text-red-500">*</span></Label>
          <Input
            id="slug"
            name="slug"
            defaultValue={intent?.slug}
            placeholder="e.g. doctor_appointment"
            required
            pattern="^[a-z0-9_]+$"
            title="Only lowercase letters, numbers, and underscores allowed"
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 font-mono text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-zinc-300 text-sm font-medium">Router Description <span className="text-red-500">*</span></Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={intent?.description}
            placeholder="Trigger this when the user wants to book an appointment with a specific doctor or department..."
            rows={6}
            required
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 resize-none text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
          />
        </div>

        {/* ── Controlled hidden fields submitted with form ── */}
        <input type="hidden" name="workflow_id" value={actionType === "workflow" ? selectedWorkflowId : ""} />
        <input type="hidden" name="agent_id" value={actionType === "agent" ? selectedAgentId : ""} />

        {/* ── Action when matched ── */}
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-5">
          <div>
            <p className="text-zinc-200 text-sm font-semibold">Action when matched</p>
            <p className="text-zinc-500 text-xs mt-0.5">Intent detect হলে কী করবে সেটা বেছে নাও</p>
          </div>

          {/* Action type selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setActionType("none")}
              className={`flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-all ${
                actionType === "none"
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50"
              }`}
            >
              <span className="text-sm font-medium">No Action</span>
              <span className="text-xs opacity-70">শুধু intent detect করবে</span>
            </button>

            <button
              type="button"
              onClick={() => setActionType("workflow")}
              className={`flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-all ${
                actionType === "workflow"
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50"
              }`}
            >
              <span className="text-sm font-medium">Run Workflow</span>
              <span className="text-xs opacity-70">একটি workflow execute করবে</span>
            </button>

            <button
              type="button"
              onClick={() => setActionType("agent")}
              className={`flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-all ${
                actionType === "agent"
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50"
              }`}
            >
              <span className="text-sm font-medium">Route to AI Agent</span>
              <span className="text-xs opacity-70">একটি AI Agent এ route করবে</span>
            </button>
          </div>

          {/* Workflow dropdown */}
          {actionType === "workflow" && (
            <div className="space-y-2 pt-1">
              <Label className="text-zinc-300 text-sm font-medium">
                Select Workflow <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  value={selectedWorkflowId}
                  onChange={(e) => setSelectedWorkflowId(e.target.value)}
                  className="w-full appearance-none bg-[#0c0c0e] border border-zinc-800 text-zinc-100 h-10 rounded-md px-3 pr-9 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                >
                  <option value="" className="bg-[#111113] text-zinc-400">-- Workflow বেছে নাও --</option>
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id} className="bg-[#111113]">{w.name}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
              {workflows.length === 0 && (
                <p className="text-xs text-amber-500/80">⚠ কোনো workflow তৈরি নেই। আগে একটি workflow তৈরি করো।</p>
              )}
            </div>
          )}

          {/* Agent dropdown */}
          {actionType === "agent" && (
            <div className="space-y-2 pt-1">
              <Label className="text-zinc-300 text-sm font-medium">
                Select AI Agent <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full appearance-none bg-[#0c0c0e] border border-zinc-800 text-zinc-100 h-10 rounded-md px-3 pr-9 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                >
                  <option value="" className="bg-[#111113] text-zinc-400">-- AI Agent বেছে নাও --</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#111113]">{a.name}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
              {agents.length === 0 && (
                <p className="text-xs text-amber-500/80">⚠ কোনো AI Agent তৈরি নেই। আগে একটি agent তৈরি করো।</p>
              )}
            </div>
          )}
        </div>

      </form>
    </div>
  );
}
