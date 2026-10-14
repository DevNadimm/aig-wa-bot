import { createPortal } from "react-dom";
import { DragInfo, getStepDef } from "../types";

interface DragGhostPortalProps {
  drag: DragInfo | null;
  ghostRef: React.RefObject<HTMLDivElement | null>;
  positionGhost: (el: HTMLDivElement | null) => void;
}

export function DragGhostPortal({
  drag,
  ghostRef,
  positionGhost,
}: DragGhostPortalProps) {
  if (!drag || typeof document === "undefined") return null;

  const def = getStepDef(drag.stepType);
  const Icon = def.icon;

  return createPortal(
    <div
      ref={(el) => {
        ghostRef.current = el;
        positionGhost(el);
      }}
      className="fixed left-0 top-0 z-[9999] pointer-events-none flex items-center gap-2.5 whitespace-nowrap rounded-xl border border-zinc-700 bg-zinc-900/95 px-3.5 py-2 text-[13px] font-medium text-zinc-100 shadow-[0_20px_35px_-5px_rgba(0,0,0,0.8)] backdrop-blur-md will-change-transform"
      style={{ transform: "translate3d(-9999px,-9999px,0)" }}
    >
      <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 border ${def.iconBg}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="max-w-[260px] truncate">{drag.title}</span>
      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium font-mono ${def.badgeClass}`}>
        {drag.badge}
      </span>
    </div>,
    document.body
  );
}
