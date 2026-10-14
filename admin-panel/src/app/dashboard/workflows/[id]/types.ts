import {
  Comment01Icon,
  HelpCircleIcon,
  BotIcon,
  UserSettings01Icon,
} from "hugeicons-react";

export interface WorkflowData {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string | null;
  status: string | null;
  timeout_seconds?: number | null;
}

export interface Step {
  id: string;
  workflow_id: string;
  name: string;
  step_type: string;
  configuration: any;
  order_index: number;
}

/** Describes what is currently being dragged (library item or existing step). */
export interface DragInfo {
  kind: "new" | "move";
  stepType: string;
  stepId?: string;
  title: string;
  badge: string;
}

export interface StepTypeDef {
  id: string;
  label: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  badgeClass: string;
  description: string;
}

export const STEP_TYPES: StepTypeDef[] = [
  {
    id: "ASK_QUESTION",
    label: "Ask Question",
    icon: HelpCircleIcon,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    badgeClass: "bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20",
    description: "Ask user a question and record their answer in a variable",
  },
  {
    id: "SEND_MESSAGE",
    label: "Send Message",
    icon: Comment01Icon,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
    description: "Send an automated informational message to the patient",
  },
  {
    id: "COLLECT_FIELD",
    label: "Collect Field",
    icon: UserSettings01Icon,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    badgeClass: "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20",
    description: "Collect specific validated data (phone, date, email)",
  },
  {
    id: "CALL_AI_AGENT",
    label: "Call AI Agent",
    icon: BotIcon,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    badgeClass: "bg-purple-500/10 text-purple-400 ring-1 ring-inset ring-purple-500/20",
    description: "Generate dynamic response using AI agent intelligence",
  },
  {
    id: "HANDOFF",
    label: "Handoff to Human",
    icon: UserSettings01Icon,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    badgeClass: "bg-rose-500/10 text-rose-400 ring-1 ring-inset ring-rose-500/20",
    description: "Transfer conversation to human coordinator desk",
  },
];

export const DRAG_THRESHOLD_PX = 5;
export const AUTOSCROLL_EDGE_PX = 80;
export const AUTOSCROLL_SPEED_PX = 14;

export const getStepDef = (type: string): StepTypeDef =>
  STEP_TYPES.find((t) => t.id === type) || {
    id: type,
    label: type,
    icon: Comment01Icon,
    iconColor: "text-zinc-400",
    iconBg: "bg-zinc-800 border-zinc-700 text-zinc-400",
    badgeClass: "bg-zinc-500/10 text-zinc-400 ring-1 ring-inset ring-zinc-500/20",
    description: "",
  };

export const getStepPreview = (step: Step, state: any): string => {
  const config = state?.configuration || step.configuration || {};
  switch (step.step_type) {
    case "SEND_MESSAGE":
      return config.message || config.text || "No message defined yet";
    case "ASK_QUESTION":
      return (
        (config.question || config.prompt || "No question defined yet") +
        (config.variable || config.variable_name
          ? ` → $${config.variable || config.variable_name}`
          : "")
      );
    case "COLLECT_FIELD":
      return (
        (config.prompt || config.question || "No prompt defined yet") +
        (config.field || config.field_name
          ? ` → [${config.field || config.field_name}]`
          : "")
      );
    case "CALL_AI_AGENT":
      return config.instruction || config.prompt || "No AI prompt specified";
    case "HANDOFF":
      return config.message || "Transfer to human agent desk";
    default:
      return "Configure step parameters...";
  }
};
