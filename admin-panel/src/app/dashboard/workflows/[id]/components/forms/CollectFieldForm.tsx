import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Step } from "../../types";

interface StepFormProps {
  step: Step;
  currentState: { name: string; configuration: any };
  updateConfig: (field: string, value: any) => void;
}

export function CollectFieldForm({ step, currentState, updateConfig }: StepFormProps) {
  const config = currentState.configuration || {};

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${step.id}-prompt`} required>
          Prompt Message
        </Label>
        <Textarea
          id={`${step.id}-prompt`}
          value={config.prompt || config.question || ""}
          onChange={(e) => {
            updateConfig("prompt", e.target.value);
            updateConfig("question", e.target.value);
          }}
          placeholder="e.g. Please provide your 10-digit mobile phone number."
          rows={3}
          className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-sans text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${step.id}-field`} required>
            Field Name (Variable)
          </Label>
          <Input
            id={`${step.id}-field`}
            value={config.field || config.field_name || ""}
            onChange={(e) => {
              updateConfig("field", e.target.value);
              updateConfig("field_name", e.target.value);
            }}
            placeholder="e.g. phone_number"
            className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 font-mono text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${step.id}-field-type`}>Validation Type</Label>
          <Select
            id={`${step.id}-field-type`}
            value={config.field_type || "STRING"}
            onChange={(e) => updateConfig("field_type", e.target.value)}
          >
            <option value="STRING">Text (String)</option>
            <option value="NUMBER">Number</option>
            <option value="DATE">Date (YYYY-MM-DD)</option>
            <option value="PHONE">Phone Number</option>
            <option value="EMAIL">Email Address</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${step.id}-retry`}>Validation Error Message</Label>
        <Input
          id={`${step.id}-retry`}
          value={config.retry_message || ""}
          onChange={(e) => updateConfig("retry_message", e.target.value)}
          placeholder="e.g. Invalid input. Please enter a valid 10-digit phone number."
          className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 h-10 text-sm placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
        />
      </div>
    </div>
  );
}
