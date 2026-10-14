import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Step } from "../../types";

interface StepFormProps {
  step: Step;
  currentState: { name: string; configuration: any };
  updateConfig: (field: string, value: any) => void;
}

export function HandoffForm({ step, currentState, updateConfig }: StepFormProps) {
  const config = currentState.configuration || {};

  return (
    <div className="space-y-2">
      <Label htmlFor={`${step.id}-handoff-msg`}>Handoff Message</Label>
      <Input
        id={`${step.id}-handoff-msg`}
        value={config.message || ""}
        onChange={(e) => updateConfig("message", e.target.value)}
        placeholder="e.g. Transferring you to our Patient Coordination Desk..."
        className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
      />
    </div>
  );
}
