import { Button } from "@/components/ui/button";
import { GitMergeIcon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import { Step, DragInfo } from "../types";
import { WorkflowStepCard } from "./WorkflowStepCard";
import { StepPlaceholder } from "./StepPlaceholder";

interface WorkflowCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  steps: Step[];
  visibleSteps: Step[];
  drag: DragInfo | null;
  dropIndex: number | null;
  allExpanded: boolean;
  expandedSteps: Record<string, boolean>;
  editState: Record<string, any>;
  confirmDeleteId: string | null;
  toggleExpandAll: () => void;
  toggleExpandStep: (id: string) => void;
  handleDeleteStep: (id: string) => void;
  setConfirmDeleteId: (id: string | null) => void;
  updateEditState: (
    stepId: string,
    field: string,
    value: any,
    isConfig?: boolean
  ) => void;
  startPointerDrag: (
    e: React.PointerEvent,
    info: DragInfo,
    onClick?: () => void
  ) => void;
}

export function WorkflowCanvas({
  canvasRef,
  steps,
  visibleSteps,
  drag,
  dropIndex,
  allExpanded,
  expandedSteps,
  editState,
  confirmDeleteId,
  toggleExpandAll,
  toggleExpandStep,
  handleDeleteStep,
  setConfirmDeleteId,
  updateEditState,
  startPointerDrag,
}: WorkflowCanvasProps) {
  const showPlaceholderAt = drag && dropIndex !== null ? dropIndex : null;

  return (
    <div
      ref={canvasRef}
      className={cn(
        "space-y-4 rounded-xl border bg-[#0c0c0e] p-4 transition-colors",
        drag && dropIndex !== null ? "border-indigo-500/40" : "border-zinc-800"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">
            Workflow Execution Sequence
          </h3>
          <p className="text-sm text-zinc-500">
            Drag steps from the library on the right to arrange execution order ({steps.length} step{steps.length !== 1 ? "s" : ""}).
          </p>
        </div>

        {steps.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleExpandAll}
              className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              {allExpanded ? "Collapse All" : "Expand All"}
            </Button>
          </div>
        )}
      </div>

      {/* Empty Canvas Drop Target */}
      {steps.length === 0 ? (
        <div
          className={cn(
            "py-16 px-4 text-center border border-dashed rounded-xl transition-all duration-200",
            drag && dropIndex !== null
              ? "border-indigo-500/40 bg-indigo-500/5 text-indigo-300 scale-[1.01]"
              : "border-zinc-800 bg-[#09090b]/60"
          )}
        >
          <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-indigo-400 pointer-events-none">
            <GitMergeIcon className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-zinc-200 pointer-events-none">
            {drag && dropIndex !== null
              ? "Drop step here to begin!"
              : "No steps in workflow yet"}
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto pointer-events-none">
            Drag steps from the Step Library on the right and drop them here, or simply click any step in the library to add it.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleSteps.map((step, index) => {
            const isExpanded = !!expandedSteps[step.id];
            const currentState = editState[step.id] || {
              name: step.name,
              configuration: step.configuration || {},
            };

            return (
              <div key={step.id} className="space-y-3">
                {/* Dynamic Slot Placeholder when hovering above this step */}
                {showPlaceholderAt === index && drag && (
                  <StepPlaceholder
                    slot={index}
                    drag={drag}
                    editState={editState}
                  />
                )}

                {/* Step Card */}
                <WorkflowStepCard
                  step={step}
                  index={index}
                  isExpanded={isExpanded}
                  currentState={currentState}
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  toggleExpandStep={toggleExpandStep}
                  handleDeleteStep={handleDeleteStep}
                  updateEditState={updateEditState}
                  startPointerDrag={startPointerDrag}
                />
              </div>
            );
          })}

          {/* Dynamic Slot Placeholder at the very end of the sequence */}
          {showPlaceholderAt === visibleSteps.length && drag && (
            <StepPlaceholder
              slot={visibleSteps.length}
              drag={drag}
              editState={editState}
            />
          )}
        </div>
      )}
    </div>
  );
}
