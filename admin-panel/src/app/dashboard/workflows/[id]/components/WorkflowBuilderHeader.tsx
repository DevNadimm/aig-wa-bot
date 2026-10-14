import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft01Icon, Delete02Icon } from "hugeicons-react";
import { WorkflowData } from "../types";

interface WorkflowBuilderHeaderProps {
  workflow: WorkflowData;
  stepsCount: number;
  isActive: boolean;
  isSaving: boolean;
  onToggleActive: (active: boolean) => void;
  onDeleteWorkflow: () => void;
  onSaveAll: () => void;
}

export function WorkflowBuilderHeader({
  workflow,
  stepsCount,
  isActive,
  isSaving,
  onToggleActive,
  onDeleteWorkflow,
  onSaveAll,
}: WorkflowBuilderHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/workflows">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-zinc-700 hover:bg-zinc-800 shrink-0"
          >
            <ArrowLeft01Icon className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            {workflow.name}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Workflow Builder &bull; {stepsCount} step{stepsCount !== 1 ? "s" : ""} &bull; Trigger: {workflow.trigger_type || "INTENT"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Switch Capsule */}
        <div className="flex items-center gap-2.5 h-9 px-3 rounded-lg border border-zinc-800 bg-[#0c0c0e]">
          <span className="text-sm font-medium text-zinc-300">Active</span>
          <Switch checked={isActive} onCheckedChange={onToggleActive} size="sm" />
        </div>

        {/* Delete Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onDeleteWorkflow}
          className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2 h-9"
        >
          <Delete02Icon className="h-4 w-4" /> Delete
        </Button>

        {/* Vertical Separator */}
        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* Cancel Button */}
        <Link href="/dashboard/workflows">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 h-9"
          >
            Cancel
          </Button>
        </Link>

        {/* Save Changes Button */}
        <Button
          type="button"
          onClick={onSaveAll}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-9 font-medium"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
