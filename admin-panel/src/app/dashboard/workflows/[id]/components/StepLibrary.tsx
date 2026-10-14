import { DragDropVerticalIcon, Copy01Icon } from "hugeicons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STEP_TYPES, DragInfo } from "../types";

interface StepLibraryProps {
  stepsCount: number;
  drag: DragInfo | null;
  onAddStep: (type: string, atIndex: number) => void;
  startPointerDrag: (
    e: React.PointerEvent,
    info: DragInfo,
    onClick?: () => void
  ) => void;
}

export function StepLibrary({
  stepsCount,
  drag,
  onAddStep,
  startPointerDrag,
}: StepLibraryProps) {
  return (
    <div className="space-y-4 lg:sticky lg:top-6 self-start">
      {/* Step Library Card */}
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">Step Library</h3>
          <p className="text-sm text-zinc-500">
            Drag steps onto the canvas to insert into your workflow, or click to add.
          </p>
        </div>

        {/* Step Types in a vertical column */}
        <div className="space-y-2.5">
          {STEP_TYPES.map((type) => {
            const Icon = type.icon;
            const isCurrentlyDragging =
              drag?.kind === "new" && drag.stepType === type.id;
            return (
              <div
                key={type.id}
                onPointerDown={(e) =>
                  startPointerDrag(
                    e,
                    {
                      kind: "new",
                      stepType: type.id,
                      title: type.label,
                      badge: "New Step",
                    },
                    () => onAddStep(type.id, stepsCount)
                  )
                }
                className={cn(
                  "p-3 rounded-xl border border-zinc-800 bg-[#09090b] hover:bg-zinc-800/40 hover:border-zinc-700 transition-all flex items-start gap-3 group cursor-grab active:cursor-grabbing select-none",
                  isCurrentlyDragging && "opacity-40 border-zinc-600"
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors pointer-events-none",
                    type.iconBg
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1 pointer-events-none">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors">
                      {type.label}
                    </span>
                    <DragDropVerticalIcon className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-500 leading-snug mt-1">
                    {type.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Variables Guide Card */}
      <div className="space-y-3 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-100 flex items-center justify-between">
            <span>Workflow Variables</span>
            <span className="text-[10px] text-zinc-500 font-normal">Click to copy</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Dynamic values collected during conversation.
          </p>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Variables store user answers or collected inputs. Click any variable to copy and paste it into messages:
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            "user_name",
            "phone_number",
            "patient_name",
            "department",
          ].map((varName) => (
            <button
              key={varName}
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`{{${varName}}}`);
                toast.success(`Copied {{${varName}}} to clipboard`);
              }}
              title="Click to copy to clipboard"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Copy01Icon className="h-2.5 w-2.5 opacity-60" />
              {`{{${varName}}}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
