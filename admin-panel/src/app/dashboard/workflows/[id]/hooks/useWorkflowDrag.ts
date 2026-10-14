import { useState, useRef, useEffect } from "react";
import {
  DragInfo,
  DRAG_THRESHOLD_PX,
  AUTOSCROLL_EDGE_PX,
  AUTOSCROLL_SPEED_PX,
} from "../types";

interface UseWorkflowDragProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onAddStep: (type: string, atIndex: number) => void;
  onMoveStep: (stepId: string, toIndex: number) => void;
  onBeforeDragStart?: () => void;
}

export function useWorkflowDrag({
  canvasRef,
  onAddStep,
  onMoveStep,
  onBeforeDragStart,
}: UseWorkflowDragProps) {
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dropIndexRef = useRef<number | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const wasDraggingRef = useRef(false);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const positionGhost = (el: HTMLDivElement | null) => {
    if (!el) return;
    const { x, y } = pointerPosRef.current;
    el.style.transform = `translate3d(${x + 14}px, ${y + 14}px, 0)`;
  };

  /** Which slot (0..n) should the placeholder occupy for a pointer at (x, y)? */
  const computeDropIndex = (x: number, y: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const marginX = 24;
    const marginTop = 24;
    const marginBottom = 80;
    const inside =
      x >= r.left - marginX &&
      x <= r.right + marginX &&
      y >= r.top - marginTop &&
      y <= r.bottom + marginBottom;
    if (!inside) return null;

    // The dragged card is not rendered while moving, and the placeholder has no
    // data-step-card attribute, so only real, visible cards are measured.
    const cards = Array.from(canvas.querySelectorAll<HTMLElement>("[data-step-card]"));
    let idx = 0;
    for (const card of cards) {
      const cr = card.getBoundingClientRect();
      if (y > cr.top + cr.height / 2) idx++;
      else break;
    }
    return idx;
  };

  const startPointerDrag = (
    e: React.PointerEvent,
    info: DragInfo,
    onClick?: () => void
  ) => {
    if (e.button !== 0) return;
    // Let buttons / inputs inside the header keep working normally.
    if ((e.target as HTMLElement).closest("button, input, textarea, select, a")) return;

    cleanupDragRef.current?.();

    const startX = e.clientX;
    const startY = e.clientY;
    pointerPosRef.current = { x: startX, y: startY };

    let started = false;
    let finished = false;
    let raf = 0;

    const refreshDrop = () => {
      const idx = computeDropIndex(pointerPosRef.current.x, pointerPosRef.current.y);
      if (idx !== dropIndexRef.current) {
        dropIndexRef.current = idx;
        setDropIndex(idx);
      }
    };

    // rAF loop: edge auto-scroll while dragging, then re-evaluate the slot.
    const tick = () => {
      if (!started || finished) return;
      const { y } = pointerPosRef.current;
      if (y < AUTOSCROLL_EDGE_PX) window.scrollBy(0, -AUTOSCROLL_SPEED_PX);
      else if (y > window.innerHeight - AUTOSCROLL_EDGE_PX)
        window.scrollBy(0, AUTOSCROLL_SPEED_PX);
      refreshDrop();
      raf = requestAnimationFrame(tick);
    };

    const onMove = (ev: PointerEvent) => {
      pointerPosRef.current = { x: ev.clientX, y: ev.clientY };

      if (!started) {
        const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (dist < DRAG_THRESHOLD_PX) return;
        started = true;
        wasDraggingRef.current = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
        onBeforeDragStart?.();
        setDrag(info);
        raf = requestAnimationFrame(tick);
      }

      positionGhost(ghostRef.current);
      refreshDrop();
    };

    const teardown = () => {
      finished = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      cleanupDragRef.current = null;
    };

    const resetDragUi = () => {
      dropIndexRef.current = null;
      setDrag(null);
      setDropIndex(null);
      // Swallow the click that some browsers fire right after pointerup.
      setTimeout(() => {
        wasDraggingRef.current = false;
      }, 0);
    };

    const onUp = () => {
      const idx = dropIndexRef.current;
      const wasDrag = started;
      teardown();

      if (!wasDrag) {
        // Plain click, not a drag.
        onClick?.();
        return;
      }

      if (idx !== null) {
        if (info.kind === "new") onAddStep(info.stepType, idx);
        else if (info.stepId) onMoveStep(info.stepId, idx);
      }
      resetDragUi();
    };

    const onCancel = () => {
      const wasDrag = started;
      teardown();
      if (wasDrag) resetDragUi();
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onCancel();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    cleanupDragRef.current = teardown;
  };

  return {
    drag,
    dropIndex,
    ghostRef,
    wasDraggingRef,
    positionGhost,
    startPointerDrag,
  };
}
