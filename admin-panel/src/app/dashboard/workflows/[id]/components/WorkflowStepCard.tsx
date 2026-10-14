import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Delete02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";
import { Step, DragInfo, getStepDef, getStepPreview } from "../types";
import { AskQuestionForm } from "./forms/AskQuestionForm";
import { SendMessageForm } from "./forms/SendMessageForm";
import { CollectFieldForm } from "./forms/CollectFieldForm";
import { CallAiAgentForm } from "./forms/CallAiAgentForm";
import { HandoffForm } from "./forms/HandoffForm";

interface WorkflowStepCardProps {
  step: Step;
  index: number;
  isExpanded: boolean;
  currentState: { name: string; configuration: any };
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  toggleExpandStep: (id: string) => void;
  handleDeleteStep: (id: string) => void;
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

export function WorkflowStepCard({
  step,
  index,
  isExpanded,
  currentState,
  confirmDeleteId,
  setConfirmDeleteId,
  toggleExpandStep,
  handleDeleteStep,
  updateEditState,
  startPointerDrag,
}: WorkflowStepCardProps) {
  const stepDef = getStepDef(step.step_type);
  const StepIcon = stepDef.icon;

  const renderStepForm = () => {
    const updateConfig = (field: string, value: any) =>
      updateEditState(step.id, field, value, true);

    switch (step.step_type) {
      case "ASK_QUESTION":
        return (
          <AskQuestionForm
            step={step}
            currentState={currentState}
            updateConfig={updateConfig}
          />
        );
      case "SEND_MESSAGE":
        return (
          <SendMessageForm
            step={step}
            currentState={currentState}
            updateConfig={updateConfig}
          />
        );
      case "COLLECT_FIELD":
        return (
          <CollectFieldForm
            step={step}
            currentState={currentState}
            updateConfig={updateConfig}
          />
        );
      case "CALL_AI_AGENT":
        return (
          <CallAiAgentForm
            step={step}
            currentState={currentState}
            updateConfig={updateConfig}
          />
        );
      case "HANDOFF":
        return (
          <HandoffForm
            step={step}
            currentState={currentState}
            updateConfig={updateConfig}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      data-step-card
      data-step-id={step.id}
      className="rounded-xl border border-zinc-800/90 bg-[#09090b] shadow-sm transition-colors hover:border-zinc-700/80 group"
    >
      {/* Step Card Header */}
      <div
        onPointerDown={(e) =>
          startPointerDrag(
            e,
            {
              kind: "move",
              stepType: step.step_type,
              stepId: step.id,
              title: `Step ${index + 1}: ${currentState.name}`,
              badge: stepDef.label,
            },
            () => toggleExpandStep(step.id)
          )
        }
        className="flex items-center gap-3 p-3.5 cursor-grab active:cursor-grabbing select-none"
      >
        {/* Step Index Box */}
        <div className="h-7 w-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-semibold font-mono text-zinc-300 shrink-0 pointer-events-none">
          {index + 1}
        </div>

        {/* Title & Preview */}
        <div className="min-w-0 flex-1 pointer-events-none">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-100 truncate">
              {currentState.name}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium shrink-0",
                stepDef.badgeClass
              )}
            >
              <StepIcon className={cn("h-3 w-3", stepDef.iconColor)} />
              {stepDef.label}
            </span>
          </div>
          {!isExpanded && (
            <p className="text-xs text-zinc-500 truncate mt-0.5 max-w-[500px]">
              {getStepPreview(step, currentState)}
            </p>
          )}
        </div>

        {/* Quick Actions (Delete & Expand) */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            onClick={() =>
              setConfirmDeleteId(
                confirmDeleteId === step.id ? null : step.id
              )
            }
            title="Delete Step"
          >
            <Delete02Icon className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-200"
            onClick={() => toggleExpandStep(step.id)}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ArrowUp01Icon className="h-4 w-4" />
            ) : (
              <ArrowDown01Icon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Inline Delete Confirmation */}
      {confirmDeleteId === step.id && (
        <div className="px-4 py-2.5 bg-red-500/5 border-t border-red-500/10 flex items-center justify-between">
          <span className="text-xs text-red-400 font-medium">
            Are you sure you want to delete this step?
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleDeleteStep(step.id)}
            >
              Delete Step
            </Button>
          </div>
        </div>
      )}

      {/* Expanded Step Configuration Form */}
      {isExpanded && (
        <div className="border-t border-zinc-800/60 p-4 space-y-4 bg-[#0c0c0e]/60 rounded-b-xl">
          {/* Step Title Input */}
          <div className="space-y-2">
            <Label htmlFor={`${step.id}-title`} required>
              Step Title
            </Label>
            <Input
              id={`${step.id}-title`}
              value={currentState.name}
              onChange={(e) =>
                updateEditState(step.id, "name", e.target.value)
              }
              placeholder="e.g. Ask Patient Name"
              className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
            />
          </div>

          {/* Step Type Specific Inputs */}
          {renderStepForm()}
        </div>
      )}
    </div>
  );
}
