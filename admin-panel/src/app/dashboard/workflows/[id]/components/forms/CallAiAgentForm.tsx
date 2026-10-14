import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Step } from "../../types";

interface StepFormProps {
  step: Step;
  currentState: { name: string; configuration: any };
  updateConfig: (field: string, value: any) => void;
}

export function CallAiAgentForm({ step, currentState, updateConfig }: StepFormProps) {
  const config = currentState.configuration || {};

  return (
    <div className="space-y-2">
      <Label htmlFor={`${step.id}-instruction`} required>
        AI Instructions &amp; Guidance
      </Label>
      <Textarea
        id={`${step.id}-instruction`}
        value={config.instruction || config.prompt || ""}
        onChange={(e) => {
          updateConfig("instruction", e.target.value);
          updateConfig("prompt", e.target.value);
        }}
        placeholder="Instruct the AI model on how to handle this step and which tools to call..."
        rows={4}
        className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-sans text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 resize-none"
      />
    </div>
  );
}
