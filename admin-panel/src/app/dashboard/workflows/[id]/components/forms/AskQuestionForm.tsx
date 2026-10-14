import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Step } from "../../types";

interface StepFormProps {
  step: Step;
  currentState: { name: string; configuration: any };
  updateConfig: (field: string, value: any) => void;
}

export function AskQuestionForm({ step, currentState, updateConfig }: StepFormProps) {
  const config = currentState.configuration || {};

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${step.id}-question`} required>
          Question / Prompt Message
        </Label>
        <Textarea
          id={`${step.id}-question`}
          value={config.question || config.prompt || ""}
          onChange={(e) => {
            updateConfig("question", e.target.value);
            updateConfig("prompt", e.target.value);
          }}
          placeholder="e.g. Please provide the patient's full name and preferred appointment date."
          rows={3}
          className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-sans text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${step.id}-variable`}>
          Store Answer in Variable
        </Label>
        <Input
          id={`${step.id}-variable`}
          value={config.variable || config.variable_name || config.field || ""}
          onChange={(e) => {
            updateConfig("variable", e.target.value);
            updateConfig("variable_name", e.target.value);
          }}
          placeholder="e.g. patient_name"
          className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 font-mono text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
        />
        <p className="text-xs text-zinc-500">
          Subsequent steps and AI agents can reference this value using <code className="text-zinc-400 font-mono">{"{{variable_name}}"}</code>.
        </p>
      </div>
    </div>
  );
}
