import { DragInfo, getStepDef } from "../types";

interface StepPlaceholderProps {
  slot: number;
  drag: DragInfo;
  editState: Record<string, any>;
}

export function StepPlaceholder({ slot, drag, editState }: StepPlaceholderProps) {
  const def = getStepDef(drag.stepType);
  const Icon = def.icon;
  const isMove = drag.kind === "move";
  const name =
    isMove && drag.stepId
      ? editState[drag.stepId]?.name || def.label
      : def.label;

  return (
    <div
      key="drop-placeholder"
      className="flex items-center gap-3 rounded-xl border border-dashed border-indigo-500/40 bg-indigo-500/5 p-3.5 transition-all"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-indigo-500/30 bg-indigo-500/10 font-mono text-xs font-semibold text-indigo-400">
        {slot + 1}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={`shrink-0 rounded-md p-1 border ${def.iconBg}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-sm font-medium text-zinc-200">
          Step {slot + 1}: {name}
        </span>
        <span className="ml-auto shrink-0 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
          {isMove ? "Move here" : "Drop here"}
        </span>
      </div>
    </div>
  );
}
