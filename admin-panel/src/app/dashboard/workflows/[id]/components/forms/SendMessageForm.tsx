import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Step } from "../../types";

interface StepFormProps {
  step: Step;
  currentState: { name: string; configuration: any };
  updateConfig: (field: string, value: any) => void;
}

export function SendMessageForm({ step, currentState, updateConfig }: StepFormProps) {
  const config = currentState.configuration || {};

  return (
    <div className="space-y-2">
      <Label htmlFor={`${step.id}-message`} required>
        Message Content
      </Label>
      <Textarea
        id={`${step.id}-message`}
        value={config.message || config.text || ""}
        onChange={(e) => {
          updateConfig("message", e.target.value);
          updateConfig("text", e.target.value);
        }}
        placeholder="Type the message to send to the WhatsApp user. You can use {{variables}}..."
        rows={3}
        className="bg-[#0c0c0e] border-zinc-800 text-zinc-100 font-sans text-sm leading-relaxed placeholder:text-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 resize-none"
      />
    </div>
  );
}
