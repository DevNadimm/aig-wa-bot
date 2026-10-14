"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WorkflowData, Step } from "./types";
import {
  saveWorkflowAllChanges,
  SaveStepPayload,
  deleteWorkflow,
} from "./actions";
import { useWorkflowDrag } from "./hooks/useWorkflowDrag";
import { WorkflowBuilderHeader } from "./components/WorkflowBuilderHeader";
import { WorkflowCanvas } from "./components/WorkflowCanvas";
import { StepLibrary } from "./components/StepLibrary";
import { DragGhostPortal } from "./components/DragGhostPortal";

interface WorkflowBuilderProps {
  workflow: WorkflowData;
  initialSteps: Step[];
}

export function WorkflowBuilder({
  workflow,
  initialSteps,
}: WorkflowBuilderProps) {
  const router = useRouter();

  const [steps, setSteps] = useState<Step[]>(() =>
    [...initialSteps].sort((a, b) => a.order_index - b.order_index)
  );
  const [deletedStepIds, setDeletedStepIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(workflow.status === "ACTIVE");

  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(() => {
    if (initialSteps.length > 0) {
      return { [initialSteps[0].id]: true };
    }
    return {};
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Local editing cache for step configurations
  const [editState, setEditState] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    initialSteps.forEach((s) => {
      initial[s.id] = { name: s.name, configuration: { ...(s.configuration || {}) } };
    });
    return initial;
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleToggleActive = (checked: boolean) => {
    setIsActive(checked);
  };

  const handleDeleteWorkflow = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this workflow? All associated steps will be permanently removed."
      )
    ) {
      return;
    }
    try {
      await deleteWorkflow(workflow.id);
      toast.success("Workflow deleted");
      router.push("/dashboard/workflows");
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const handleAddStep = (type: string, atIndex?: number) => {
    const targetIndex = atIndex !== undefined ? atIndex : steps.length;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newStep: Step = {
      id: tempId,
      workflow_id: workflow.id,
      name: `New ${type.replace(/_/g, " ")} Step`,
      step_type: type,
      order_index: targetIndex,
      configuration: {},
    };

    const newSteps = [...steps];
    newSteps.splice(targetIndex, 0, newStep);
    newSteps.forEach((s, idx) => {
      s.order_index = idx;
    });
    setSteps(newSteps);

    setExpandedSteps((prev) => ({ ...prev, [tempId]: true }));
    setEditState((prev) => ({
      ...prev,
      [tempId]: { name: newStep.name, configuration: {} },
    }));
  };

  const handleMoveStep = (stepId: string, toIndex: number) => {
    const fromIndex = steps.findIndex((s) => s.id === stepId);
    if (fromIndex === -1) return;

    // Moving to its own position or right after itself does not change the list
    if (toIndex === fromIndex || toIndex === fromIndex + 1) return;

    const newSteps = [...steps];
    const [moved] = newSteps.splice(fromIndex, 1);
    const targetIdx = toIndex > fromIndex ? toIndex - 1 : toIndex;
    newSteps.splice(targetIdx, 0, moved);
    newSteps.forEach((s, idx) => {
      s.order_index = idx;
    });
    setSteps(newSteps);
  };

  const handleDeleteStep = (id: string) => {
    setConfirmDeleteId(null);
    if (!id.startsWith("temp_")) {
      setDeletedStepIds((prev) => new Set(prev).add(id));
    }
    setSteps((prev) => prev.filter((s) => s.id !== id));
    setExpandedSteps((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setEditState((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payload: SaveStepPayload[] = steps.map((s, index) => {
        const state = editState[s.id] || {
          name: s.name,
          configuration: s.configuration || {},
        };
        const config = { ...(state.configuration || {}) };

        // Normalization of dual-keys for engine compatibility
        if (config.message && !config.text) config.text = config.message;
        if (config.text && !config.message) config.message = config.text;

        if (config.question && !config.prompt) config.prompt = config.question;
        if (config.prompt && !config.question) config.question = config.prompt;

        if (config.variable && !config.variable_name) config.variable_name = config.variable;
        if (config.variable_name && !config.variable) config.variable = config.variable_name;

        if (config.field && !config.field_name) config.field_name = config.field;
        if (config.field_name && !config.field) config.field = config.field_name;

        return {
          id: s.id.startsWith("temp_") ? undefined : s.id,
          step_type: s.step_type,
          name: state.name || s.name || `Step ${index + 1}`,
          order_index: index,
          configuration: config,
        };
      });

      const updatedSteps = await saveWorkflowAllChanges(
        workflow.id,
        isActive ? "ACTIVE" : "INACTIVE",
        payload,
        Array.from(deletedStepIds)
      );

      setSteps(updatedSteps);
      setDeletedStepIds(new Set());

      // Re-populate editState with the saved steps
      const newEditState: Record<string, any> = {};
      updatedSteps.forEach((s) => {
        newEditState[s.id] = {
          name: s.name,
          configuration: { ...(s.configuration || {}) },
        };
      });
      setEditState(newEditState);

      toast.success("Workflow changes saved successfully");
    } catch (err: any) {
      toast.error(`Failed to save workflow: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpandStep = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const toggleExpandAll = () => {
    const allExpanded = steps.every((s) => expandedSteps[s.id]);
    const newState: Record<string, boolean> = {};
    steps.forEach((s) => {
      newState[s.id] = !allExpanded;
    });
    setExpandedSteps(newState);
  };

  const updateEditState = (stepId: string, field: string, value: any, isConfig = false) => {
    setEditState((prev) => {
      const current = prev[stepId] || {
        name: steps.find((s) => s.id === stepId)?.name || "",
        configuration: { ...(steps.find((s) => s.id === stepId)?.configuration || {}) },
      };
      if (isConfig) {
        return {
          ...prev,
          [stepId]: { ...current, configuration: { ...current.configuration, [field]: value } },
        };
      }
      return { ...prev, [stepId]: { ...current, [field]: value } };
    });
  };

  // -------------------------------------------------------------------------
  // Pointer-based Drag & Drop Hook
  // -------------------------------------------------------------------------

  const {
    drag,
    dropIndex,
    ghostRef,
    positionGhost,
    startPointerDrag,
  } = useWorkflowDrag({
    canvasRef,
    onAddStep: handleAddStep,
    onMoveStep: handleMoveStep,
    onBeforeDragStart: () => setConfirmDeleteId(null),
  });

  const allExpanded = steps.length > 0 && steps.every((s) => expandedSteps[s.id]);

  // While moving an existing card it is taken out of the list (the ghost
  // represents it) so the slot placeholder can show exactly where it will land.
  const visibleSteps =
    drag?.kind === "move" ? steps.filter((s) => s.id !== drag.stepId) : steps;

  // -------------------------------------------------------------------------
  // Render Main Layout (matching Tools and APIs 100%)
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Floating Drag Ghost Portal */}
      <DragGhostPortal
        drag={drag}
        ghostRef={ghostRef}
        positionGhost={positionGhost}
      />

      {/* Header bar matching Tools & APIs configure page */}
      <WorkflowBuilderHeader
        workflow={workflow}
        stepsCount={steps.length}
        isActive={isActive}
        isSaving={isSaving}
        onToggleActive={handleToggleActive}
        onDeleteWorkflow={handleDeleteWorkflow}
        onSaveAll={handleSaveAll}
      />

      {/* 2-Column Workflow Construction Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-20">
        {/* Left Column: Steps Execution Canvas (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          <WorkflowCanvas
            canvasRef={canvasRef}
            steps={steps}
            visibleSteps={visibleSteps}
            drag={drag}
            dropIndex={dropIndex}
            allExpanded={allExpanded}
            expandedSteps={expandedSteps}
            editState={editState}
            confirmDeleteId={confirmDeleteId}
            toggleExpandAll={toggleExpandAll}
            toggleExpandStep={toggleExpandStep}
            handleDeleteStep={handleDeleteStep}
            setConfirmDeleteId={setConfirmDeleteId}
            updateEditState={updateEditState}
            startPointerDrag={startPointerDrag}
          />
        </div>

        {/* Right Column: Step Library Palette (lg:col-span-4 sticky) */}
        <div className="lg:col-span-4">
          <StepLibrary
            stepsCount={steps.length}
            drag={drag}
            onAddStep={handleAddStep}
            startPointerDrag={startPointerDrag}
          />
        </div>
      </div>
    </div>
  );
}